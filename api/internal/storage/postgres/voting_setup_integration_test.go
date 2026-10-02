//go:build integration
// +build integration

package postgres

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/domain/vote"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type participationFixture struct {
	eventID      uuid.UUID
	participants []uuid.UUID
	attachments  []uuid.UUID // attachments[i] belongs to participants[i]
}

// seedParticipation creates an event in participation, without configuration,
// where each of the three participants owns one proposal.
func seedParticipation(t *testing.T, tx *gorm.DB) participationFixture {
	t.Helper()

	f := participationFixture{eventID: uuid.New()}
	author := uuid.New()
	require.NoError(t, tx.Exec(
		`INSERT INTO users (id, name, email) VALUES (?, 'Author', ?)`,
		author, author.String()+"@example.com").Error)
	require.NoError(t, tx.Exec(
		`INSERT INTO events (id, name, description, author_id, start_date, end_date, stage, shareable_link)
		 VALUES (?, 'Test event', 'Test', ?, NOW(), NOW() + INTERVAL '7 days', 'participation', ?)`,
		f.eventID, author, f.eventID.String()).Error)

	for i := 0; i < 3; i++ {
		p, a := uuid.New(), uuid.New()
		require.NoError(t, tx.Exec(
			`INSERT INTO users (id, name, email) VALUES (?, 'Participant', ?)`,
			p, p.String()+"@example.com").Error)
		require.NoError(t, tx.Exec(
			`INSERT INTO attachments (id, event_id, participant_id, filename, original_name, file_path, file_size, mime_type)
			 VALUES (?, ?, ?, 'file.pdf', 'file.pdf', 'events/file.pdf', 100, 'application/pdf')`,
			a, f.eventID, p).Error)
		f.participants = append(f.participants, p)
		f.attachments = append(f.attachments, a)
	}
	return f
}

// validAssignments gives each participant the proposals of the other two.
func (f participationFixture) validAssignments() []*vote.Assignment {
	out := make([]*vote.Assignment, len(f.participants))
	for i, p := range f.participants {
		var others []uuid.UUID
		for j, a := range f.attachments {
			if j != i {
				others = append(others, a)
			}
		}
		out[i] = vote.NewAssignment(f.eventID, p, others)
	}
	return out
}

func (f participationFixture) config(minEvaluations int) *vote.VotingConfiguration {
	return &vote.VotingConfiguration{
		ID:                      uuid.New(),
		EventID:                 f.eventID,
		AttachmentsPerEvaluator: 2,
		QualityGoodThreshold:    0.6,
		QualityBadThreshold:     0.3,
		AdjustmentMagnitude:     3,
		MinEvaluationsPerFile:   minEvaluations,
	}
}

func count(t *testing.T, tx *gorm.DB, query string, args ...any) int {
	t.Helper()
	var n int
	require.NoError(t, tx.Raw(query, args...).Scan(&n).Error)
	return n
}

func TestOpenVoting_RollsBackEverythingWhenAnAssignmentIsInvalid(t *testing.T) {
	tx := migratedTx(t)
	f := seedParticipation(t, tx)
	repo := NewPostgresVotingSetupRepository(tx)
	date := time.Date(2026, 10, 20, 0, 0, 0, 0, time.UTC)

	assignments := f.validAssignments()
	// P1 receives their own proposal: the trigger rejects it.
	assignments[0] = vote.NewAssignment(f.eventID, f.participants[0], []uuid.UUID{f.attachments[0], f.attachments[1]})

	err := repo.OpenVoting(f.eventID.String(), &date, f.config(2), assignments)
	require.Error(t, err)

	var stage string
	require.NoError(t, tx.Raw(`SELECT stage FROM events WHERE id = ?`, f.eventID).Scan(&stage).Error)
	assert.Equal(t, "participation", stage)
	assert.Equal(t, 0, count(t, tx, `SELECT COUNT(*) FROM events WHERE id = ? AND voting_estimated_end_date IS NOT NULL`, f.eventID))
	assert.Equal(t, 0, count(t, tx, `SELECT COUNT(*) FROM voting_configurations WHERE event_id = ?`, f.eventID))
	assert.Equal(t, 0, count(t, tx, `SELECT COUNT(*) FROM assignments WHERE event_id = ?`, f.eventID))
}

func TestOpenVoting_CommitsStageConfigurationAndAssignments(t *testing.T) {
	tx := migratedTx(t)
	f := seedParticipation(t, tx)
	repo := NewPostgresVotingSetupRepository(tx)
	date := time.Date(2026, 10, 20, 0, 0, 0, 0, time.UTC)

	require.NoError(t, repo.OpenVoting(f.eventID.String(), &date, f.config(2), f.validAssignments()))

	var stage, end string
	require.NoError(t, tx.Raw(`SELECT stage FROM events WHERE id = ?`, f.eventID).Scan(&stage).Error)
	require.NoError(t, tx.Raw(`SELECT to_char(voting_estimated_end_date, 'YYYY-MM-DD') FROM events WHERE id = ?`, f.eventID).Scan(&end).Error)
	assert.Equal(t, "voting", stage)
	assert.Equal(t, "2026-10-20", end)
	assert.Equal(t, 1, count(t, tx, `SELECT COUNT(*) FROM voting_configurations WHERE event_id = ?`, f.eventID))
	assert.Equal(t, 3, count(t, tx, `SELECT COUNT(*) FROM assignments WHERE event_id = ?`, f.eventID))
}

func TestOpenVoting_ReplacesExistingConfiguration(t *testing.T) {
	tx := migratedTx(t)
	f := seedParticipation(t, tx)
	repo := NewPostgresVotingSetupRepository(tx)
	date := time.Date(2026, 10, 20, 0, 0, 0, 0, time.UTC)

	existingID := uuid.New()
	require.NoError(t, tx.Exec(
		`INSERT INTO voting_configurations (id, event_id, attachments_per_evaluator, min_evaluations_per_file) VALUES (?, ?, 2, 3)`,
		existingID, f.eventID).Error)

	require.NoError(t, repo.OpenVoting(f.eventID.String(), &date, f.config(2), f.validAssignments()))

	assert.Equal(t, 1, count(t, tx, `SELECT COUNT(*) FROM voting_configurations WHERE event_id = ?`, f.eventID))
	assert.Equal(t, 1, count(t, tx, `SELECT COUNT(*) FROM voting_configurations WHERE id = ? AND min_evaluations_per_file = 2`, existingID))
	assert.Equal(t, 3, count(t, tx, `SELECT COUNT(*) FROM assignments WHERE event_id = ?`, f.eventID))
}
