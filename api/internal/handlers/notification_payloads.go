package handlers

import (
	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/domain/vote"
)

// resultPosition returns the adjusted rank of userID and the size of the adjusted ranking.
// ok is false when there are no results or the user does not appear in them.
func resultPosition(results *vote.VotingResults, userID uuid.UUID) (position, total int, ok bool) {
	if results == nil {
		return 0, 0, false
	}
	for _, item := range results.AdjustedRanking {
		if item.ParticipantID == userID {
			return item.AdjustedRank, len(results.AdjustedRanking), true
		}
	}
	return 0, 0, false
}
