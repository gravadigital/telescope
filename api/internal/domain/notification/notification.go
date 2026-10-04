// Package notification holds the in-app notification entity and the best-effort emission service.
package notification

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RetentionDays is how long a notification stays visible (ADR-009).
const RetentionDays = 90

// ErrNotFound is returned when a notification does not exist, is not the recipient's or is expired.
var ErrNotFound = errors.New("notification not found")

// Type is the notification_type enum of PostgreSQL.
type Type string

const (
	TypeStageChanged          Type = "stage_changed"
	TypeEventCancelled        Type = "event_cancelled"
	TypeEventPaused           Type = "event_paused"
	TypeDeadlineChanged       Type = "deadline_changed"
	TypeParticipantRegistered Type = "participant_registered"
	TypeRegistrationConfirmed Type = "registration_confirmed"
	TypeRankingSubmitted      Type = "ranking_submitted"
	TypeFileReminder          Type = "file_reminder"
	TypeVoteReminder          Type = "vote_reminder"
)

// Scan implements sql.Scanner.
func (t *Type) Scan(value interface{}) error {
	switch v := value.(type) {
	case string:
		*t = Type(v)
	case []byte:
		*t = Type(v)
	default:
		return fmt.Errorf("failed to scan notification Type: unsupported type %T", value)
	}
	return nil
}

// Value implements driver.Valuer.
func (t Type) Value() (driver.Value, error) {
	return string(t), nil
}

// Data is the JSONB payload of a notification: only the values the text needs.
type Data map[string]any

// Value implements driver.Valuer; nil is stored as an empty object.
func (d Data) Value() (driver.Value, error) {
	if d == nil {
		return "{}", nil
	}
	b, err := json.Marshal(d)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal notification Data: %w", err)
	}
	return string(b), nil
}

// Scan implements sql.Scanner.
func (d *Data) Scan(value interface{}) error {
	if value == nil {
		*d = Data{}
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("failed to scan notification Data: unsupported type %T", value)
	}
	*d = Data{}
	return json.Unmarshal(bytes, d)
}

// Notification is a persisted in-app notice (type + data, never text).
type Notification struct {
	ID          uuid.UUID  `json:"id"           gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	RecipientID uuid.UUID  `json:"recipient_id" gorm:"type:uuid;not null"`
	EventID     uuid.UUID  `json:"event_id"     gorm:"type:uuid;not null"`
	Type        Type       `json:"type"         gorm:"type:notification_type;not null"`
	Data        Data       `json:"data"         gorm:"type:jsonb;not null;default:'{}'"`
	ReadAt      *time.Time `json:"read_at"`
	CreatedAt   time.Time  `json:"created_at"   gorm:"autoCreateTime"`
	UpdatedAt   time.Time  `json:"updated_at"   gorm:"autoUpdateTime"`
}

// TableName returns the table name.
func (Notification) TableName() string {
	return "notifications"
}

// BeforeCreate assigns a UUID when none was set.
func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}

// Item is a listing row: the notification plus the current event name and stage.
type Item struct {
	Notification
	EventName  string `gorm:"column:event_name"`
	EventStage string `gorm:"column:event_stage"`
}
