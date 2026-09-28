//go:build integration
// +build integration

package postgres

import (
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/config"
	"github.com/gravadigital/telescopio-api/internal/domain/vote"
	"github.com/lib/pq"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// The validate_assignment_constraints and validate_vote_constraints triggers run on
// every insert, so these tests go through the repository against a real database.
// Each test works inside a transaction that is rolled back at the end.

type votingFixture struct {
	eventID     uuid.UUID
	reviewer    uuid.UUID
	author      uuid.UUID
	attachments []uuid.UUID // all uploaded by author
	own         uuid.UUID   // uploaded by reviewer
}

func migratedTx(t *testing.T) *gorm.DB {
	t.Helper()

	cfg := config.Load()
	if testDB := os.Getenv("TEST_DB_NAME"); testDB != "" {
		cfg.DB.Name = testDB
	}

	db, err := Connect(cfg)
	require.NoError(t, err)
	require.NoError(t, AutoMigrate(db))

	tx := db.Begin()
	t.Cleanup(func() {
		tx.Rollback()
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}
	})
	return tx
}

func seedVoting(t *testing.T, tx *gorm.DB, attachmentsPerEvaluator int) votingFixture {
	t.Helper()

	f := votingFixture{eventID: uuid.New(), reviewer: uuid.New(), author: uuid.New()}

	for _, id := range []uuid.UUID{f.reviewer, f.author} {
		require.NoError(t, tx.Exec(
			`INSERT INTO users (id, name, email) VALUES (?, 'Test', ?)`,
			id, id.String()+"@example.com").Error)
	}

	require.NoError(t, tx.Exec(
		`INSERT INTO events (id, name, description, author_id, start_date, end_date, stage, shareable_link)
		 VALUES (?, 'Test event', 'Test', ?, NOW(), NOW() + INTERVAL '7 days', 'voting', ?)`,
		f.eventID, f.author, f.eventID.String()).Error)

	insertAttachment := func(owner uuid.UUID) uuid.UUID {
		id := uuid.New()
		require.NoError(t, tx.Exec(
			`INSERT INTO attachments (id, event_id, participant_id, filename, original_name, file_path, file_size, mime_type)
			 VALUES (?, ?, ?, 'file.pdf', 'file.pdf', 'events/file.pdf', 100, 'application/pdf')`,
			id, f.eventID, owner).Error)
		return id
	}

	for i := 0; i < attachmentsPerEvaluator; i++ {
		f.attachments = append(f.attachments, insertAttachment(f.author))
	}
	f.own = insertAttachment(f.reviewer)

	require.NoError(t, tx.Exec(
		`INSERT INTO voting_configurations (event_id, attachments_per_evaluator) VALUES (?, ?)`,
		f.eventID, attachmentsPerEvaluator).Error)

	return f
}

func toStringArray(ids []uuid.UUID) pq.StringArray {
	out := make(pq.StringArray, len(ids))
	for i, id := range ids {
		out[i] = id.String()
	}
	return out
}

func newAssignment(f votingFixture, attachments []uuid.UUID) *vote.Assignment {
	return &vote.Assignment{
		ID:            uuid.New(),
		EventID:       f.eventID,
		ParticipantID: f.reviewer,
		AttachmentIDs: toStringArray(attachments),
	}
}

func TestCreateAssignment_SavesValidAssignment(t *testing.T) {
	tx := migratedTx(t)
	f := seedVoting(t, tx, 2)
	repo := NewPostgresVoteRepository(tx)

	require.NoError(t, repo.CreateAssignment(newAssignment(f, f.attachments)))
}

func TestCreateAssignment_RejectsOwnAttachment(t *testing.T) {
	tx := migratedTx(t)
	f := seedVoting(t, tx, 2)
	repo := NewPostgresVoteRepository(tx)

	err := repo.CreateAssignment(newAssignment(f, []uuid.UUID{f.attachments[0], f.own}))
	require.ErrorContains(t, err, "conflict of interest")
}

func TestCreateAssignment_RejectsAttachmentFromAnotherEvent(t *testing.T) {
	tx := migratedTx(t)
	f := seedVoting(t, tx, 2)
	repo := NewPostgresVoteRepository(tx)

	err := repo.CreateAssignment(newAssignment(f, []uuid.UUID{f.attachments[0], uuid.New()}))
	require.ErrorContains(t, err, "invalid or do not belong to this event")
}

func TestCreateVote_SavesVoteForAssignedAttachment(t *testing.T) {
	tx := migratedTx(t)
	f := seedVoting(t, tx, 2)
	repo := NewPostgresVoteRepository(tx)

	assignment := newAssignment(f, f.attachments)
	require.NoError(t, repo.CreateAssignment(assignment))

	require.NoError(t, repo.Create(&vote.Vote{
		EventID:      f.eventID,
		AssignmentID: assignment.ID,
		VoterID:      f.reviewer,
		AttachmentID: f.attachments[0],
		RankPosition: 1,
	}))
}

func TestCreateVote_RejectsUnassignedAttachment(t *testing.T) {
	tx := migratedTx(t)
	f := seedVoting(t, tx, 2)
	repo := NewPostgresVoteRepository(tx)

	assignment := newAssignment(f, f.attachments)
	require.NoError(t, repo.CreateAssignment(assignment))

	err := repo.Create(&vote.Vote{
		EventID:      f.eventID,
		AssignmentID: assignment.ID,
		VoterID:      f.reviewer,
		AttachmentID: f.own,
		RankPosition: 1,
	})
	require.ErrorContains(t, err, "is not assigned to voter")
}
