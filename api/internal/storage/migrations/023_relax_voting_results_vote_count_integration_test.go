//go:build integration
// +build integration

package migrations

import (
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/config"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func migratedTx(t *testing.T) *gorm.DB {
	t.Helper()

	cfg := config.Load()
	if testDB := os.Getenv("TEST_DB_NAME"); testDB != "" {
		cfg.DB.Name = testDB
	}
	db, err := gorm.Open(postgres.Open(cfg.GetDatabaseURL()), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, RunMigrations(db))

	tx := db.Begin()
	t.Cleanup(func() {
		tx.Rollback()
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}
	})
	return tx
}

func insertResult(tx *gorm.DB, totalParticipants, totalVotes int) error {
	eventID, author := uuid.New(), uuid.New()
	if err := tx.Exec(`INSERT INTO users (id, name, email) VALUES (?, 'Author', ?)`, author, author.String()+"@example.com").Error; err != nil {
		return err
	}
	if err := tx.Exec(
		`INSERT INTO events (id, name, description, author_id, start_date, end_date, stage, shareable_link)
		 VALUES (?, 'Test event', 'Test', ?, NOW(), NOW() + INTERVAL '7 days', 'results', ?)`,
		eventID, author, eventID.String()).Error; err != nil {
		return err
	}
	return tx.Exec(
		`INSERT INTO voting_results (event_id, global_ranking, participant_qualities, adjusted_ranking, total_participants, total_votes, attachments_per_evaluator)
		 VALUES (?, '[]', '{}', '[]', ?, ?, 2)`,
		eventID, totalParticipants, totalVotes).Error
}

func TestMigration023_AllowsFewerVotesThanParticipants(t *testing.T) {
	tx := migratedTx(t)

	require.NoError(t, tx.Transaction(func(sp *gorm.DB) error { return insertResult(sp, 4, 2) }))
	require.Error(t, tx.Transaction(func(sp *gorm.DB) error { return insertResult(sp, 0, 2) }))
}

func TestMigration023_DownRestoresVoteCountCheck(t *testing.T) {
	tx := migratedTx(t)

	require.NoError(t, migration023Down(tx))
	err := tx.Transaction(func(sp *gorm.DB) error { return insertResult(sp, 4, 2) })
	require.ErrorContains(t, err, "valid_participant_counts")
}
