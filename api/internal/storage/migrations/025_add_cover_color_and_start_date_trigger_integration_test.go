//go:build integration
// +build integration

package migrations

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

const startDateTrigger = "enforce_future_start_date"

// insertEvent inserts an event whose start_date is NOW() plus the given interval ("-10 days",
// "1 day"). Events that started more than a day ago exist in real databases from before the
// start-date rule, so the trigger is switched off just for the insert.
func insertEvent(t *testing.T, tx *gorm.DB, startOffset string) uuid.UUID {
	t.Helper()

	author, eventID := uuid.New(), uuid.New()
	require.NoError(t, tx.Exec(`INSERT INTO users (id, name, email) VALUES (?, 'Author', ?)`,
		author, author.String()+"@example.com").Error)

	require.NoError(t, tx.Exec(`ALTER TABLE events DISABLE TRIGGER `+startDateTrigger).Error)
	require.NoError(t, tx.Exec(
		`INSERT INTO events (id, name, description, author_id, start_date, end_date, stage, shareable_link)
		 VALUES (?, ?, 'Descripción', ?, NOW() + ?::interval, NOW() + INTERVAL '30 days', 'participation', ?)`,
		eventID, "Evento "+eventID.String(), author, startOffset, eventID.String()).Error)
	require.NoError(t, tx.Exec(`ALTER TABLE events ENABLE TRIGGER `+startDateTrigger).Error)

	return eventID
}

func columnExists(t *testing.T, tx *gorm.DB, table, column string) bool {
	t.Helper()
	var n int64
	require.NoError(t, tx.Raw(`SELECT count(*) FROM information_schema.columns
		WHERE table_name = ? AND column_name = ?`, table, column).Scan(&n).Error)
	return n > 0
}

func triggerExists(t *testing.T, tx *gorm.DB, name string) bool {
	t.Helper()
	var n int64
	require.NoError(t, tx.Raw(`SELECT count(*) FROM pg_trigger WHERE tgname = ? AND NOT tgisinternal`, name).Scan(&n).Error)
	return n > 0
}

func constraintExists(t *testing.T, tx *gorm.DB, name string) bool {
	t.Helper()
	var n int64
	require.NoError(t, tx.Raw(`SELECT count(*) FROM pg_constraint WHERE conname = ? AND conrelid = 'events'::regclass`, name).Scan(&n).Error)
	return n > 0
}

// TS-16
func TestMigration025_ExistingEventsGetTheDefaultColor(t *testing.T) {
	tx := migratedTx(t)
	require.NoError(t, migration025Down(tx))

	author, eventID := uuid.New(), uuid.New()
	require.NoError(t, tx.Exec(`INSERT INTO users (id, name, email) VALUES (?, 'Author', ?)`,
		author, author.String()+"@example.com").Error)
	require.NoError(t, tx.Exec(
		`INSERT INTO events (id, name, description, author_id, start_date, end_date, stage, shareable_link)
		 VALUES (?, 'Evento previo', 'Descripción', ?, NOW() + INTERVAL '1 day', NOW() + INTERVAL '30 days', 'creation', ?)`,
		eventID, author, eventID.String()).Error)

	require.NoError(t, migration025Up(tx))

	var color string
	require.NoError(t, tx.Raw(`SELECT cover_color FROM events WHERE id = ?`, eventID).Scan(&color).Error)
	assert.Equal(t, "lavender", color)
}

// TS-18
func TestMigration025_RejectsCreatingAnEventWithAPastStartDate(t *testing.T) {
	tx := migratedTx(t)
	author, eventID := uuid.New(), uuid.New()
	require.NoError(t, tx.Exec(`INSERT INTO users (id, name, email) VALUES (?, 'Author', ?)`,
		author, author.String()+"@example.com").Error)

	// A failed statement aborts the surrounding transaction, so this is the last query.
	err := tx.Exec(
		`INSERT INTO events (id, name, description, author_id, start_date, end_date, stage, shareable_link)
		 VALUES (?, 'Evento pasado', 'Descripción', ?, NOW() - INTERVAL '3 days', NOW() + INTERVAL '30 days', 'creation', ?)`,
		eventID, author, eventID.String()).Error

	require.Error(t, err)
	assert.Contains(t, err.Error(), "start_date cannot be in the past")
}

// TS-19 (a)
func TestMigration025_RejectsMovingStartDateIntoThePast(t *testing.T) {
	tx := migratedTx(t)
	eventID := insertEvent(t, tx, "1 day")

	err := tx.Exec(`UPDATE events SET start_date = NOW() - INTERVAL '3 days' WHERE id = ?`, eventID).Error

	require.Error(t, err)
	assert.Contains(t, err.Error(), "start_date cannot be in the past")
}

// TS-19 (b)
func TestMigration025_AllowsUpdatesThatKeepAnOldStartDate(t *testing.T) {
	tx := migratedTx(t)
	eventID := insertEvent(t, tx, "-10 days")

	// start_date is in the SET list, so the trigger fires, but the value does not change:
	// this is what a GORM Save does on every update.
	require.NoError(t, tx.Exec(`UPDATE events SET name = 'Renombrado', start_date = start_date WHERE id = ?`, eventID).Error)
	require.NoError(t, tx.Exec(`UPDATE events SET is_paused = true WHERE id = ?`, eventID).Error)

	var name string
	require.NoError(t, tx.Raw(`SELECT name FROM events WHERE id = ?`, eventID).Scan(&name).Error)
	assert.Equal(t, "Renombrado", name)
}

// TS-20
func TestMigration025_CoverColorCheckRejectsColorsOutsideThePalette(t *testing.T) {
	tx := migratedTx(t)
	eventID := insertEvent(t, tx, "1 day")

	require.NoError(t, tx.Exec(`UPDATE events SET cover_color = 'mist' WHERE id = ?`, eventID).Error)

	err := tx.Exec(`UPDATE events SET cover_color = 'red' WHERE id = ?`, eventID).Error
	require.Error(t, err)
	assert.Contains(t, err.Error(), "valid_cover_color")
}

// TS-21
func TestMigration025_DownThenUp(t *testing.T) {
	tx := migratedTx(t)

	require.NoError(t, migration025Down(tx))
	assert.False(t, columnExists(t, tx, "events", "cover_color"))
	assert.False(t, triggerExists(t, tx, startDateTrigger))
	assert.True(t, constraintExists(t, tx, "future_start_date"))

	require.NoError(t, migration025Up(tx))
	assert.True(t, columnExists(t, tx, "events", "cover_color"))
	assert.True(t, triggerExists(t, tx, startDateTrigger))
	assert.False(t, constraintExists(t, tx, "future_start_date"))
	assert.True(t, constraintExists(t, tx, "valid_cover_color"))
}
