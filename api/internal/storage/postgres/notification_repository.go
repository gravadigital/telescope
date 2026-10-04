package postgres

import (
	"fmt"
	"time"

	"github.com/charmbracelet/log"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/gravadigital/telescopio-api/internal/domain/notification"
	"github.com/gravadigital/telescopio-api/internal/logger"
)

// retentionInterval is built from a constant, never from user input.
var retentionInterval = fmt.Sprintf("interval '%d days'", notification.RetentionDays)

// PostgresNotificationRepository implements NotificationRepository using GORM.
type PostgresNotificationRepository struct {
	db  *gorm.DB
	log *log.Logger
}

// NewPostgresNotificationRepository creates a new PostgreSQL notification repository.
func NewPostgresNotificationRepository(db *gorm.DB) *PostgresNotificationRepository {
	return &PostgresNotificationRepository{db: db, log: logger.Repository("notification")}
}

func parseRecipient(id string) (uuid.UUID, error) {
	u, err := uuid.Parse(id)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid id %q: %w", id, err)
	}
	return u, nil
}

// CreateBatch inserts the notifications in one batch; an empty slice is a no-op.
func (r *PostgresNotificationRepository) CreateBatch(notifications []*notification.Notification) error {
	if len(notifications) == 0 {
		return nil
	}
	if err := r.db.CreateInBatches(notifications, 100).Error; err != nil {
		return fmt.Errorf("failed to create notifications: %w", err)
	}
	return nil
}

// UpsertParticipantRegistered adds one registration to the author's unread aggregate for the
// event, or creates it (count 1) when none is unread. The partial unique index cannot be
// targeted with clause.OnConflict, hence the explicit SQL.
func (r *PostgresNotificationRepository) UpsertParticipantRegistered(recipientID, eventID string) error {
	rid, err := parseRecipient(recipientID)
	if err != nil {
		return fmt.Errorf("failed to upsert participant_registered: %w", err)
	}
	eid, err := parseRecipient(eventID)
	if err != nil {
		return fmt.Errorf("failed to upsert participant_registered: %w", err)
	}
	err = r.db.Exec(`INSERT INTO notifications (id, recipient_id, event_id, type, data)
		VALUES (?, ?, ?, 'participant_registered', '{"count": 1}')
		ON CONFLICT (recipient_id, event_id, type) WHERE read_at IS NULL AND type = 'participant_registered'
		DO UPDATE SET
			data = jsonb_set(notifications.data, '{count}', to_jsonb(COALESCE((notifications.data->>'count')::int, 0) + 1)),
			created_at = now(),
			updated_at = now()`, uuid.New(), rid, eid).Error
	if err != nil {
		return fmt.Errorf("failed to upsert participant_registered: %w", err)
	}
	return nil
}

// ListByRecipient returns the recipient's notifications of the retention window, newest first,
// with the current event name and stage. before is exclusive.
func (r *PostgresNotificationRepository) ListByRecipient(recipientID string, before *time.Time, limit int) ([]*notification.Item, error) {
	rid, err := parseRecipient(recipientID)
	if err != nil {
		return nil, fmt.Errorf("failed to list notifications: %w", err)
	}
	q := r.db.Table("notifications n").
		Select("n.*, e.name AS event_name, e.stage AS event_stage").
		Joins("JOIN events e ON e.id = n.event_id").
		Where("n.recipient_id = ?", rid).
		Where("n.created_at >= now() - " + retentionInterval)
	if before != nil {
		q = q.Where("n.created_at < ?", *before)
	}
	var items []*notification.Item
	if err := q.Order("n.created_at DESC, n.id DESC").Limit(limit).Scan(&items).Error; err != nil {
		return nil, fmt.Errorf("failed to list notifications: %w", err)
	}
	return items, nil
}

// CountUnread counts the recipient's unread notifications of the retention window.
func (r *PostgresNotificationRepository) CountUnread(recipientID string) (int64, error) {
	rid, err := parseRecipient(recipientID)
	if err != nil {
		return 0, fmt.Errorf("failed to count unread notifications: %w", err)
	}
	var n int64
	err = r.db.Table("notifications").
		Where("recipient_id = ? AND read_at IS NULL AND created_at >= now() - "+retentionInterval, rid).
		Count(&n).Error
	if err != nil {
		return 0, fmt.Errorf("failed to count unread notifications: %w", err)
	}
	return n, nil
}

// MarkRead is idempotent: it keeps the first read_at. A missing, foreign or expired
// notification yields notification.ErrNotFound.
func (r *PostgresNotificationRepository) MarkRead(id, recipientID string) (*notification.Notification, error) {
	nid, err := parseRecipient(id)
	if err != nil {
		return nil, notification.ErrNotFound
	}
	rid, err := parseRecipient(recipientID)
	if err != nil {
		return nil, fmt.Errorf("failed to mark notification as read: %w", err)
	}
	var row struct {
		ID     uuid.UUID
		ReadAt *time.Time
	}
	err = r.db.Raw(`UPDATE notifications SET read_at = COALESCE(read_at, now()), updated_at = now()
		WHERE id = ? AND recipient_id = ? AND created_at >= now() - `+retentionInterval+`
		RETURNING id, read_at`, nid, rid).Scan(&row).Error
	if err != nil {
		return nil, fmt.Errorf("failed to mark notification as read: %w", err)
	}
	if row.ID == uuid.Nil {
		return nil, notification.ErrNotFound
	}
	return &notification.Notification{ID: row.ID, RecipientID: rid, ReadAt: row.ReadAt}, nil
}

// MarkAllRead marks the recipient's unread notifications of the retention window as read.
func (r *PostgresNotificationRepository) MarkAllRead(recipientID string) (int64, error) {
	rid, err := parseRecipient(recipientID)
	if err != nil {
		return 0, fmt.Errorf("failed to mark notifications as read: %w", err)
	}
	res := r.db.Exec(`UPDATE notifications SET read_at = now(), updated_at = now()
		WHERE recipient_id = ? AND read_at IS NULL AND created_at >= now() - `+retentionInterval, rid)
	if res.Error != nil {
		return 0, fmt.Errorf("failed to mark notifications as read: %w", res.Error)
	}
	return res.RowsAffected, nil
}

// DeleteExpired removes the recipient's notifications older than the retention window.
func (r *PostgresNotificationRepository) DeleteExpired(recipientID string) (int64, error) {
	rid, err := parseRecipient(recipientID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete expired notifications: %w", err)
	}
	res := r.db.Exec(`DELETE FROM notifications WHERE recipient_id = ? AND created_at < now() - `+retentionInterval, rid)
	if res.Error != nil {
		return 0, fmt.Errorf("failed to delete expired notifications: %w", res.Error)
	}
	return res.RowsAffected, nil
}

var _ NotificationRepository = (*PostgresNotificationRepository)(nil)
