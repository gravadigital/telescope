package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/charmbracelet/log"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/config"
	"github.com/gravadigital/telescopio-api/internal/domain/attachment"
	"github.com/gravadigital/telescopio-api/internal/domain/event"
	"github.com/gravadigital/telescopio-api/internal/domain/vote"
	"github.com/gravadigital/telescopio-api/internal/logger"
	"github.com/gravadigital/telescopio-api/internal/storage/postgres"
)

type DistributedVoteHandler struct {
	voteRepo       postgres.VoteRepository
	eventRepo      postgres.EventRepository
	attachmentRepo postgres.AttachmentRepository
	userRepo       postgres.UserRepository
	configRepo     postgres.VotingConfigurationRepository
	resultsRepo    postgres.VotingResultsRepository
	votingService  *vote.VotingService
	config         *config.Config
	log            *log.Logger
}

func NewDistributedVoteHandler(
	voteRepo postgres.VoteRepository,
	eventRepo postgres.EventRepository,
	attachmentRepo postgres.AttachmentRepository,
	userRepo postgres.UserRepository,
	configRepo postgres.VotingConfigurationRepository,
	resultsRepo postgres.VotingResultsRepository,
	cfg *config.Config,
) *DistributedVoteHandler {
	// Create adapters to bridge interface differences
	voteAdapter := NewVoteRepositoryAdapter(voteRepo)
	attachmentAdapter := NewAttachmentRepositoryAdapter(attachmentRepo)
	userAdapter := NewUserRepositoryAdapter(userRepo)

	votingService := vote.NewVotingService(voteAdapter, attachmentAdapter, userAdapter)

	return &DistributedVoteHandler{
		voteRepo:       voteRepo,
		eventRepo:      eventRepo,
		attachmentRepo: attachmentRepo,
		userRepo:       userRepo,
		configRepo:     configRepo,
		resultsRepo:    resultsRepo,
		votingService:  votingService,
		config:         cfg,
		log:            logger.Handler("distributed_vote"),
	}
}

// minProposalsToVote is the number of proposals (and therefore evaluators)
// needed to open the voting stage.
const minProposalsToVote = 3

// VotingConfigRequest is the voting configuration the organizer sends. Optional
// fields are pointers so that an omitted value takes the default and an explicit
// zero is respected.
type VotingConfigRequest struct {
	AttachmentsPerEvaluator int      `json:"attachments_per_evaluator" binding:"required,min=1,max=50"`
	QualityGoodThreshold    *float64 `json:"quality_good_threshold" binding:"omitempty,min=0,max=1"`
	QualityBadThreshold     *float64 `json:"quality_bad_threshold" binding:"omitempty,min=0,max=1"`
	AdjustmentMagnitude     *int     `json:"adjustment_magnitude" binding:"omitempty,min=1,max=10"`
	MinEvaluationsPerFile   *int     `json:"min_evaluations_per_file" binding:"omitempty,min=1,max=20"`
}

func (r VotingConfigRequest) input() vote.ConfigInput {
	return vote.ConfigInput{
		AttachmentsPerEvaluator: r.AttachmentsPerEvaluator,
		QualityGoodThreshold:    r.QualityGoodThreshold,
		QualityBadThreshold:     r.QualityBadThreshold,
		AdjustmentMagnitude:     r.AdjustmentMagnitude,
		MinEvaluationsPerFile:   r.MinEvaluationsPerFile,
	}
}

func respondInsufficientProposals(c *gin.Context, count int) {
	c.JSON(http.StatusBadRequest, gin.H{
		"error":            "At least 3 participants with a proposal are required for voting",
		"code":             "INSUFFICIENT_ATTACHMENTS",
		"current_count":    count,
		"required_minimum": minProposalsToVote,
	})
}

// CreateVotingConfiguration handles POST /api/events/{event_id}/voting-config
func (h *DistributedVoteHandler) CreateVotingConfiguration(c *gin.Context) {
	eventID := c.Param("event_id")

	h.log.Debug("creating voting configuration", "event_id", eventID)

	// Validate required parameters
	if eventID == "" {
		h.log.Warn("missing event_id parameter")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "event_id is required",
			"code":  "MISSING_EVENT_ID",
		})
		return
	}

	// Validate UUID format
	eventUUID, err := uuid.Parse(eventID)
	if err != nil {
		h.log.Warn("invalid event_id format", "event_id", eventID, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid event_id format",
			"code":  "INVALID_EVENT_ID",
		})
		return
	}

	// Authorization handled by RequireEventOwnerOrOrganizer middleware
	// User is guaranteed to have permission to configure this event

	var req VotingConfigRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		h.log.Warn("invalid request payload", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request payload",
			"code":    "INVALID_PAYLOAD",
			"details": err.Error(),
		})
		return
	}

	// Check if event exists
	eventObj, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		h.log.Error("event not found", "event_id", eventID, "error", err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Event not found",
			"code":  "EVENT_NOT_FOUND",
		})
		return
	}

	// Authorization handled by RequireEventOwnerOrOrganizer middleware
	// User is guaranteed to have permission to configure this event

	// Only allow configuration during participation or voting stages
	// (after participants have uploaded files but before results are calculated)
	if eventObj.Stage != event.StageParticipation && eventObj.Stage != event.StageVoting {
		h.log.Warn("voting configuration attempt in wrong stage", "event_id", eventID, "current_stage", eventObj.Stage)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":         "Voting configuration can only be set during participation or voting stages",
			"code":          "INVALID_EVENT_STAGE",
			"current_stage": eventObj.Stage.String(),
		})
		return
	}

	// Check if configuration already exists
	existingConfig, err := h.configRepo.GetByEventID(eventID)
	if err == nil && existingConfig != nil {
		h.log.Warn("voting configuration already exists", "event_id", eventID, "existing_config_id", existingConfig.ID)
		c.JSON(http.StatusConflict, gin.H{
			"error": "Voting configuration already exists for this event",
			"code":  "CONFIG_EXISTS",
			"existing_config": gin.H{
				"id":         existingConfig.ID.String(),
				"created_at": existingConfig.CreatedAt,
			},
		})
		return
	}

	// Participants are only counted for the statistics; evaluators are the
	// owners of the proposals.
	participants, err := h.userRepo.GetEventParticipants(eventID)
	if err != nil {
		h.log.Error("failed to get participants", "event_id", eventID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get participants",
			"code":  "PARTICIPANTS_ERROR",
		})
		return
	}

	attachments, err := h.attachmentRepo.GetByEventID(eventID)
	if err != nil {
		h.log.Error("failed to get attachments", "event_id", eventID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get attachments",
			"code":  "ATTACHMENTS_ERROR",
		})
		return
	}

	if len(attachments) < minProposalsToVote {
		h.log.Warn("insufficient proposals for voting", "event_id", eventID, "attachment_count", len(attachments))
		respondInsufficientProposals(c, len(attachments))
		return
	}

	config, err := vote.BuildVotingConfiguration(eventUUID, req.input(), len(attachments))
	if err != nil {
		h.log.Warn("invalid voting configuration", "event_id", eventID, "error", err)
		respondVotingConfigError(c, err)
		return
	}
	config.CreatedAt = time.Now()

	maxPossibleAssignments := config.AttachmentsPerEvaluator * len(attachments)
	minRequiredAssignments := config.MinEvaluationsPerFile * len(attachments)

	// Save configuration
	if err := h.configRepo.Create(config); err != nil {
		h.log.Error("failed to save voting configuration", "event_id", eventID, "config_id", config.ID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to save voting configuration",
			"code":    "DB_SAVE_ERROR",
			"details": err.Error(),
		})
		return
	}

	h.log.Info("voting configuration created successfully",
		"event_id", eventID,
		"config_id", config.ID,
		"participants", len(participants),
		"attachments", len(attachments))

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"id":                        config.ID.String(),
			"event_id":                  eventID,
			"attachments_per_evaluator": config.AttachmentsPerEvaluator,
			"quality_good_threshold":    config.QualityGoodThreshold,
			"quality_bad_threshold":     config.QualityBadThreshold,
			"adjustment_magnitude":      config.AdjustmentMagnitude,
			"min_evaluations_per_file":  config.MinEvaluationsPerFile,
			"created_at":                config.CreatedAt,
		},
		"message": "Voting configuration created successfully",
		"code":    "CONFIG_CREATED",
		"statistics": gin.H{
			"participants_count": len(participants),
			"attachments_count":  len(attachments),
			"max_evaluations":    maxPossibleAssignments,
			"min_evaluations":    minRequiredAssignments,
		},
	})
}

// GenerateAssignments handles POST /api/events/{event_id}/generate-assignments
func (h *DistributedVoteHandler) GenerateAssignments(c *gin.Context) {
	eventID := c.Param("event_id")

	h.log.Debug("generating assignments", "event_id", eventID)

	// Validate required parameters
	if eventID == "" {
		h.log.Warn("missing event_id parameter")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "event_id is required",
			"code":  "MISSING_EVENT_ID",
		})
		return
	}

	// Validate UUID format
	eventUUID, err := uuid.Parse(eventID)
	if err != nil {
		h.log.Warn("invalid event_id format", "event_id", eventID, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid event_id format",
			"code":  "INVALID_EVENT_ID",
		})
		return
	}

	// Authorization handled by RequireEventOwnerOrOrganizer middleware
	// User is guaranteed to have permission to generate assignments

	// Check if event exists and is in voting stage
	eventObj, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		h.log.Error("event not found", "event_id", eventID, "error", err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Event not found",
			"code":  "EVENT_NOT_FOUND",
		})
		return
	}

	if eventObj.Stage != event.StageVoting {
		h.log.Warn("assignment generation attempt in wrong stage", "event_id", eventID, "current_stage", eventObj.Stage)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":         "Assignments can only be generated during voting stage",
			"code":          "INVALID_EVENT_STAGE",
			"current_stage": eventObj.Stage.String(),
		})
		return
	}

	// Check if assignments already exist
	existingAssignments, err := h.voteRepo.GetAssignmentsByEventID(eventID)
	if err == nil && len(existingAssignments) > 0 {
		h.log.Warn("assignments already exist", "event_id", eventID, "existing_count", len(existingAssignments))
		c.JSON(http.StatusConflict, gin.H{
			"error":                "Assignments already exist for this event",
			"code":                 "ASSIGNMENTS_EXIST",
			"existing_assignments": len(existingAssignments),
		})
		return
	}

	attachments, err := h.attachmentRepo.GetByEventID(eventID)
	if err != nil {
		h.log.Error("failed to get attachments", "event_id", eventID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get attachments",
			"code":  "ATTACHMENTS_ERROR",
		})
		return
	}

	if len(attachments) < minProposalsToVote {
		h.log.Warn("insufficient proposals for assignment generation", "event_id", eventID, "attachment_count", len(attachments))
		respondInsufficientProposals(c, len(attachments))
		return
	}

	// Evaluators are the participants who uploaded a proposal.
	participants := make([]uuid.UUID, len(attachments))
	attachmentIDs := make([]uuid.UUID, len(attachments))
	for i, a := range attachments {
		participants[i] = a.ParticipantID
		attachmentIDs[i] = a.ID
	}

	// Get voting configuration
	config, err := h.configRepo.GetByEventID(eventID)
	if err != nil {
		h.log.Error("voting configuration not found", "event_id", eventID, "error", err)
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Voting configuration not found for this event",
			"code":    "CONFIG_NOT_FOUND",
			"details": "Please create a voting configuration before generating assignments",
		})
		return
	}

	// Validate configuration is still valid with current data
	if err := h.votingService.ValidateVotingConfiguration(config, len(attachments), len(participants)); err != nil {
		h.log.Error("voting configuration is no longer valid", "event_id", eventID, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Voting configuration is no longer valid with current data",
			"code":    "CONFIG_INVALID",
			"details": err.Error(),
		})
		return
	}

	// Generate assignments
	h.log.Info("generating assignments",
		"event_id", eventID,
		"participants", len(participants),
		"attachments", len(attachmentIDs))

	assignments, err := h.votingService.GenerateAssignments(eventUUID, participants, attachmentIDs, config)
	if err != nil {
		h.log.Error("failed to generate assignments", "event_id", eventID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate assignments",
			"code":    "GENERATION_FAILED",
			"details": err.Error(),
		})
		return
	}

	// Save assignments to database
	savedCount := 0
	for _, assignment := range assignments {
		if err := h.voteRepo.CreateAssignment(assignment); err != nil {
			h.log.Error("failed to save assignment",
				"event_id", eventID,
				"assignment_id", assignment.ID,
				"participant_id", assignment.ParticipantID,
				"error", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to save assignment",
				"code":    "DB_SAVE_ERROR",
				"details": err.Error(),
			})
			return
		}
		savedCount++
	}

	h.log.Info("assignments generated and saved successfully",
		"event_id", eventID,
		"assignments_count", savedCount,
		"participants", len(participants),
		"attachments", len(attachmentIDs))

	// Calculate assignment statistics
	totalEvaluations := 0
	for _, assignment := range assignments {
		totalEvaluations += len(assignment.GetAttachmentUUIDs())
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"assignments_count":         len(assignments),
			"total_participants":        len(participants),
			"total_attachments":         len(attachmentIDs),
			"total_evaluations":         totalEvaluations,
			"attachments_per_evaluator": config.AttachmentsPerEvaluator,
		},
		"message": "Assignments generated successfully",
		"code":    "ASSIGNMENTS_GENERATED",
		"config": gin.H{
			"id":                        config.ID.String(),
			"attachments_per_evaluator": config.AttachmentsPerEvaluator,
			"min_evaluations_per_file":  config.MinEvaluationsPerFile,
		},
	})
}

// GetParticipantAssignment handles GET /api/events/{event_id}/participants/{participant_id}/assignment
func (h *DistributedVoteHandler) GetParticipantAssignment(c *gin.Context) {
	eventID := c.Param("event_id")
	participantID := c.Param("participant_id")

	if eventID == "" || participantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "event_id and participant_id are required"})
		return
	}

	// Check if event exists
	eventObj, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	// Assignments are readable while voting and, read-only, in results
	if eventObj.Stage != event.StageVoting && eventObj.Stage != event.StageResult {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":         "Assignments are only available during voting and results stages",
			"current_stage": eventObj.Stage.String(),
		})
		return
	}

	// Check if participant is registered for this event
	participantEvents, err := h.eventRepo.GetByParticipant(participantID)
	isParticipant := false
	if err == nil {
		for _, evt := range participantEvents {
			if evt.ID.String() == eventID {
				isParticipant = true
				break
			}
		}
	}

	if !isParticipant {
		c.JSON(http.StatusForbidden, gin.H{"error": "Participant is not registered for this event"})
		return
	}

	// Get assignment for this participant
	assignment, err := h.voteRepo.GetAssignmentByParticipant(eventID, participantID)
	if err != nil {
		if errors.Is(err, postgres.ErrAssignmentNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Participant has no assignment in this event",
				"code":  "NO_ASSIGNMENT",
			})
			return
		}
		h.log.Error("failed to retrieve assignment", "error", err, "event_id", eventID, "participant_id", participantID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve assignment",
			"code":  "RETRIEVAL_ERROR",
		})
		return
	}

	eventAttachments, err := h.attachmentRepo.GetByEventID(eventID)
	if err != nil {
		h.log.Error("failed to retrieve event attachments", "error", err, "event_id", eventID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve assignment",
			"code":  "RETRIEVAL_ERROR",
		})
		return
	}
	attachmentsByID := make(map[uuid.UUID]*attachment.Attachment, len(eventAttachments))
	for _, att := range eventAttachments {
		attachmentsByID[att.ID] = att
	}

	// The payload is built explicitly: it must never carry authorship (anonymous evaluation).
	items := make([]gin.H, 0, len(assignment.AttachmentIDs))
	for _, attachmentID := range assignment.GetAttachmentUUIDs() {
		att, ok := attachmentsByID[attachmentID]
		if !ok {
			h.log.Error("assigned attachment not found in event",
				"event_id", eventID, "assignment_id", assignment.ID, "attachment_id", attachmentID)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to retrieve assignment",
				"code":  "RETRIEVAL_ERROR",
			})
			return
		}
		position, _ := assignment.PositionOf(attachmentID)
		var description any
		if att.Description != "" {
			description = att.Description
		}
		items = append(items, gin.H{
			"id":          att.ID.String(),
			"label":       fmt.Sprintf("Propuesta %d", position),
			"mime_type":   att.MimeType,
			"file_size":   att.FileSize,
			"description": description,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"assignment": gin.H{
			"id":           assignment.ID.String(),
			"event_id":     assignment.EventID.String(),
			"is_completed": assignment.IsCompleted,
			"completed_at": assignment.CompletedAt,
			"attachments":  items,
		},
		"event_name":     eventObj.Name,
		"participant_id": participantID,
	})
}

// SubmitRankingVotes handles POST /api/events/{event_id}/participants/{participant_id}/ranking-votes
func (h *DistributedVoteHandler) SubmitRankingVotes(c *gin.Context) {
	eventID := c.Param("event_id")
	participantID := c.Param("participant_id")

	if eventID == "" || participantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "event_id and participant_id are required"})
		return
	}

	var req struct {
		AssignmentID string `json:"assignment_id" binding:"required"`
		Rankings     []struct {
			AttachmentID string `json:"attachment_id" binding:"required"`
			Rank         int    `json:"rank" binding:"required,min=1"`
		} `json:"rankings" binding:"required,dive"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request payload",
			"details": err.Error(),
		})
		return
	}

	// Check if event exists and is in voting stage
	eventObj, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	if eventObj.Stage != event.StageVoting {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":         "Voting is only allowed during voting stage",
			"current_stage": eventObj.Stage.String(),
		})
		return
	}

	// Check if participant is registered
	participantEvents, err := h.eventRepo.GetByParticipant(participantID)
	isParticipant := false
	if err == nil {
		for _, evt := range participantEvents {
			if evt.ID.String() == eventID {
				isParticipant = true
				break
			}
		}
	}

	if !isParticipant {
		c.JSON(http.StatusForbidden, gin.H{"error": "Participant is not registered for this event"})
		return
	}

	eventUUID, err := uuid.Parse(eventID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event_id or participant_id format"})
		return
	}
	participantUUID, err := uuid.Parse(participantID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event_id or participant_id format"})
		return
	}
	assignmentUUID, err := uuid.Parse(req.AssignmentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assignment_id format"})
		return
	}

	// Verify assignment belongs to participant and event
	assignment, err := h.voteRepo.GetAssignmentByParticipant(eventID, participantID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found for this participant"})
		return
	}

	if assignment.ID != assignmentUUID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Assignment ID does not match participant's assignment"})
		return
	}

	// Get assigned attachments to validate the vote
	assignedAttachments := assignment.GetAttachmentUUIDs()
	assignedMap := make(map[uuid.UUID]bool)
	for _, attachmentID := range assignedAttachments {
		assignedMap[attachmentID] = true
	}

	// Validate rankings (should be consecutive integers starting from 1)
	rankSet := make(map[int]bool)
	for _, ranking := range req.Rankings {
		if rankSet[ranking.Rank] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Duplicate rank found"})
			return
		}
		rankSet[ranking.Rank] = true
	}

	// Check that ranks form a complete sequence
	for i := 1; i <= len(req.Rankings); i++ {
		if !rankSet[i] {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Rankings must be consecutive integers starting from 1",
			})
			return
		}
	}

	// Create vote records
	var votes []*vote.Vote
	for _, ranking := range req.Rankings {
		attachmentUUID, err := uuid.Parse(ranking.AttachmentID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid attachment_id format: " + ranking.AttachmentID,
			})
			return
		}

		// Check if attachment is in participant's assignment
		if !assignedMap[attachmentUUID] {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Attachment is not assigned to this participant: " + ranking.AttachmentID,
			})
			return
		}

		// Check if attachment exists and belongs to this event
		attachment, err := h.attachmentRepo.GetByID(ranking.AttachmentID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Attachment not found: " + ranking.AttachmentID,
			})
			return
		}

		if attachment.EventID != eventUUID {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Attachment does not belong to this event: " + ranking.AttachmentID,
			})
			return
		}

		vote := &vote.Vote{
			ID:           uuid.New(),
			EventID:      eventUUID,
			AssignmentID: assignmentUUID,
			VoterID:      participantUUID,
			AttachmentID: attachmentUUID,
			RankPosition: ranking.Rank,
		}
		votes = append(votes, vote)
	}

	// Replace the previous ranking (if any) atomically; triggers keep is_completed and vote_count.
	replaced, err := h.voteRepo.ReplaceAssignmentVotes(assignment.ID.String(), votes)
	if err != nil {
		h.log.Error("failed to save ranking votes",
			"error", err,
			"event_id", eventID,
			"participant_id", participantID,
			"assignment_id", assignment.ID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save votes"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":        "Ranking votes submitted successfully",
		"event_id":       eventID,
		"participant_id": participantID,
		"votes_count":    len(votes),
		"replaced":       replaced,
	})
}

// GetDistributedResults handles GET /api/events/{event_id}/distributed-results
// calculateAndPersist computes the MBC ranking, fills in participant names and
// upserts the row in voting_results. The names are stored together with the
// ranking, so read-only consumers can serve them straight from the table.
func (h *DistributedVoteHandler) calculateAndPersist(eventID string, eventUUID uuid.UUID, config *vote.VotingConfiguration) (*vote.VotingResults, error) {
	results, err := h.votingService.CalculateModifiedBordaCount(eventUUID, config)
	if err != nil {
		return nil, err
	}

	// Populate participant names for each attachment
	participantNames := make(map[string]string)
	for i := range results.GlobalRanking {
		participantID := results.GlobalRanking[i].ParticipantID.String()

		if name, found := participantNames[participantID]; found {
			results.GlobalRanking[i].ParticipantName = name
		} else {
			participant, err := h.userRepo.GetByID(participantID)
			if err == nil && participant != nil {
				participantNames[participantID] = participant.Name
				results.GlobalRanking[i].ParticipantName = participant.Name
			}
		}
	}

	for i := range results.AdjustedRanking {
		participantID := results.AdjustedRanking[i].ParticipantID.String()
		if name, found := participantNames[participantID]; found {
			results.AdjustedRanking[i].ParticipantName = name
		}
	}

	// Upsert: results are recalculated whenever they are requested (defect D-11)
	existingResults, err := h.resultsRepo.GetByEventID(eventID)
	if err != nil || existingResults == nil {
		if err := h.resultsRepo.Create(results); err != nil {
			return nil, fmt.Errorf("failed to save results: %w", err)
		}
	} else {
		results.ID = existingResults.ID
		if err := h.resultsRepo.Update(results); err != nil {
			return nil, fmt.Errorf("failed to update results: %w", err)
		}
	}

	return results, nil
}

// CalculateAndPersistResults recalculates and stores the ranking for an event.
// It is called when the organizer moves the event into the results stage, so
// anonymous visitors can read the stored results without triggering a
// recalculation (the public endpoint is read-only).
func (h *DistributedVoteHandler) CalculateAndPersistResults(eventID string) error {
	eventUUID, err := uuid.Parse(eventID)
	if err != nil {
		return fmt.Errorf("invalid event_id format: %w", err)
	}

	eventObj, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		return fmt.Errorf("event not found: %w", err)
	}
	if eventObj.Stage != event.StageVoting && eventObj.Stage != event.StageResult {
		return fmt.Errorf("results can only be calculated during voting or results stage (current: %s)", eventObj.Stage.String())
	}

	config, err := h.configRepo.GetByEventID(eventID)
	if err != nil {
		return fmt.Errorf("voting configuration not found: %w", err)
	}

	_, err = h.calculateAndPersist(eventID, eventUUID, config)
	return err
}

// GetStoredResults handles GET /api/events/{event_id}/distributed-results
// Read-only counterpart of GetDistributedResults: it returns the ranking that
// was stored when the event entered the results stage and never recalculates,
// which is what makes it safe to expose without authentication.
func (h *DistributedVoteHandler) GetStoredResults(c *gin.Context) {
	eventID := c.Param("event_id")
	if eventID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "event_id is required"})
		return
	}
	if _, err := uuid.Parse(eventID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid event_id format"})
		return
	}

	eventObj, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}
	if eventObj.Stage != event.StageVoting && eventObj.Stage != event.StageResult {
		c.JSON(http.StatusForbidden, gin.H{
			"error":         "Results can only be viewed during voting or results stage",
			"current_stage": eventObj.Stage.String(),
		})
		return
	}

	results, err := h.resultsRepo.GetByEventID(eventID)
	if err != nil || results == nil {
		// Nothing stored yet: the event entered the results stage before this
		// calculation existed, or a recalculate is still pending.
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "RESULTS_NOT_CALCULATED",
			"message": "Results have not been calculated yet for this event",
		})
		return
	}

	resultData := gin.H{
		"id":                        results.ID.String(),
		"event_id":                  results.EventID.String(),
		"global_ranking":            results.GlobalRanking,
		"adjusted_ranking":          results.AdjustedRanking,
		"participant_qualities":     results.ParticipantQualities,
		"total_participants":        results.TotalParticipants,
		"total_votes":               results.TotalVotes,
		"attachments_per_evaluator": results.AttachmentsPerEvaluator,
		"calculated_at":             results.CalculatedAt,
		"updated_at":                results.UpdatedAt,
	}

	if c.Query("include_metrics") == "true" {
		if config, err := h.configRepo.GetByEventID(eventID); err == nil && config != nil {
			resultData["configuration"] = config
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": resultData})
}

func (h *DistributedVoteHandler) GetDistributedResults(c *gin.Context) {
	eventID := c.Param("event_id")
	if eventID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "event_id is required"})
		return
	}

	eventUUID, err := uuid.Parse(eventID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid event_id format"})
		return
	}

	// Check if event exists
	eventObj, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	// Check if event is in voting or results stage
	if eventObj.Stage != event.StageVoting && eventObj.Stage != event.StageResult {
		c.JSON(http.StatusForbidden, gin.H{
			"error":         "Results can only be viewed during voting or results stage",
			"current_stage": eventObj.Stage.String(),
		})
		return
	}

	// Get voting configuration
	config, err := h.configRepo.GetByEventID(eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Voting configuration not found",
			"details": "Please create a voting configuration before calculating results",
		})
		return
	}

	// Calculate Modified Borda Count results, fill participant names and upsert
	results, err := h.calculateAndPersist(eventID, eventUUID, config)
	if err != nil {
		h.log.Error("failed to calculate or save voting results", "event_id", eventID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to calculate results",
			"details": err.Error(),
		})
		return
	}

	// Get additional metrics
	includeMetrics := c.Query("include_metrics") == "true"

	// Build complete response matching VotingResults structure
	resultData := gin.H{
		"id":                        results.ID.String(),
		"event_id":                  results.EventID.String(),
		"global_ranking":            results.GlobalRanking,
		"adjusted_ranking":          results.AdjustedRanking,
		"participant_qualities":     results.ParticipantQualities,
		"total_participants":        results.TotalParticipants,
		"total_votes":               results.TotalVotes,
		"attachments_per_evaluator": results.AttachmentsPerEvaluator,
		"calculated_at":             results.CalculatedAt,
		"updated_at":                results.UpdatedAt,
	}

	if includeMetrics {
		resultData["configuration"] = config
	}

	// Wrap in {data: ...} structure for frontend consistency
	c.JSON(http.StatusOK, gin.H{
		"data": resultData,
	})
}

// GetVotingStatistics handles GET /api/events/{event_id}/voting-statistics
func (h *DistributedVoteHandler) GetVotingStatistics(c *gin.Context) {
	eventID := c.Param("event_id")
	if eventID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "event_id is required"})
		return
	}

	// Get basic voting statistics
	votes, err := h.voteRepo.GetByEventID(eventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get votes"})
		return
	}

	// Get assignments to calculate accurate completion statistics
	assignments, err := h.voteRepo.GetAssignmentsByEventID(eventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get assignments"})
		return
	}

	// Calculate comprehensive statistics
	totalVotes := len(votes)
	participantVotes := make(map[uuid.UUID]int)
	attachmentVotes := make(map[uuid.UUID]int)

	for _, vote := range votes {
		participantVotes[vote.VoterID]++
		attachmentVotes[vote.AttachmentID]++
	}

	// Count completed assignments
	totalAssignments := len(assignments)
	completedAssignments := 0
	qualitySum := 0.0
	goodQualityCount := 0
	badQualityCount := 0

	for _, assignment := range assignments {
		if assignment.IsCompleted {
			completedAssignments++

			// Include quality metrics if available
			if assignment.QualityScore != nil {
				qualitySum += *assignment.QualityScore
				if *assignment.QualityScore >= 0.7 { // Good quality threshold
					goodQualityCount++
				} else if *assignment.QualityScore <= 0.3 { // Bad quality threshold
					badQualityCount++
				}
			}
		}
	}

	// Calculate rates
	completionRate := 0.0
	if totalAssignments > 0 {
		completionRate = float64(completedAssignments) / float64(totalAssignments)
	}

	averageQuality := 0.0
	if completedAssignments > 0 {
		averageQuality = qualitySum / float64(completedAssignments)
	}

	// Wrap response in {data: ...} for frontend consistency
	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"event_id":                       eventID,
			"total_votes":                    totalVotes,
			"total_assignments":              totalAssignments,
			"completed_assignments":          completedAssignments,
			"completion_rate":                completionRate,
			"attachments_with_votes":         len(attachmentVotes),
			"unique_voters":                  len(participantVotes),
			"average_quality_score":          averageQuality,
			"participants_with_good_quality": goodQualityCount,
			"participants_with_bad_quality":  badQualityCount,
			"participant_voting_status":      participantVotingStatus(assignments),
		},
	})
}

// Helper function to get participant voting status
func participantVotingStatus(assignments []*vote.Assignment) map[string]bool {
	status := make(map[string]bool)
	for _, assignment := range assignments {
		status[assignment.ParticipantID.String()] = assignment.IsCompleted
	}
	return status
}

// GetVotingConfiguration handles GET /api/events/{event_id}/voting-config
func (h *DistributedVoteHandler) GetVotingConfiguration(c *gin.Context) {
	eventID := c.Param("event_id")

	h.log.Debug("retrieving voting configuration", "event_id", eventID)

	if eventID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "event_id is required",
			"code":  "MISSING_EVENT_ID",
		})
		return
	}

	// Get voting configuration
	config, err := h.configRepo.GetByEventID(eventID)
	if err != nil {
		h.log.Error("voting configuration not found", "event_id", eventID, "error", err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Voting configuration not found for this event",
			"code":  "CONFIG_NOT_FOUND",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":                        config.ID.String(),
			"event_id":                  config.EventID.String(),
			"attachments_per_evaluator": config.AttachmentsPerEvaluator,
			"quality_good_threshold":    config.QualityGoodThreshold,
			"quality_bad_threshold":     config.QualityBadThreshold,
			"adjustment_magnitude":      config.AdjustmentMagnitude,
			"min_evaluations_per_file":  config.MinEvaluationsPerFile,
			"created_at":                config.CreatedAt,
		},
	})
}

// UpdateVotingConfiguration handles PUT /api/events/{event_id}/voting-config
func (h *DistributedVoteHandler) UpdateVotingConfiguration(c *gin.Context) {
	eventID := c.Param("event_id")

	h.log.Debug("updating voting configuration", "event_id", eventID)

	if eventID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "event_id is required",
			"code":  "MISSING_EVENT_ID",
		})
		return
	}

	// Check if event exists and is still configurable
	eventObj, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Event not found",
			"code":  "EVENT_NOT_FOUND",
		})
		return
	}

	// Allow updates during participation or voting stages (before assignments are generated)
	// Same stages allowed for creation
	if eventObj.Stage != event.StageParticipation && eventObj.Stage != event.StageVoting {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":         "Voting configuration can only be updated during participation or voting stages",
			"code":          "INVALID_EVENT_STAGE",
			"current_stage": eventObj.Stage.String(),
		})
		return
	}

	// Check if assignments have already been generated
	existingAssignments, err := h.voteRepo.GetAssignmentsByEventID(eventID)
	if err == nil && len(existingAssignments) > 0 {
		h.log.Warn("cannot update config, assignments already generated", "event_id", eventID)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Cannot update voting configuration after assignments have been generated",
			"code":    "ASSIGNMENTS_EXIST",
			"details": "Delete existing assignments before updating configuration",
		})
		return
	}

	// Get existing configuration
	config, err := h.configRepo.GetByEventID(eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Voting configuration not found for this event",
			"code":  "CONFIG_NOT_FOUND",
		})
		return
	}

	var req struct {
		AttachmentsPerEvaluator int     `json:"attachments_per_evaluator" binding:"required,min=1,max=50"`
		QualityGoodThreshold    float64 `json:"quality_good_threshold" binding:"min=0,max=1"`
		QualityBadThreshold     float64 `json:"quality_bad_threshold" binding:"min=0,max=1"`
		AdjustmentMagnitude     int     `json:"adjustment_magnitude" binding:"min=1,max=10"`
		MinEvaluationsPerFile   int     `json:"min_evaluations_per_file" binding:"min=1,max=20"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request payload",
			"code":    "INVALID_PAYLOAD",
			"details": err.Error(),
		})
		return
	}

	// Update configuration
	config.AttachmentsPerEvaluator = req.AttachmentsPerEvaluator
	config.QualityGoodThreshold = req.QualityGoodThreshold
	config.QualityBadThreshold = req.QualityBadThreshold
	config.AdjustmentMagnitude = req.AdjustmentMagnitude
	config.MinEvaluationsPerFile = req.MinEvaluationsPerFile

	// Re-validate configuration
	participants, _ := h.userRepo.GetEventParticipants(eventID)
	attachments, _ := h.attachmentRepo.GetByEventID(eventID)

	if err := h.votingService.ValidateVotingConfiguration(config, len(attachments), len(participants)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid voting configuration",
			"code":    "VALIDATION_FAILED",
			"details": err.Error(),
		})
		return
	}

	// Save updated configuration
	if err := h.configRepo.Update(config); err != nil {
		h.log.Error("failed to update voting configuration", "event_id", eventID, "config_id", config.ID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update voting configuration",
			"code":  "DB_UPDATE_ERROR",
		})
		return
	}

	h.log.Info("voting configuration updated successfully", "event_id", eventID, "config_id", config.ID)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":                        config.ID.String(),
			"event_id":                  config.EventID.String(),
			"attachments_per_evaluator": config.AttachmentsPerEvaluator,
			"quality_good_threshold":    config.QualityGoodThreshold,
			"quality_bad_threshold":     config.QualityBadThreshold,
			"adjustment_magnitude":      config.AdjustmentMagnitude,
			"min_evaluations_per_file":  config.MinEvaluationsPerFile,
			"updated_at":                time.Now(),
		},
		"message": "Voting configuration updated successfully",
		"code":    "CONFIG_UPDATED",
	})
}

// DeleteVotingConfiguration handles DELETE /api/events/{event_id}/voting-config
func (h *DistributedVoteHandler) DeleteVotingConfiguration(c *gin.Context) {
	eventID := c.Param("event_id")

	h.log.Debug("deleting voting configuration", "event_id", eventID)

	if eventID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "event_id is required",
			"code":  "MISSING_EVENT_ID",
		})
		return
	}

	// Check if event exists
	eventObj, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Event not found",
			"code":  "EVENT_NOT_FOUND",
		})
		return
	}

	// Check if assignments have been generated - cannot delete if they exist
	existingAssignments, err := h.voteRepo.GetAssignmentsByEventID(eventID)
	if err == nil && len(existingAssignments) > 0 {
		h.log.Warn("cannot delete config, assignments already generated",
			"event_id", eventID,
			"assignments_count", len(existingAssignments))
		c.JSON(http.StatusBadRequest, gin.H{
			"error":             "Cannot delete voting configuration after assignments have been generated",
			"code":              "ASSIGNMENTS_EXIST",
			"details":           fmt.Sprintf("Found %d existing assignments. Delete assignments first if you need to reconfigure.", len(existingAssignments)),
			"assignments_count": len(existingAssignments),
		})
		return
	}

	// Allow deletion in participation or voting stages (before assignments are generated)
	// More flexible than before - was only registration stage
	if eventObj.Stage != event.StageParticipation && eventObj.Stage != event.StageVoting {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":          "Voting configuration can only be deleted during participation or voting stages (before assignments are generated)",
			"code":           "INVALID_EVENT_STAGE",
			"current_stage":  eventObj.Stage.String(),
			"allowed_stages": []string{"participation", "voting"},
		})
		return
	}

	// Check if configuration exists
	existingConfig, err := h.configRepo.GetByEventID(eventID)
	if err != nil || existingConfig == nil {
		h.log.Warn("voting configuration not found for deletion", "event_id", eventID)
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Voting configuration not found for this event",
			"code":  "CONFIG_NOT_FOUND",
		})
		return
	}

	// Delete configuration
	if err := h.configRepo.Delete(eventID); err != nil {
		h.log.Error("failed to delete voting configuration", "event_id", eventID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete voting configuration",
			"code":  "DB_DELETE_ERROR",
		})
		return
	}

	h.log.Info("voting configuration deleted successfully",
		"event_id", eventID,
		"config_id", existingConfig.ID,
		"stage", eventObj.Stage.String())

	c.JSON(http.StatusOK, gin.H{
		"message": "Voting configuration deleted successfully. You can now create a new configuration.",
		"code":    "CONFIG_DELETED",
		"deleted_config": gin.H{
			"id":                        existingConfig.ID.String(),
			"attachments_per_evaluator": existingConfig.AttachmentsPerEvaluator,
		},
	})
}

// PreviewVotingConfiguration handles GET /api/v1/events/{event_id}/voting-config/preview
// It uses the same bounds that validate the opening of the voting stage, so the
// client does not have to recompute m.
func (h *DistributedVoteHandler) PreviewVotingConfiguration(c *gin.Context) {
	eventID := c.Param("event_id")

	h.log.Debug("previewing voting configuration", "event_id", eventID)

	if eventID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "event_id is required",
			"code":  "MISSING_EVENT_ID",
		})
		return
	}

	if _, err := uuid.Parse(eventID); err != nil {
		h.log.Warn("invalid event_id format", "event_id", eventID, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid event_id format",
			"code":  "INVALID_EVENT_ID",
		})
		return
	}

	if _, err := h.eventRepo.GetByID(eventID); err != nil {
		h.log.Error("event not found", "event_id", eventID, "error", err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Event not found",
			"code":  "EVENT_NOT_FOUND",
		})
		return
	}

	participants, err := h.userRepo.GetEventParticipants(eventID)
	if err != nil {
		h.log.Error("failed to get participants", "event_id", eventID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get participants",
			"code":  "PARTICIPANTS_ERROR",
		})
		return
	}

	attachments, err := h.attachmentRepo.GetByEventID(eventID)
	if err != nil {
		h.log.Error("failed to get attachments", "event_id", eventID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get attachments",
			"code":  "ATTACHMENTS_ERROR",
		})
		return
	}

	k := len(attachments)
	minM, maxM, recommendedM := vote.VotingBounds(k)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"participants_count":         len(participants),
			"participants_with_proposal": k,
			"can_open_voting":            k >= minProposalsToVote,
			"min_m":                      minM,
			"max_m":                      maxM,
			"recommended_m":              recommendedM,
			"defaults": gin.H{
				"quality_good_threshold": vote.DefaultQualityGoodThreshold,
				"quality_bad_threshold":  vote.DefaultQualityBadThreshold,
				"adjustment_magnitude":   vote.DefaultAdjustmentMagnitude,
			},
		},
	})
}
