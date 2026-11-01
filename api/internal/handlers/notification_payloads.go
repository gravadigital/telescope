package handlers

import (
	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/domain/vote"
)

// resultPosition returns the adjusted rank of userID and the number of ranked attachments.
// ok is false when there are no results, the user does not appear in them, or their
// attachment received no votes and so has no position.
func resultPosition(results *vote.VotingResults, userID uuid.UUID) (position, total int, ok bool) {
	if results == nil {
		return 0, 0, false
	}
	for _, item := range results.AdjustedRanking {
		if !item.Unevaluated {
			total++
		}
		if item.ParticipantID == userID && !item.Unevaluated {
			position, ok = item.AdjustedRank, true
		}
	}
	if !ok {
		return 0, 0, false
	}
	return position, total, true
}
