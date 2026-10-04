//go:build integration
// +build integration

package postgres

import (
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/domain/notification"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func insertNotification(t *testing.T, tx *gorm.DB, recipient, event uuid.UUID, typ string, ageHours int, read bool) uuid.UUID {
	t.Helper()
	id := uuid.New()
	readAt := "NULL"
	if read {
		readAt = "now()"
	}
	require.NoError(t, tx.Exec(fmt.Sprintf(
		`INSERT INTO notifications (id, recipient_id, event_id, type, data, read_at, created_at)
		 VALUES (?, ?, ?, ?, '{}', %s, now() - make_interval(hours => ?))`, readAt),
		id, recipient, event, typ, ageHours).Error)
	return id
}

func notifFixture(t *testing.T, tx *gorm.DB) (user uuid.UUID, other uuid.UUID, ev uuid.UUID) {
	t.Helper()
	f := seedVoting(t, tx, 1)
	return f.reviewer, insertUser(t, tx), f.eventID
}

func TestNotificationRepo_BatchAndListWithCurrentEvent(t *testing.T) { // TS-42
	tx := migratedTx(t)
	u, _, ev := notifFixture(t, tx)
	repo := NewPostgresNotificationRepository(tx)

	require.NoError(t, repo.CreateBatch([]*notification.Notification{
		{RecipientID: u, EventID: ev, Type: notification.TypeEventPaused, Data: notification.Data{"a": "b"}},
		{RecipientID: u, EventID: ev, Type: notification.TypeEventCancelled},
	}))
	require.NoError(t, repo.CreateBatch(nil))
	require.NoError(t, tx.Exec(`UPDATE events SET name = 'Nombre nuevo' WHERE id = ?`, ev).Error)

	items, err := repo.ListByRecipient(u.String(), nil, 11)
	require.NoError(t, err)
	require.Len(t, items, 2)
	for _, it := range items {
		assert.Equal(t, "Nombre nuevo", it.EventName)
		assert.Equal(t, "voting", it.EventStage)
	}
	found := false
	for _, it := range items {
		if it.Type == notification.TypeEventPaused {
			assert.Equal(t, "b", it.Data["a"])
			found = true
		}
	}
	assert.True(t, found)
}

func TestNotificationRepo_ParticipantRegisteredAggregation(t *testing.T) { // TS-43, 44, 45
	tx := migratedTx(t)
	author, _, ev := notifFixture(t, tx)
	ev2 := seedVoting(t, tx, 1).eventID
	repo := NewPostgresNotificationRepository(tx)

	for i := 0; i < 3; i++ {
		require.NoError(t, repo.UpsertParticipantRegistered(author.String(), ev.String()))
	}
	var count string
	var rows int64
	require.NoError(t, tx.Raw(`SELECT count(*) FROM notifications WHERE recipient_id = ? AND event_id = ?`, author, ev).Scan(&rows).Error)
	assert.EqualValues(t, 1, rows)
	require.NoError(t, tx.Raw(`SELECT data->>'count' FROM notifications WHERE recipient_id = ? AND event_id = ?`, author, ev).Scan(&count).Error)
	assert.Equal(t, "3", count)

	// after reading, the next registration creates a new row
	var id string
	require.NoError(t, tx.Raw(`SELECT id::text FROM notifications WHERE recipient_id = ? AND event_id = ?`, author, ev).Scan(&id).Error)
	_, err := repo.MarkRead(id, author.String())
	require.NoError(t, err)
	require.NoError(t, repo.UpsertParticipantRegistered(author.String(), ev.String()))
	require.NoError(t, tx.Raw(`SELECT count(*) FROM notifications WHERE recipient_id = ? AND event_id = ?`, author, ev).Scan(&rows).Error)
	assert.EqualValues(t, 2, rows)
	require.NoError(t, tx.Raw(`SELECT data->>'count' FROM notifications WHERE recipient_id = ? AND event_id = ? AND read_at IS NULL`, author, ev).Scan(&count).Error)
	assert.Equal(t, "1", count)

	// another event aggregates apart
	require.NoError(t, repo.UpsertParticipantRegistered(author.String(), ev2.String()))
	require.NoError(t, tx.Raw(`SELECT count(*) FROM notifications WHERE recipient_id = ? AND event_id = ?`, author, ev2).Scan(&rows).Error)
	assert.EqualValues(t, 1, rows)
}

func TestNotificationRepo_Cursor(t *testing.T) { // TS-46
	tx := migratedTx(t)
	u, _, ev := notifFixture(t, tx)
	repo := NewPostgresNotificationRepository(tx)
	for i := 0; i < 25; i++ {
		insertNotification(t, tx, u, ev, "event_paused", i+1, false)
	}

	first, err := repo.ListByRecipient(u.String(), nil, 21)
	require.NoError(t, err)
	require.Len(t, first, 21)
	cursor := first[19].CreatedAt

	second, err := repo.ListByRecipient(u.String(), &cursor, 21)
	require.NoError(t, err)
	assert.Len(t, second, 5)
	for _, it := range second {
		assert.True(t, it.CreatedAt.Before(cursor))
	}
}

func TestNotificationRepo_CountAndRetention(t *testing.T) { // TS-47, 48
	tx := migratedTx(t)
	u, v, ev := notifFixture(t, tx)
	repo := NewPostgresNotificationRepository(tx)
	insertNotification(t, tx, u, ev, "event_paused", 1, false)
	insertNotification(t, tx, u, ev, "event_paused", 2, false)
	insertNotification(t, tx, u, ev, "event_paused", 3, true)
	insertNotification(t, tx, u, ev, "event_paused", 91*24, false)
	insertNotification(t, tx, v, ev, "event_paused", 91*24, false)

	n, err := repo.CountUnread(u.String())
	require.NoError(t, err)
	assert.EqualValues(t, 2, n)
	items, err := repo.ListByRecipient(u.String(), nil, 21)
	require.NoError(t, err)
	assert.Len(t, items, 3)

	deleted, err := repo.DeleteExpired(u.String())
	require.NoError(t, err)
	assert.EqualValues(t, 1, deleted)
	var left int64
	require.NoError(t, tx.Raw(`SELECT count(*) FROM notifications WHERE recipient_id = ?`, v).Scan(&left).Error)
	assert.EqualValues(t, 1, left)
}

func TestNotificationRepo_MarkRead(t *testing.T) { // TS-49
	tx := migratedTx(t)
	u, v, ev := notifFixture(t, tx)
	repo := NewPostgresNotificationRepository(tx)
	id := insertNotification(t, tx, u, ev, "event_paused", 1, false)
	old := insertNotification(t, tx, u, ev, "event_paused", 91*24, false)

	a, err := repo.MarkRead(id.String(), u.String())
	require.NoError(t, err)
	b, err := repo.MarkRead(id.String(), u.String())
	require.NoError(t, err)
	require.NotNil(t, a.ReadAt)
	assert.True(t, a.ReadAt.Equal(*b.ReadAt))

	_, err = repo.MarkRead(id.String(), v.String())
	assert.ErrorIs(t, err, notification.ErrNotFound)
	_, err = repo.MarkRead(uuid.NewString(), u.String())
	assert.ErrorIs(t, err, notification.ErrNotFound)
	_, err = repo.MarkRead(old.String(), u.String())
	assert.ErrorIs(t, err, notification.ErrNotFound)
	var unread int64
	require.NoError(t, tx.Raw(`SELECT count(*) FROM notifications WHERE id = ? AND read_at IS NULL`, old).Scan(&unread).Error)
	assert.EqualValues(t, 1, unread)
}

func TestNotificationRepo_MarkAllAndIsolation(t *testing.T) { // TS-50, 51
	tx := migratedTx(t)
	u, v, ev := notifFixture(t, tx)
	repo := NewPostgresNotificationRepository(tx)
	insertNotification(t, tx, u, ev, "event_paused", 1, false)
	insertNotification(t, tx, u, ev, "event_paused", 2, false)
	insertNotification(t, tx, u, ev, "event_paused", 3, true)
	oldID := insertNotification(t, tx, u, ev, "event_paused", 91*24, false)
	insertNotification(t, tx, v, ev, "event_paused", 1, false)

	items, err := repo.ListByRecipient(u.String(), nil, 21)
	require.NoError(t, err)
	for _, it := range items {
		assert.Equal(t, u, it.RecipientID)
	}

	updated, err := repo.MarkAllRead(u.String())
	require.NoError(t, err)
	assert.EqualValues(t, 2, updated)
	n, err := repo.CountUnread(u.String())
	require.NoError(t, err)
	assert.Zero(t, n)
	var unread int64
	require.NoError(t, tx.Raw(`SELECT count(*) FROM notifications WHERE id = ? AND read_at IS NULL`, oldID).Scan(&unread).Error)
	assert.EqualValues(t, 1, unread)
	n, err = repo.CountUnread(v.String())
	require.NoError(t, err)
	assert.EqualValues(t, 1, n)
}

func TestNotificationRepo_Cascade(t *testing.T) { // TS-52
	tx := migratedTx(t)
	u := insertUser(t, tx)
	ev := uuid.New()
	require.NoError(t, tx.Exec(
		`INSERT INTO events (id, name, description, author_id, start_date, end_date, stage, shareable_link)
		 VALUES (?, 'Test event', 'Test', ?, NOW(), NOW() + INTERVAL '7 days', 'voting', ?)`,
		ev, u, ev.String()).Error)
	insertNotification(t, tx, u, ev, "event_paused", 1, false)
	require.NoError(t, tx.Exec(`DELETE FROM events WHERE id = ?`, ev).Error)
	var n int64
	require.NoError(t, tx.Raw(`SELECT count(*) FROM notifications WHERE event_id = ?`, ev).Scan(&n).Error)
	assert.Zero(t, n)
}
