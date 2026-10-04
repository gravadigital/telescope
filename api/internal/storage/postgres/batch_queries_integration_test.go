//go:build integration
// +build integration

package postgres

import (
	"testing"

	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/domain/vote"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// addEventParticipant registers userID in the event with the given role.
func addEventParticipant(t *testing.T, tx *gorm.DB, eventID, userID uuid.UUID, role string) {
	t.Helper()
	require.NoError(t, tx.Exec(
		`INSERT INTO event_participants (event_id, user_id, role) VALUES (?, ?, ?)
		 ON CONFLICT (event_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
		eventID, userID, role).Error)
}

func insertUser(t *testing.T, tx *gorm.DB) uuid.UUID {
	t.Helper()
	id := uuid.New()
	require.NoError(t, tx.Exec(`INSERT INTO users (id, name, email) VALUES (?, 'Test', ?)`, id, id.String()+"@example.com").Error)
	return id
}

func TestCountParticipantsByEventIDs_ExcludesAuthor(t *testing.T) {
	tx := migratedTx(t)
	a := seedVoting(t, tx, 1)
	b := seedVoting(t, tx, 1)
	addEventParticipant(t, tx, a.eventID, a.author, "creator")
	for i := 0; i < 3; i++ {
		addEventParticipant(t, tx, a.eventID, insertUser(t, tx), "participant")
	}
	addEventParticipant(t, tx, b.eventID, b.author, "creator")

	counts, err := NewPostgresEventRepository(tx).CountParticipantsByEventIDs([]string{a.eventID.String(), b.eventID.String()})

	require.NoError(t, err)
	assert.Equal(t, 3, counts[a.eventID.String()])
	assert.Equal(t, 0, counts[b.eventID.String()])
}

func TestGetByParticipantAndEventIDs_FiltersByParticipantAndEvents(t *testing.T) {
	tx := migratedTx(t)
	a := seedVoting(t, tx, 1)
	c := seedVoting(t, tx, 1)
	// A user with a proposal in both A and C, asked about A and an unrelated event.
	user := a.reviewer
	require.NoError(t, tx.Exec(
		`INSERT INTO attachments (id, event_id, participant_id, filename, original_name, file_path, file_size, mime_type)
		 VALUES (?, ?, ?, 'file.pdf', 'file.pdf', 'events/file.pdf', 100, 'application/pdf')`,
		uuid.New(), c.eventID, user).Error)

	got, err := NewPostgresAttachmentRepository(tx).GetByParticipantAndEventIDs(user.String(), []string{a.eventID.String(), uuid.NewString()})

	require.NoError(t, err)
	require.Len(t, got, 1)
	assert.Equal(t, a.eventID, got[0].EventID)
	assert.Equal(t, user, got[0].ParticipantID)
}

func TestGetAssignmentsByParticipantAndEventIDs(t *testing.T) {
	tx := migratedTx(t)
	f := seedVoting(t, tx, 2)
	repo := NewPostgresVoteRepository(tx)
	require.NoError(t, repo.CreateAssignment(newAssignment(f, f.attachments)))
	// Another evaluator's assignment in the same event must not be returned.
	otherReviewer := insertUser(t, tx)
	require.NoError(t, tx.Exec(
		`INSERT INTO attachments (id, event_id, participant_id, filename, original_name, file_path, file_size, mime_type)
		 VALUES (?, ?, ?, 'file.pdf', 'file.pdf', 'events/file.pdf', 100, 'application/pdf')`,
		uuid.New(), f.eventID, otherReviewer).Error)
	otherAssignment := newAssignment(f, f.attachments)
	otherAssignment.ID = uuid.New()
	otherAssignment.ParticipantID = otherReviewer
	require.NoError(t, repo.CreateAssignment(otherAssignment))

	got, err := repo.GetAssignmentsByParticipantAndEventIDs(f.reviewer.String(), []string{f.eventID.String()})
	require.NoError(t, err)
	require.Len(t, got, 1)
	assert.Equal(t, f.reviewer, got[0].ParticipantID)
	assert.False(t, got[0].IsCompleted)

	other, err := repo.GetAssignmentsByParticipantAndEventIDs(f.author.String(), []string{f.eventID.String()})
	require.NoError(t, err)
	assert.Empty(t, other)
}

func TestVotingResultsGetByEventIDs(t *testing.T) {
	tx := migratedTx(t)
	a := seedVoting(t, tx, 1)
	c := seedVoting(t, tx, 1)
	repo := NewPostgresVotingResultsRepository(tx)
	participantID := uuid.New()
	for _, id := range []uuid.UUID{a.eventID, c.eventID} {
		require.NoError(t, repo.Create(&vote.VotingResults{
			ID:                   uuid.New(),
			EventID:              id,
			GlobalRanking:        vote.AttachmentResultSlice{},
			ParticipantQualities: vote.ParticipantQualityMap{},
			TotalParticipants:    1,
			TotalVotes:           1,
			AdjustedRanking: vote.AttachmentResultSlice{
				{AttachmentID: uuid.New(), ParticipantID: participantID, AdjustedRank: 1},
			},
		}))
	}

	got, err := repo.GetByEventIDs([]string{a.eventID.String(), uuid.NewString()})

	require.NoError(t, err)
	require.Len(t, got, 1)
	assert.Equal(t, a.eventID, got[0].EventID)
	require.Len(t, got[0].AdjustedRanking, 1)
	assert.Equal(t, participantID, got[0].AdjustedRanking[0].ParticipantID)
}

func TestBatchQueries_EmptyListsReturnEmpty(t *testing.T) {
	tx := migratedTx(t)
	empty := []string{}
	user := uuid.NewString()

	counts, err := NewPostgresEventRepository(tx).CountParticipantsByEventIDs(empty)
	require.NoError(t, err)
	assert.Empty(t, counts)

	atts, err := NewPostgresAttachmentRepository(tx).GetByParticipantAndEventIDs(user, empty)
	require.NoError(t, err)
	assert.Empty(t, atts)

	assignments, err := NewPostgresVoteRepository(tx).GetAssignmentsByParticipantAndEventIDs(user, empty)
	require.NoError(t, err)
	assert.Empty(t, assignments)

	results, err := NewPostgresVotingResultsRepository(tx).GetByEventIDs(empty)
	require.NoError(t, err)
	assert.Empty(t, results)
}

func TestBatchQueries_MalformedIDsFail(t *testing.T) {
	tx := migratedTx(t)

	_, err := NewPostgresEventRepository(tx).CountParticipantsByEventIDs([]string{"nope"})
	assert.Error(t, err)
	_, err = NewPostgresVotingResultsRepository(tx).GetByEventIDs([]string{"nope"})
	assert.Error(t, err)
}

// Verifies risk D20 of the S-008 plan: whether the future_start_date CHECK, declared
// NOT VALID, is re-evaluated when a row with an old start_date is updated.
func TestEventUpdate_FutureStartDateCheckOnOldEvent(t *testing.T) {
	tx := migratedTx(t)
	author := insertUser(t, tx)
	eventID := uuid.New()

	// Same sequence as migration 012: the old row exists before the CHECK does.
	require.NoError(t, tx.Exec(`ALTER TABLE events DROP CONSTRAINT IF EXISTS future_start_date`).Error)
	require.NoError(t, tx.Exec(
		`INSERT INTO events (id, name, description, author_id, start_date, end_date, stage, shareable_link)
		 VALUES (?, 'Evento viejo', 'Descripción', ?, NOW() - INTERVAL '10 days', NOW() + INTERVAL '7 days', 'participation', ?)`,
		eventID, author, eventID.String()).Error)
	require.NoError(t, tx.Exec(
		`ALTER TABLE events ADD CONSTRAINT future_start_date
		 CHECK (start_date >= CURRENT_TIMESTAMP - INTERVAL '1 day') NOT VALID`).Error)

	repo := NewPostgresEventRepository(tx)
	evt, err := repo.GetByID(eventID.String())
	require.NoError(t, err)
	evt.Name = "Evento viejo renombrado"

	// A failed statement aborts the surrounding transaction, so this is the last query.
	err = repo.Update(evt)

	// Documents D20 of the S-008 plan: PostgreSQL re-checks a NOT VALID constraint on
	// every UPDATE of the row, whether or not start_date changes. Editing, changing the
	// stage of, pausing or cancelling an event whose start_date is older than a day
	// therefore fails. Fixing it needs a design decision (a migration that drops the
	// CHECK or restricts it to INSERT); when that lands, flip this assertion.
	require.ErrorContains(t, err, "future_start_date")
}
