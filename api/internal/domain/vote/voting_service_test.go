package vote

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func defaultConfig(eventID uuid.UUID, m int) *VotingConfiguration {
	return &VotingConfiguration{
		ID:                      uuid.New(),
		EventID:                 eventID,
		AttachmentsPerEvaluator: m,
		QualityGoodThreshold:    0.6,
		QualityBadThreshold:     0.3,
		AdjustmentMagnitude:     3,
		MinEvaluationsPerFile:   1,
	}
}

func newTestService() (*VotingService, *fakeVoteRepository, *fakeAttachmentRepository, *fakeUserRepository) {
	voteRepo := newFakeVoteRepository()
	attachmentRepo := newFakeAttachmentRepository()
	userRepo := newFakeUserRepository()
	return NewVotingService(voteRepo, attachmentRepo, userRepo), voteRepo, attachmentRepo, userRepo
}

// ---------------------------------------------------------------------------
// GenerateAssignments
// ---------------------------------------------------------------------------

func TestGenerateAssignments_ValidConfiguration(t *testing.T) {
	vs, _, attachmentRepo, _ := newTestService()
	eventID := uuid.New()

	participants := []uuid.UUID{uuid.New(), uuid.New(), uuid.New(), uuid.New()}
	attachments := make([]uuid.UUID, 4)
	for i, p := range participants {
		attachments[i] = uuid.New()
		attachmentRepo.add(eventID, &fakeAttachment{id: attachments[i], participantID: p, originalName: "photo.jpg"})
	}

	config := defaultConfig(eventID, 2) // recommendedM for k=4 with 60% flexibility should allow m=2
	config.MinEvaluationsPerFile = 1

	assignments, err := vs.GenerateAssignments(eventID, participants, attachments, config)
	require.NoError(t, err)
	require.Len(t, assignments, len(participants))

	for i, a := range assignments {
		assert.Equal(t, participants[i], a.ParticipantID)
		assert.LessOrEqual(t, len(a.AttachmentIDs), config.AttachmentsPerEvaluator)
		// A participant must never be assigned their own attachment.
		for _, assignedID := range a.GetAttachmentUUIDs() {
			assert.NotEqual(t, attachments[i], assignedID, "participant should not evaluate their own attachment")
		}
	}
}

// TestGenerateAssignments_NeverExceedsMEvenWithHighMinEvaluationsPerFile is a
// regression test for a bug found while writing this suite: Phase 1 of
// GenerateAssignments (voting_service.go) used to distribute
// MinEvaluationsPerFile evaluators per attachment WITHOUT checking each
// participant's running total against m, and Phase 2 only ever ADDED
// assignments to reach m, never removing the surplus Phase 1 produced. With
// MinEvaluationsPerFile large relative to n, a participant could end up
// assigned MORE than AttachmentsPerEvaluator (m) attachments.
//
// Phase 1 now skips any candidate already at m assignments, so this same
// scenario (MinEvaluationsPerFile = n, forcing every eligible participant to
// evaluate every attachment) must no longer push anyone past m.
func TestGenerateAssignments_NeverExceedsMEvenWithHighMinEvaluationsPerFile(t *testing.T) {
	vs, _, attachmentRepo, _ := newTestService()
	eventID := uuid.New()

	const n = 4
	const k = 4
	participants := make([]uuid.UUID, n)
	attachments := make([]uuid.UUID, k)
	for i := range participants {
		participants[i] = uuid.New()
		attachments[i] = uuid.New()
		attachmentRepo.add(eventID, &fakeAttachment{id: attachments[i], participantID: participants[i]})
	}

	config := defaultConfig(eventID, 2)
	config.MinEvaluationsPerFile = n

	for attempt := 0; attempt < 50; attempt++ {
		assignments, err := vs.GenerateAssignments(eventID, participants, attachments, config)
		require.NoError(t, err)

		for _, a := range assignments {
			assert.LessOrEqualf(t, len(a.AttachmentIDs), config.AttachmentsPerEvaluator,
				"attempt %d: participant assigned more than m=%d attachments", attempt, config.AttachmentsPerEvaluator)
		}
	}
}

func TestGenerateAssignments_RejectsMExceedingConflictOfInterestBound(t *testing.T) {
	vs, _, attachmentRepo, _ := newTestService()
	eventID := uuid.New()

	participants := []uuid.UUID{uuid.New(), uuid.New(), uuid.New()}
	attachments := make([]uuid.UUID, 3)
	for i, p := range participants {
		attachments[i] = uuid.New()
		attachmentRepo.add(eventID, &fakeAttachment{id: attachments[i], participantID: p})
	}

	// k=3, so maxPossibleM = k-1 = 2. Requesting m=3 must fail.
	config := defaultConfig(eventID, 3)

	_, err := vs.GenerateAssignments(eventID, participants, attachments, config)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "cannot exceed")
}

func TestGenerateAssignments_RejectsMBelowRecommendedMinimum(t *testing.T) {
	vs, _, attachmentRepo, _ := newTestService()
	eventID := uuid.New()

	// Large k so the recommended minimum m (2*log2(k)) is meaningfully > 1.
	const k = 64
	participants := make([]uuid.UUID, k)
	attachments := make([]uuid.UUID, k)
	for i := range participants {
		participants[i] = uuid.New()
		attachments[i] = uuid.New()
		attachmentRepo.add(eventID, &fakeAttachment{id: attachments[i], participantID: participants[i]})
	}

	config := defaultConfig(eventID, 1)

	_, err := vs.GenerateAssignments(eventID, participants, attachments, config)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "recommended minimum")
}

func TestGenerateAssignments_NoParticipantEvaluatesOwnAttachment(t *testing.T) {
	vs, _, attachmentRepo, _ := newTestService()
	eventID := uuid.New()

	participants := []uuid.UUID{uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()}
	attachments := make([]uuid.UUID, 5)
	for i, p := range participants {
		attachments[i] = uuid.New()
		attachmentRepo.add(eventID, &fakeAttachment{id: attachments[i], participantID: p})
	}

	// k=5 -> maxPossibleM=4; with k<=10 the lenient recommendation is
	// ceil(maxPossibleM*0.6)=3, so m must be at least 3 here.
	config := defaultConfig(eventID, 3)
	config.MinEvaluationsPerFile = 2

	assignments, err := vs.GenerateAssignments(eventID, participants, attachments, config)
	require.NoError(t, err)

	for i, a := range assignments {
		for _, assignedID := range a.GetAttachmentUUIDs() {
			assert.NotEqual(t, attachments[i], assignedID)
		}
	}
}

// ---------------------------------------------------------------------------
// CalculateModifiedBordaCount - validation and error paths
// ---------------------------------------------------------------------------

func TestCalculateModifiedBordaCount_NilConfig(t *testing.T) {
	vs, _, _, _ := newTestService()
	_, err := vs.CalculateModifiedBordaCount(uuid.New(), nil)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "voting configuration is required")
}

func TestCalculateModifiedBordaCount_MTooSmall(t *testing.T) {
	vs, _, _, _ := newTestService()
	eventID := uuid.New()
	config := defaultConfig(eventID, 1)
	_, err := vs.CalculateModifiedBordaCount(eventID, config)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "at least 2")
}

func TestCalculateModifiedBordaCount_NoVotes(t *testing.T) {
	vs, _, _, _ := newTestService()
	eventID := uuid.New()
	config := defaultConfig(eventID, 2)

	_, err := vs.CalculateModifiedBordaCount(eventID, config)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "no votes found")
}

func TestCalculateModifiedBordaCount_NoAttachments(t *testing.T) {
	vs, voteRepo, _, _ := newTestService()
	eventID := uuid.New()
	config := defaultConfig(eventID, 2)

	voteRepo.votes = append(voteRepo.votes, &Vote{
		ID: uuid.New(), EventID: eventID, VoterID: uuid.New(),
		AttachmentID: uuid.New(), RankPosition: 1,
	})

	_, err := vs.CalculateModifiedBordaCount(eventID, config)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "no attachments found")
}

// ---------------------------------------------------------------------------
// CalculateModifiedBordaCount - core scoring behaviour
// ---------------------------------------------------------------------------

// setupThreeWayVoting builds a scenario with 3 participants, each submitting one
// attachment and evaluating the other two (m=2), fully symmetric and complete.
func setupThreeWayVoting(t *testing.T) (vs *VotingService, voteRepo *fakeVoteRepository, eventID uuid.UUID, participants, attachments []uuid.UUID, config *VotingConfiguration) {
	t.Helper()
	vs, voteRepo, attachmentRepo, _ := newTestService()
	eventID = uuid.New()

	participants = []uuid.UUID{uuid.New(), uuid.New(), uuid.New()}
	attachments = make([]uuid.UUID, 3)
	for i, p := range participants {
		attachments[i] = uuid.New()
		attachmentRepo.add(eventID, &fakeAttachment{id: attachments[i], participantID: p, originalName: "a.jpg"})
	}
	config = defaultConfig(eventID, 2)
	config.MinEvaluationsPerFile = 1
	return
}

func addAssignment(voteRepo *fakeVoteRepository, eventID, participantID uuid.UUID, attachmentIDs []uuid.UUID, completed bool) *Assignment {
	a := NewAssignment(eventID, participantID, attachmentIDs)
	if completed {
		a.MarkCompleted()
	}
	voteRepo.assignments = append(voteRepo.assignments, a)
	return a
}

func TestCalculateModifiedBordaCount_UnanimousRankingProducesExpectedOrder(t *testing.T) {
	vs, voteRepo, eventID, participants, attachments, config := setupThreeWayVoting(t)

	// participants[0] evaluates attachments[1] (best) and attachments[2] (worst)
	// participants[1] evaluates attachments[0] (best) and attachments[2] (worst)
	// participants[2] evaluates attachments[0] (best) and attachments[1] (worst)
	// => attachments[0] gets two 1st-place votes, attachments[1] one 1st + one 2nd,
	//    attachments[2] gets two 2nd-place (last) votes.
	votes := []*Vote{
		{EventID: eventID, VoterID: participants[0], AttachmentID: attachments[1], RankPosition: 1},
		{EventID: eventID, VoterID: participants[0], AttachmentID: attachments[2], RankPosition: 2},
		{EventID: eventID, VoterID: participants[1], AttachmentID: attachments[0], RankPosition: 1},
		{EventID: eventID, VoterID: participants[1], AttachmentID: attachments[2], RankPosition: 2},
		{EventID: eventID, VoterID: participants[2], AttachmentID: attachments[0], RankPosition: 1},
		{EventID: eventID, VoterID: participants[2], AttachmentID: attachments[1], RankPosition: 2},
	}
	for _, v := range votes {
		v.ID = uuid.New()
		voteRepo.votes = append(voteRepo.votes, v)
	}

	addAssignment(voteRepo, eventID, participants[0], []uuid.UUID{attachments[1], attachments[2]}, true)
	addAssignment(voteRepo, eventID, participants[1], []uuid.UUID{attachments[0], attachments[2]}, true)
	addAssignment(voteRepo, eventID, participants[2], []uuid.UUID{attachments[0], attachments[1]}, true)

	results, err := vs.CalculateModifiedBordaCount(eventID, config)
	require.NoError(t, err)

	require.Len(t, results.GlobalRanking, 3)
	assert.Equal(t, attachments[0], results.GlobalRanking[0].AttachmentID, "attachment with two 1st-place votes should rank first")
	assert.Equal(t, 1, results.GlobalRanking[0].GlobalRank)
	assert.InDelta(t, 1.0, results.GlobalRanking[0].MBCScore, 1e-9, "two 1st-place votes out of m(m-1)=2 should normalize to 1.0")

	assert.Equal(t, attachments[2], results.GlobalRanking[2].AttachmentID, "attachment with two last-place votes should rank last")
	assert.InDelta(t, 0.0, results.GlobalRanking[2].MBCScore, 1e-9)

	assert.Equal(t, 6, results.TotalVotes)
	assert.Equal(t, 3, results.TotalParticipants, "quality map should include all assignments, completed or not")
}

func TestCalculateModifiedBordaCount_TieBreaksByVoteCountThenID(t *testing.T) {
	vs, voteRepo, eventID, participants, attachments, config := setupThreeWayVoting(t)

	// Give attachments[0] and attachments[1] the exact same MBC score (0.5) but
	// different vote counts, so vote count must break the tie.
	votes := []*Vote{
		{EventID: eventID, VoterID: participants[2], AttachmentID: attachments[0], RankPosition: 1},
		{EventID: eventID, VoterID: participants[2], AttachmentID: attachments[1], RankPosition: 2},
		{EventID: eventID, VoterID: participants[1], AttachmentID: attachments[0], RankPosition: 2},
		{EventID: eventID, VoterID: participants[1], AttachmentID: attachments[2], RankPosition: 1},
		{EventID: eventID, VoterID: participants[0], AttachmentID: attachments[1], RankPosition: 1},
		{EventID: eventID, VoterID: participants[0], AttachmentID: attachments[2], RankPosition: 2},
	}
	for _, v := range votes {
		v.ID = uuid.New()
		voteRepo.votes = append(voteRepo.votes, v)
	}
	addAssignment(voteRepo, eventID, participants[0], []uuid.UUID{attachments[1], attachments[2]}, true)
	addAssignment(voteRepo, eventID, participants[1], []uuid.UUID{attachments[0], attachments[2]}, true)
	addAssignment(voteRepo, eventID, participants[2], []uuid.UUID{attachments[0], attachments[1]}, true)

	results, err := vs.CalculateModifiedBordaCount(eventID, config)
	require.NoError(t, err)

	// attachments[0]: ranks {1,2} -> mbcSum = (2-1)+(2-2) = 1 -> score 0.5, voteCount 2
	// attachments[1]: ranks {2,1} -> mbcSum = (2-2)+(2-1) = 1 -> score 0.5, voteCount 2
	// attachments[2]: ranks {1,2} -> mbcSum = (2-1)+(2-2) = 1 -> score 0.5, voteCount 2
	// All three tie on score and vote count, so order must fall back to attachment ID string ordering.
	assert.InDelta(t, results.GlobalRanking[0].MBCScore, results.GlobalRanking[1].MBCScore, 1e-9)
	assert.InDelta(t, results.GlobalRanking[1].MBCScore, results.GlobalRanking[2].MBCScore, 1e-9)
	assert.True(t, results.GlobalRanking[0].AttachmentID.String() < results.GlobalRanking[1].AttachmentID.String())
	assert.True(t, results.GlobalRanking[1].AttachmentID.String() < results.GlobalRanking[2].AttachmentID.String())
}

func TestCalculateModifiedBordaCount_AttachmentWithNoVotesRanksLast(t *testing.T) {
	vs, voteRepo, eventID, participants, attachments, config := setupThreeWayVoting(t)

	// Only participants[0] votes, and only on attachments[1]. attachments[0] and
	// attachments[2] receive zero votes each.
	voteRepo.votes = append(voteRepo.votes, &Vote{
		ID: uuid.New(), EventID: eventID, VoterID: participants[0],
		AttachmentID: attachments[1], RankPosition: 1,
	})
	addAssignment(voteRepo, eventID, participants[0], []uuid.UUID{attachments[1]}, true)
	addAssignment(voteRepo, eventID, participants[1], []uuid.UUID{attachments[0]}, false)
	addAssignment(voteRepo, eventID, participants[2], []uuid.UUID{attachments[2]}, false)

	results, err := vs.CalculateModifiedBordaCount(eventID, config)
	require.NoError(t, err)

	byID := map[uuid.UUID]AttachmentResult{}
	for _, r := range results.GlobalRanking {
		byID[r.AttachmentID] = r
	}

	assert.Equal(t, 0, byID[attachments[0]].VoteCount)
	assert.InDelta(t, 0.0, byID[attachments[0]].MBCScore, 1e-9)
	assert.Equal(t, 0, byID[attachments[2]].VoteCount)
	assert.InDelta(t, 0.0, byID[attachments[2]].MBCScore, 1e-9)

	// attachments[1] got the only vote, and it was a 1st-place vote -> top score.
	assert.Greater(t, byID[attachments[1]].MBCScore, byID[attachments[0]].MBCScore)
	assert.Equal(t, 1, byID[attachments[1]].GlobalRank)
}

// ---------------------------------------------------------------------------
// Participant who never votes: quality score and ranking impact
// (mirrors the "what happens if one participant doesn't vote" scenario)
// ---------------------------------------------------------------------------

func TestCalculateModifiedBordaCount_NonVotingParticipantGetsZeroQualityAndPenalizedRanking(t *testing.T) {
	vs, voteRepo, eventID, participants, attachments, config := setupThreeWayVoting(t)
	config.AdjustmentMagnitude = 1 // small, deterministic shift for this 3-item ranking

	// participants[0] and participants[1] vote as expected; participants[2] never votes.
	votes := []*Vote{
		{EventID: eventID, VoterID: participants[0], AttachmentID: attachments[1], RankPosition: 1},
		{EventID: eventID, VoterID: participants[0], AttachmentID: attachments[2], RankPosition: 2},
		{EventID: eventID, VoterID: participants[1], AttachmentID: attachments[0], RankPosition: 1},
		{EventID: eventID, VoterID: participants[1], AttachmentID: attachments[2], RankPosition: 2},
	}
	for _, v := range votes {
		v.ID = uuid.New()
		voteRepo.votes = append(voteRepo.votes, v)
	}

	addAssignment(voteRepo, eventID, participants[0], []uuid.UUID{attachments[1], attachments[2]}, true)
	addAssignment(voteRepo, eventID, participants[1], []uuid.UUID{attachments[0], attachments[2]}, true)
	// participants[2] has an assignment but never completed it.
	incomplete := addAssignment(voteRepo, eventID, participants[2], []uuid.UUID{attachments[0], attachments[1]}, false)
	require.False(t, incomplete.IsCompleted)

	results, err := vs.CalculateModifiedBordaCount(eventID, config)
	require.NoError(t, err)

	// The non-voting participant's quality score must be exactly 0.
	quality, ok := results.ParticipantQualities[participants[2].String()]
	require.True(t, ok, "non-voting participant should still appear in the quality map")
	assert.Equal(t, 0.0, quality)

	// The calculation must still succeed and produce a full ranking despite the
	// missing votes: nothing crashes or gets silently dropped.
	assert.Len(t, results.GlobalRanking, 3)
	assert.Equal(t, 3, results.TotalParticipants)

	// Because quality 0.0 <= QualityBadThreshold (0.3), the non-voter's own
	// attachment (attachments[2]) must be penalized in the adjusted ranking
	// relative to its unadjusted global rank.
	var globalRankOfNonVoterAttachment, adjustedRankOfNonVoterAttachment int
	for _, r := range results.GlobalRanking {
		if r.ParticipantID == participants[2] {
			globalRankOfNonVoterAttachment = r.GlobalRank
		}
	}
	for _, r := range results.AdjustedRanking {
		if r.ParticipantID == participants[2] {
			adjustedRankOfNonVoterAttachment = r.AdjustedRank
		}
	}
	require.NotZero(t, globalRankOfNonVoterAttachment)
	require.NotZero(t, adjustedRankOfNonVoterAttachment)
	assert.GreaterOrEqual(t, adjustedRankOfNonVoterAttachment, globalRankOfNonVoterAttachment,
		"a bad/absent evaluator's own submission should never improve rank after adjustment")
}

func TestCalculateModifiedBordaCount_AllParticipantsAbsentExceptOneStillProducesResult(t *testing.T) {
	vs, voteRepo, eventID, participants, attachments, config := setupThreeWayVoting(t)

	// Only one vote exists in the whole event; everyone else's assignments are incomplete.
	voteRepo.votes = append(voteRepo.votes, &Vote{
		ID: uuid.New(), EventID: eventID, VoterID: participants[0],
		AttachmentID: attachments[1], RankPosition: 1,
	})
	addAssignment(voteRepo, eventID, participants[0], []uuid.UUID{attachments[1]}, true)
	addAssignment(voteRepo, eventID, participants[1], []uuid.UUID{attachments[0]}, false)
	addAssignment(voteRepo, eventID, participants[2], []uuid.UUID{attachments[2]}, false)

	results, err := vs.CalculateModifiedBordaCount(eventID, config)
	require.NoError(t, err, "a single completed vote must be enough to calculate results without error")

	assert.Equal(t, 0.0, results.ParticipantQualities[participants[1].String()])
	assert.Equal(t, 0.0, results.ParticipantQualities[participants[2].String()])
}

// ---------------------------------------------------------------------------
// applyIncentiveSystem behaviour (via CalculateModifiedBordaCount)
// ---------------------------------------------------------------------------

func TestCalculateModifiedBordaCount_GoodEvaluatorBonusImprovesOwnRank(t *testing.T) {
	vs, voteRepo, eventID, participants, attachments, config := setupThreeWayVoting(t)
	config.AdjustmentMagnitude = 1
	config.QualityGoodThreshold = 0.5

	// All three vote in perfect agreement with the eventual global ranking,
	// so every participant should be a "good" evaluator (quality >= threshold).
	votes := []*Vote{
		{EventID: eventID, VoterID: participants[0], AttachmentID: attachments[1], RankPosition: 1},
		{EventID: eventID, VoterID: participants[0], AttachmentID: attachments[2], RankPosition: 2},
		{EventID: eventID, VoterID: participants[1], AttachmentID: attachments[0], RankPosition: 1},
		{EventID: eventID, VoterID: participants[1], AttachmentID: attachments[2], RankPosition: 2},
		{EventID: eventID, VoterID: participants[2], AttachmentID: attachments[0], RankPosition: 1},
		{EventID: eventID, VoterID: participants[2], AttachmentID: attachments[1], RankPosition: 2},
	}
	for _, v := range votes {
		v.ID = uuid.New()
		voteRepo.votes = append(voteRepo.votes, v)
	}
	addAssignment(voteRepo, eventID, participants[0], []uuid.UUID{attachments[1], attachments[2]}, true)
	addAssignment(voteRepo, eventID, participants[1], []uuid.UUID{attachments[0], attachments[2]}, true)
	addAssignment(voteRepo, eventID, participants[2], []uuid.UUID{attachments[0], attachments[1]}, true)

	results, err := vs.CalculateModifiedBordaCount(eventID, config)
	require.NoError(t, err)

	// Adjusted ranks must stay within valid bounds [1, len(results)] regardless of adjustment.
	for _, r := range results.AdjustedRanking {
		assert.GreaterOrEqual(t, r.AdjustedRank, 1)
		assert.LessOrEqual(t, r.AdjustedRank, len(results.AdjustedRanking))
	}

	// Adjusted ranking must still be a permutation of 1..N (consecutive, no gaps/dupes).
	seen := map[int]bool{}
	for _, r := range results.AdjustedRanking {
		assert.False(t, seen[r.AdjustedRank], "adjusted ranks must be unique after reassignment")
		seen[r.AdjustedRank] = true
	}
	assert.Len(t, seen, 3)
}

// ---------------------------------------------------------------------------
// ValidateVotingConfiguration
// ---------------------------------------------------------------------------

func TestValidateVotingConfiguration_MNonPositive(t *testing.T) {
	vs, _, _, _ := newTestService()
	config := defaultConfig(uuid.New(), 0)
	err := vs.ValidateVotingConfiguration(config, 10, 10)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "must be positive")
}

func TestValidateVotingConfiguration_MExceedsConflictBound(t *testing.T) {
	vs, _, _, _ := newTestService()
	config := defaultConfig(uuid.New(), 5)
	err := vs.ValidateVotingConfiguration(config, 5, 5) // maxPossibleM = k-1 = 4
	require.Error(t, err)
	assert.Contains(t, err.Error(), "cannot exceed")
}

func TestValidateVotingConfiguration_BadThresholdOrdering(t *testing.T) {
	vs, _, _, _ := newTestService()
	config := defaultConfig(uuid.New(), 2)
	config.QualityGoodThreshold = 0.3
	config.QualityBadThreshold = 0.6
	err := vs.ValidateVotingConfiguration(config, 10, 10)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "higher than")
}

func TestValidateVotingConfiguration_ThresholdsOutOfRange(t *testing.T) {
	vs, _, _, _ := newTestService()
	config := defaultConfig(uuid.New(), 2)
	config.QualityGoodThreshold = 1.5
	err := vs.ValidateVotingConfiguration(config, 10, 10)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "[0, 1] range")
}

func TestValidateVotingConfiguration_InsufficientTotalEvaluations(t *testing.T) {
	vs, _, _, _ := newTestService()
	// k=10, n=3: maxPossibleM=9, recommendedM=ceil(2*log2(10))=7, capped to
	// ceil(9*0.6)=6 since k<=10. m=6 satisfies both bounds.
	config := defaultConfig(uuid.New(), 6)
	config.MinEvaluationsPerFile = 10
	// n*m = 3*6 = 18, need k*MinEvaluationsPerFile = 10*10 = 100
	err := vs.ValidateVotingConfiguration(config, 10, 3)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "insufficient total evaluations")
}

func TestValidateVotingConfiguration_ValidConfigPasses(t *testing.T) {
	vs, _, _, _ := newTestService()
	config := defaultConfig(uuid.New(), 2)
	config.MinEvaluationsPerFile = 1
	err := vs.ValidateVotingConfiguration(config, 4, 4)
	assert.NoError(t, err)
}

// ---------------------------------------------------------------------------
// Vote / Assignment / VotingConfiguration domain validation (vote.go)
// ---------------------------------------------------------------------------

func TestVoteValidate(t *testing.T) {
	valid := NewVote(uuid.New(), uuid.New(), uuid.New(), 1)
	assert.NoError(t, valid.Validate())

	missingEvent := NewVote(uuid.Nil, uuid.New(), uuid.New(), 1)
	assert.Error(t, missingEvent.Validate())

	zeroRank := NewVote(uuid.New(), uuid.New(), uuid.New(), 0)
	assert.Error(t, zeroRank.Validate())

	negativeRank := NewVote(uuid.New(), uuid.New(), uuid.New(), -1)
	assert.Error(t, negativeRank.Validate())
}

func TestAssignmentValidateAndCompletion(t *testing.T) {
	a := NewAssignment(uuid.New(), uuid.New(), []uuid.UUID{uuid.New()})
	assert.NoError(t, a.Validate())
	assert.False(t, a.IsCompleted)
	assert.Nil(t, a.CompletedAt)

	a.MarkCompleted()
	assert.True(t, a.IsCompleted)
	assert.NotNil(t, a.CompletedAt)

	empty := NewAssignment(uuid.New(), uuid.New(), nil)
	assert.Error(t, empty.Validate())
}

func TestVotingConfigurationValidate(t *testing.T) {
	config := NewVotingConfiguration(uuid.New(), 3)
	assert.NoError(t, config.Validate())

	config.AttachmentsPerEvaluator = 0
	assert.Error(t, config.Validate())
}
