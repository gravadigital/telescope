package vote

import (
	"errors"
	"fmt"
	"math"
	"math/rand"
	"sort"
	"time"

	"github.com/google/uuid"
)

// VotingService implements the distributed voting system
type VotingService struct {
	voteRepo       VoteRepository
	attachmentRepo AttachmentRepository
	userRepo       UserRepository
}

func NewVotingService(voteRepo VoteRepository, attachmentRepo AttachmentRepository, userRepo UserRepository) *VotingService {
	return &VotingService{
		voteRepo:       voteRepo,
		attachmentRepo: attachmentRepo,
		userRepo:       userRepo,
	}
}

// GenerateAssignments implements the assignment algorithm A: P → 2^F
func (vs *VotingService) GenerateAssignments(eventID uuid.UUID, participants []uuid.UUID, attachments []uuid.UUID, config *VotingConfiguration) ([]*Assignment, error) {
	n := len(participants)
	k := len(attachments)
	m := config.AttachmentsPerEvaluator

	minM, maxPossibleM, _ := VotingBounds(k)

	if m > maxPossibleM {
		return nil, fmt.Errorf("attachments per evaluator (m=%d) cannot exceed %d (conflict of interest prevents evaluating own files)", m, maxPossibleM)
	}

	if m < minM {
		return nil, fmt.Errorf("recommended minimum attachments per evaluator is %d for %d total attachments (max possible: %d)", minM, k, maxPossibleM)
	}

	assignments := make([]*Assignment, n)
	assignmentMatrix := make([][]bool, n)
	for i := range assignmentMatrix {
		assignmentMatrix[i] = make([]bool, k)
	}

	evaluationsPerAttachment := make([]int, k)
	assignmentsPerParticipant := make([]int, n)

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	// Phase 1: Ensure minimum evaluations per file, without ever pushing a
	// participant past m assignments. Candidates already at m (or in
	// conflict of interest) are skipped in favor of the next one in the
	// shuffled order, so a file may end up below MinEvaluationsPerFile when
	// there aren't enough eligible participants left under the m cap.
	for attachmentIdx := range k {
		participantIndices := rng.Perm(n)
		assigned := 0
		for _, participantIdx := range participantIndices {
			if assigned >= config.MinEvaluationsPerFile {
				break
			}

			if assignmentsPerParticipant[participantIdx] >= m {
				continue
			}

			// Check if participant can evaluate this attachment (conflict of interest)
			if !vs.hasConflictOfInterest(participants[participantIdx], attachments[attachmentIdx]) {
				assignmentMatrix[participantIdx][attachmentIdx] = true
				evaluationsPerAttachment[attachmentIdx]++
				assignmentsPerParticipant[participantIdx]++
				assigned++
			}
		}
	}

	// Phase 2: Complete assignments to reach exactly m attachments per participant
	for participantIdx := range n {
		currentAssignments := assignmentsPerParticipant[participantIdx]

		attachmentIndices := rng.Perm(k)
		for _, attachmentIdx := range attachmentIndices {
			if currentAssignments >= m {
				break
			}

			if !assignmentMatrix[participantIdx][attachmentIdx] &&
				!vs.hasConflictOfInterest(participants[participantIdx], attachments[attachmentIdx]) {
				assignmentMatrix[participantIdx][attachmentIdx] = true
				evaluationsPerAttachment[attachmentIdx]++
				currentAssignments++
			}
		}

		var assignedAttachments []uuid.UUID
		for attachmentIdx := range k {
			if assignmentMatrix[participantIdx][attachmentIdx] {
				assignedAttachments = append(assignedAttachments, attachments[attachmentIdx])
			}
		}

		assignments[participantIdx] = NewAssignment(eventID, participants[participantIdx], assignedAttachments)
	}

	return assignments, nil
}

// CalculateModifiedBordaCount implements the MBC formula
func (vs *VotingService) CalculateModifiedBordaCount(eventID uuid.UUID, config *VotingConfiguration) (*VotingResults, error) {
	// Validate configuration parameters
	if config == nil {
		return nil, errors.New("voting configuration is required")
	}

	if config.AttachmentsPerEvaluator < 2 {
		return nil, fmt.Errorf("invalid configuration: attachments_per_evaluator must be at least 2, got %d", config.AttachmentsPerEvaluator)
	}

	votes, err := vs.voteRepo.GetByEventID(eventID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to get votes: %w", err)
	}

	if len(votes) == 0 {
		return nil, errors.New("no votes found for this event")
	}

	attachments, err := vs.attachmentRepo.GetByEventID(eventID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to get attachments: %w", err)
	}

	if len(attachments) == 0 {
		return nil, errors.New("no attachments found for this event")
	}

	m := config.AttachmentsPerEvaluator

	// Safety check to prevent division by zero
	if m < 2 {
		return nil, fmt.Errorf("attachments per evaluator must be at least 2, got %d", m)
	}

	votesByAttachment := make(map[uuid.UUID][]*Vote)
	for _, vote := range votes {
		votesByAttachment[vote.AttachmentID] = append(votesByAttachment[vote.AttachmentID], vote)
	}

	var results []AttachmentResult
	for _, attachment := range attachments {
		attachmentVotes := votesByAttachment[attachment.GetID()]

		// Calculate MBC(f_j) = (1/(v_j(m-1))) * Σ(m - R_i(f_j)), with v_j the votes f_j received
		var mbcSum float64
		voteCount := len(attachmentVotes)

		for _, vote := range attachmentVotes {
			// Convert rank to Borda points: 1st place = m-1 points, last place = 0 points
			bordaPoints := float64(m - vote.RankPosition)
			mbcSum += bordaPoints
		}

		// Average over the votes actually received, so the score does not depend on how many
		// evaluators the assignment gave this attachment or whether they voted. 0 ≤ MBC ≤ 1.
		var mbcScore float64
		if voteCount > 0 {
			mbcScore = mbcSum / (float64(voteCount) * float64(m-1))
		}

		// Calculate average rank for additional insight
		var averageRank float64
		if voteCount > 0 {
			var rankSum int
			for _, vote := range attachmentVotes {
				rankSum += vote.RankPosition
			}
			averageRank = float64(rankSum) / float64(voteCount)
		}

		results = append(results, AttachmentResult{
			AttachmentID:    attachment.GetID(),
			Filename:        attachment.GetOriginalName(),
			ParticipantID:   attachment.GetParticipantID(),
			ParticipantName: "", // Will be populated later
			MBCScore:        mbcScore,
			VoteCount:       voteCount,
			AverageRank:     averageRank,
		})
	}

	// An attachment nobody voted on has no score to rank by: a 0 would place it last as if
	// every evaluator had ranked it worst. It is left out of G and G' (rank 0, Unevaluated)
	// and listed after the ranked ones.
	var ranked, unevaluated []AttachmentResult
	for _, result := range results {
		if result.VoteCount == 0 {
			result.Unevaluated = true
			unevaluated = append(unevaluated, result)
			continue
		}
		ranked = append(ranked, result)
	}
	sort.Slice(unevaluated, func(i, j int) bool {
		return unevaluated[i].AttachmentID.String() < unevaluated[j].AttachmentID.String()
	})

	// Sort by MBC score (highest first) to create global ranking G
	// Ties fall back to attachment ID for deterministic ordering. Vote count is not a
	// tiebreaker: how many evaluators an attachment got says nothing about its merit.
	sort.Slice(ranked, func(i, j int) bool {
		if ranked[i].MBCScore == ranked[j].MBCScore {
			return ranked[i].AttachmentID.String() < ranked[j].AttachmentID.String()
		}
		return ranked[i].MBCScore > ranked[j].MBCScore
	})

	for i := range ranked {
		ranked[i].GlobalRank = i + 1
	}

	// Calculate participant quality scores Q_i
	participantQualities, err := vs.calculateParticipantQualities(eventID, ranked, m)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate participant qualities: %w", err)
	}

	// Count total votes
	totalVotes := 0
	for _, result := range ranked {
		totalVotes += result.VoteCount
	}

	// Apply incentive system to create adjusted ranking G'
	adjustedResults := vs.applyIncentiveSystem(ranked, participantQualities, config)

	// Create voting results object
	votingResults := &VotingResults{
		ID:                      uuid.New(),
		EventID:                 eventID,
		GlobalRanking:           append(ranked, unevaluated...),
		ParticipantQualities:    participantQualities,
		AdjustedRanking:         append(adjustedResults, unevaluated...),
		TotalParticipants:       len(participantQualities),
		TotalVotes:              totalVotes,
		AttachmentsPerEvaluator: m,
		CalculatedAt:            time.Now(),
	}

	return votingResults, nil
}

// calculateParticipantQualities implements Q_i = 1 - (1/⌊m²/2⌋) * Σ|R_i(f_j) - RelativeRank_G(f_j, A(p_i))|
// (Merrifield & Saari 2009). ⌊m²/2⌋ is the largest possible deviation, reached by ranking the
// subset in exactly the reverse order, so Q_i spans [0,1] without clamping.
func (vs *VotingService) calculateParticipantQualities(eventID uuid.UUID, globalResults []AttachmentResult, m int) (map[string]float64, error) {
	assignments, err := vs.voteRepo.GetAssignmentsByEventID(eventID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to get assignments: %w", err)
	}

	globalRankMap := make(map[uuid.UUID]int)
	for _, result := range globalResults {
		globalRankMap[result.AttachmentID] = result.GlobalRank
	}

	qualities := make(map[string]float64)

	for _, assignment := range assignments {
		// Include all participants, even if not completed
		// Incomplete assignments get quality score of 0
		participantID := assignment.ParticipantID.String()

		if !assignment.IsCompleted {
			qualities[participantID] = 0.0
			continue
		}

		participantVotes, err := vs.voteRepo.GetByVoterID(participantID)
		if err != nil {
			// If we can't get votes, assume quality of 0
			qualities[participantID] = 0.0
			continue
		}

		var eventVotes []*Vote
		for _, vote := range participantVotes {
			if vote.EventID == eventID {
				eventVotes = append(eventVotes, vote)
			}
		}

		// Skip if no votes found
		if len(eventVotes) == 0 {
			qualities[participantID] = 0.0
			continue
		}

		relativeRanks := vs.calculateRelativeRanks(assignment.GetAttachmentUUIDs(), globalRankMap)

		// Calculate quality score
		var deviationSum float64
		validVotes := 0
		for _, vote := range eventVotes {
			relativeRank, exists := relativeRanks[vote.AttachmentID]
			if exists {
				deviation := math.Abs(float64(vote.RankPosition - relativeRank))
				deviationSum += deviation
				validVotes++
			}
		}

		// If no valid votes, quality is 0
		if validVotes == 0 {
			qualities[participantID] = 0.0
			continue
		}

		// Q_i = 1 - (1/⌊m²/2⌋) * Σ|R_i(f_j) - RelativeRank_G(f_j, A(p_i))|
		quality := 1.0 - deviationSum/float64(maxRankDeviation(m))

		// Clamp quality to [0, 1] as a safety net (e.g. duplicated votes)
		if quality < 0 {
			quality = 0
		}
		if quality > 1 {
			quality = 1
		}

		qualities[participantID] = quality
	}

	return qualities, nil
}

// maxRankDeviation returns ⌊m²/2⌋, the largest Σ|R_i - RelativeRank| over m items:
// the deviation of a ranking that is the exact reverse of the consensus.
func maxRankDeviation(m int) int {
	return m * m / 2
}

// calculateRelativeRanks computes the relative ranking within a subset A(p_i)
func (vs *VotingService) calculateRelativeRanks(assignedAttachments []uuid.UUID, globalRankMap map[uuid.UUID]int) map[uuid.UUID]int {
	type attachmentRank struct {
		ID         uuid.UUID
		GlobalRank int
	}

	var attachmentRanks []attachmentRank
	for _, attachmentID := range assignedAttachments {
		if globalRank, exists := globalRankMap[attachmentID]; exists {
			attachmentRanks = append(attachmentRanks, attachmentRank{
				ID:         attachmentID,
				GlobalRank: globalRank,
			})
		}
	}

	sort.Slice(attachmentRanks, func(i, j int) bool {
		return attachmentRanks[i].GlobalRank < attachmentRanks[j].GlobalRank
	})

	relativeRanks := make(map[uuid.UUID]int)
	for i, ar := range attachmentRanks {
		relativeRanks[ar.ID] = i + 1
	}

	return relativeRanks
}

// applyIncentiveSystem implements the adjustment Δ(owner(f_j))
func (vs *VotingService) applyIncentiveSystem(results []AttachmentResult, qualities map[string]float64, config *VotingConfiguration) []AttachmentResult {
	adjustedResults := make([]AttachmentResult, len(results))
	copy(adjustedResults, results)

	for i := range adjustedResults {
		participantID := adjustedResults[i].ParticipantID.String()
		quality, exists := qualities[participantID]

		if !exists {
			adjustedResults[i].AdjustedRank = adjustedResults[i].GlobalRank
			continue
		}

		adjustment := 0
		if quality >= config.QualityGoodThreshold {
			// Good evaluator: bonus (negative adjustment improves rank)
			adjustment = -config.AdjustmentMagnitude
		} else if quality <= config.QualityBadThreshold {
			// Bad evaluator: penalty (positive adjustment worsens rank)
			adjustment = config.AdjustmentMagnitude
		}

		// Apply adjustment (with bounds checking)
		adjustedRank := min(max(adjustedResults[i].GlobalRank+adjustment, 1), len(results))

		adjustedResults[i].AdjustedRank = adjustedRank
	}

	// Sort by adjusted rank
	sort.Slice(adjustedResults, func(i, j int) bool {
		if adjustedResults[i].AdjustedRank == adjustedResults[j].AdjustedRank {
			// Tiebreaker: use MBC score
			return adjustedResults[i].MBCScore > adjustedResults[j].MBCScore
		}
		return adjustedResults[i].AdjustedRank < adjustedResults[j].AdjustedRank
	})

	// Reassign consecutive ranks after sorting
	for i := range adjustedResults {
		adjustedResults[i].AdjustedRank = i + 1
	}

	return adjustedResults
}

// hasConflictOfInterest checks if a participant has a conflict with an attachment
func (vs *VotingService) hasConflictOfInterest(participantID, attachmentID uuid.UUID) bool {
	attachment, err := vs.attachmentRepo.GetByID(attachmentID.String())
	if err != nil {
		return true // Err on the side of caution
	}

	return attachment.GetParticipantID() == participantID
}

// ValidateVotingConfiguration ensures the mathematical parameters are valid
func (vs *VotingService) ValidateVotingConfiguration(config *VotingConfiguration, totalAttachments, totalParticipants int) error {
	m := config.AttachmentsPerEvaluator
	k := totalAttachments
	n := totalParticipants

	if m <= 0 {
		return errors.New("attachments per evaluator must be positive")
	}

	minM, maxPossibleM, _ := VotingBounds(k)

	if m > maxPossibleM {
		return fmt.Errorf("attachments per evaluator cannot exceed %d (conflict of interest prevents evaluating own files)", maxPossibleM)
	}

	if config.QualityGoodThreshold <= config.QualityBadThreshold {
		return errors.New("good quality threshold must be higher than bad quality threshold")
	}
	if config.QualityGoodThreshold > 1.0 || config.QualityBadThreshold < 0.0 {
		return errors.New("quality thresholds must be in [0, 1] range")
	}

	if m < minM {
		return fmt.Errorf("recommended minimum m is %d for optimal convergence with %d attachments (max possible: %d)", minM, k, maxPossibleM)
	}

	totalEvaluations := n * m
	minRequiredEvaluations := k * config.MinEvaluationsPerFile
	if totalEvaluations < minRequiredEvaluations {
		return fmt.Errorf("insufficient total evaluations: need %d, have %d", minRequiredEvaluations, totalEvaluations)
	}

	return nil
}
