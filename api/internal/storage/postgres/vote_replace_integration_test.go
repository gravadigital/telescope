//go:build integration
// +build integration

package postgres

import (
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/domain/vote"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func ranking(f votingFixture, a *vote.Assignment, ids []uuid.UUID, ranks []int) []*vote.Vote {
	votes := make([]*vote.Vote, len(ids))
	for i, id := range ids {
		v := vote.NewVote(f.eventID, f.reviewer, id, ranks[i])
		v.AssignmentID = a.ID
		votes[i] = v
	}
	return votes
}

func voteCount(t *testing.T, tx *gorm.DB, id uuid.UUID) int {
	t.Helper()
	var n int
	require.NoError(t, tx.Raw("SELECT vote_count FROM attachments WHERE id = ?", id).Scan(&n).Error)
	return n
}

func rankOf(t *testing.T, tx *gorm.DB, assignmentID, attachmentID uuid.UUID) int {
	t.Helper()
	var n int
	require.NoError(t, tx.Raw("SELECT rank_position FROM votes WHERE assignment_id = ? AND attachment_id = ?",
		assignmentID, attachmentID).Scan(&n).Error)
	return n
}

func seedSubmitted(t *testing.T) (*gorm.DB, votingFixture, *vote.Assignment, *PostgresVoteRepository) {
	tx := migratedTx(t)
	f := seedVoting(t, tx, 2)
	repo := NewPostgresVoteRepository(tx)
	a := newAssignment(f, f.attachments)
	require.NoError(t, repo.CreateAssignment(a))

	replaced, err := repo.ReplaceAssignmentVotes(a.ID.String(), ranking(f, a, f.attachments, []int{1, 2}))
	require.NoError(t, err)
	require.False(t, replaced)
	return tx, f, a, repo
}

func TestReplaceAssignmentVotes_ReplacesAndKeepsTriggersConsistent(t *testing.T) {
	tx, f, a, repo := seedSubmitted(t)

	replaced, err := repo.ReplaceAssignmentVotes(a.ID.String(), ranking(f, a, f.attachments, []int{2, 1}))
	require.NoError(t, err)
	require.True(t, replaced)

	require.Equal(t, 2, count(t, tx, "SELECT COUNT(*) FROM votes WHERE assignment_id = ?", a.ID))
	require.Equal(t, 2, rankOf(t, tx, a.ID, f.attachments[0]))
	require.Equal(t, 1, rankOf(t, tx, a.ID, f.attachments[1]))
	require.Equal(t, 1, count(t, tx, "SELECT COUNT(*) FROM assignments WHERE id = ? AND is_completed AND completed_at IS NOT NULL", a.ID))
	require.Equal(t, 1, voteCount(t, tx, f.attachments[0]))
	require.Equal(t, 1, voteCount(t, tx, f.attachments[1]))
}

func TestReplaceAssignmentVotes_RollsBackWhenTriggerRejects(t *testing.T) {
	tx, f, a, repo := seedSubmitted(t)

	_, err := repo.ReplaceAssignmentVotes(a.ID.String(), ranking(f, a, []uuid.UUID{f.attachments[0], f.own}, []int{1, 2}))
	require.Error(t, err)

	require.Equal(t, 2, count(t, tx, "SELECT COUNT(*) FROM votes WHERE assignment_id = ?", a.ID))
	require.Equal(t, 1, rankOf(t, tx, a.ID, f.attachments[0]))
	require.Equal(t, 2, rankOf(t, tx, a.ID, f.attachments[1]))
	require.Equal(t, 1, count(t, tx, "SELECT COUNT(*) FROM assignments WHERE id = ? AND is_completed", a.ID))
	require.Equal(t, 1, voteCount(t, tx, f.attachments[0]))
	require.Equal(t, 1, voteCount(t, tx, f.attachments[1]))
}

func TestReplaceAssignmentVotes_PartialReplacementUnmarksAssignment(t *testing.T) {
	tx, f, a, repo := seedSubmitted(t)

	replaced, err := repo.ReplaceAssignmentVotes(a.ID.String(), ranking(f, a, f.attachments[:1], []int{1}))
	require.NoError(t, err)
	require.True(t, replaced)

	require.Equal(t, 1, count(t, tx, "SELECT COUNT(*) FROM votes WHERE assignment_id = ?", a.ID))
	require.Equal(t, 1, count(t, tx, "SELECT COUNT(*) FROM assignments WHERE id = ? AND NOT is_completed AND completed_at IS NULL", a.ID))
	require.Equal(t, 1, voteCount(t, tx, f.attachments[0]))
	require.Equal(t, 0, voteCount(t, tx, f.attachments[1]))
}

func TestGetAssignmentByParticipant_ReturnsSentinelWhenMissing(t *testing.T) {
	tx := migratedTx(t)
	f := seedVoting(t, tx, 2)

	_, err := NewPostgresVoteRepository(tx).GetAssignmentByParticipant(f.eventID.String(), uuid.New().String())
	require.True(t, errors.Is(err, ErrAssignmentNotFound))
}
