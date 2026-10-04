package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/charmbracelet/log"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/config"
	"github.com/gravadigital/telescopio-api/internal/domain/event"
	"github.com/gravadigital/telescopio-api/internal/domain/notification"
	"github.com/gravadigital/telescopio-api/internal/domain/participant"
	"github.com/gravadigital/telescopio-api/internal/domain/vote"
	"github.com/gravadigital/telescopio-api/internal/email"
	"github.com/gravadigital/telescopio-api/internal/logger"
	"github.com/gravadigital/telescopio-api/internal/storage/postgres"
)

type EventHandler struct {
	eventRepo      postgres.EventRepository
	userRepo       postgres.UserRepository
	attachmentRepo postgres.AttachmentRepository
	voteRepo       postgres.VoteRepository
	// votingSetupRepo writes the stage change, configuration and assignments of
	// the participation → voting transition in one transaction.
	votingSetupRepo postgres.VotingSetupRepository
	votingService   *vote.VotingService
	emailService    *email.EmailService
	// voteHandler recalculates and stores the ranking when the event enters
	// the results stage; may be nil in tests that never reach that stage.
	voteHandler *DistributedVoteHandler
	// notifier emits in-app notifications, best effort (ADR-009); may be nil.
	notifier *notification.Service
	config   *config.Config
	log      *log.Logger
}

func NewEventHandler(eventRepo postgres.EventRepository, userRepo postgres.UserRepository, attachmentRepo postgres.AttachmentRepository, voteRepo postgres.VoteRepository, votingSetupRepo postgres.VotingSetupRepository, emailService *email.EmailService, voteHandler *DistributedVoteHandler, cfg *config.Config, notifier *notification.Service) *EventHandler {
	votingService := vote.NewVotingService(
		NewVoteRepositoryAdapter(voteRepo),
		NewAttachmentRepositoryAdapter(attachmentRepo),
		NewUserRepositoryAdapter(userRepo),
	)

	return &EventHandler{
		eventRepo:       eventRepo,
		userRepo:        userRepo,
		attachmentRepo:  attachmentRepo,
		voteRepo:        voteRepo,
		votingSetupRepo: votingSetupRepo,
		votingService:   votingService,
		emailService:    emailService,
		voteHandler:     voteHandler,
		notifier:        notifier,
		config:          cfg,
		log:             logger.Handler("event"),
	}
}

// SendReminderRequest is the body of POST /events/{event_id}/reminders.
type SendReminderRequest struct {
	Type string `json:"type" binding:"required,oneof=file vote"`
}

// SendReminder handles POST /api/v1/events/{event_id}/reminders: the organizer reminds the
// participants who still owe a proposal (file, participation) or a ranking (vote, voting).
func (h *EventHandler) SendReminder(c *gin.Context) {
	eventID := c.Param("event_id")
	eventUUID, err := uuid.Parse(eventID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event_id format", "code": "INVALID_EVENT_ID"})
		return
	}

	var req SendReminderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.log.Warn("invalid request payload for reminder", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request payload",
			"code":    "INVALID_PAYLOAD",
			"details": err.Error(),
		})
		return
	}

	evt, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found", "code": "EVENT_NOT_FOUND"})
		return
	}

	if evt.IsPaused || evt.IsCancelled {
		c.JSON(http.StatusConflict, gin.H{"error": "Event is paused or cancelled", "code": "EVENT_PAUSED_OR_CANCELLED"})
		return
	}

	wantStage, notificationType, deadlineDate := event.StageParticipation, notification.TypeFileReminder, evt.ParticipationEstimatedEndDate
	if req.Type == "vote" {
		wantStage, notificationType, deadlineDate = event.StageVoting, notification.TypeVoteReminder, evt.VotingEstimatedEndDate
	}
	if evt.Stage != wantStage {
		c.JSON(http.StatusConflict, gin.H{
			"error":         "Reminder type does not match the event stage",
			"code":          "INVALID_EVENT_STAGE",
			"current_stage": evt.Stage.String(),
		})
		return
	}

	pending, err := h.pendingRecipients(eventID, req.Type)
	if err != nil {
		h.log.Error("failed to compute pending recipients", "event_id", eventID, "type", req.Type, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve pending participants", "code": "RETRIEVAL_ERROR"})
		return
	}
	if len(pending) == 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "There are no pending recipients", "code": "NO_PENDING_RECIPIENTS"})
		return
	}

	ids := make([]uuid.UUID, 0, len(pending))
	emails := make([]string, 0, len(pending))
	for _, p := range pending {
		ids = append(ids, p.ID)
		emails = append(emails, p.Email)
	}
	deadline := formatDatePtr(deadlineDate)
	h.notify(eventUUID, notificationType, ids, func(uuid.UUID) notification.Data {
		return notification.Data{"deadline": deadline}
	})

	deadlineText, _ := deadline.(string)
	eventName := evt.Name
	go func() {
		var err error
		if req.Type == "file" {
			err = h.emailService.SendFileReminder(eventName, deadlineText, emails)
		} else {
			err = h.emailService.SendVoteReminder(eventName, deadlineText, emails)
		}
		if err != nil {
			h.log.Warn("failed to send reminder emails", "event_id", eventID, "type", req.Type, "error", err)
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"data":    gin.H{"type": req.Type, "recipients_count": len(pending)},
		"message": "Reminder sent successfully",
		"code":    "REMINDER_SENT",
	})
}

// pendingRecipients returns the registered participants who still have no proposal (file)
// or whose assignment is not completed (vote).
func (h *EventHandler) pendingRecipients(eventID, reminderType string) ([]*participant.UserWithEventRole, error) {
	participants, err := h.userRepo.GetEventParticipants(eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to get participants: %w", err)
	}

	if reminderType == "file" {
		attachments, err := h.attachmentRepo.GetByEventID(eventID)
		if err != nil {
			return nil, fmt.Errorf("failed to get attachments: %w", err)
		}
		uploaded := make(map[uuid.UUID]bool, len(attachments))
		for _, a := range attachments {
			uploaded[a.ParticipantID] = true
		}
		pending := make([]*participant.UserWithEventRole, 0, len(participants))
		for _, p := range participants {
			if !uploaded[p.ID] {
				pending = append(pending, p)
			}
		}
		return pending, nil
	}

	assignments, err := h.voteRepo.GetAssignmentsByEventID(eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to get assignments: %w", err)
	}
	byID := make(map[uuid.UUID]*participant.UserWithEventRole, len(participants))
	for _, p := range participants {
		byID[p.ID] = p
	}
	pending := make([]*participant.UserWithEventRole, 0, len(assignments))
	for _, a := range assignments {
		if a.IsCompleted {
			continue
		}
		p, ok := byID[a.ParticipantID]
		if !ok {
			h.log.Warn("assignment participant is not a registered participant", "event_id", eventID, "participant_id", a.ParticipantID)
			continue
		}
		pending = append(pending, p)
	}
	return pending, nil
}

// notify emits in-app notifications; a failure is logged and never reaches the response.
func (h *EventHandler) notify(eventID uuid.UUID, t notification.Type, recipients []uuid.UUID, dataFor func(uuid.UUID) notification.Data) {
	if h.notifier == nil {
		return
	}
	if err := h.notifier.Send(eventID, t, recipients, dataFor); err != nil {
		h.log.Warn("failed to create notifications", "event_id", eventID, "type", t, "error", err)
	}
}

// participantIDs returns the ids of the event's registered participants (author excluded).
func (h *EventHandler) participantIDs(eventID string) ([]uuid.UUID, bool) {
	participants, err := h.userRepo.GetEventParticipants(eventID)
	if err != nil {
		h.log.Warn("failed to get participants for notifications", "event_id", eventID, "error", err)
		return nil, false
	}
	ids := make([]uuid.UUID, 0, len(participants))
	for _, p := range participants {
		ids = append(ids, p.ID)
	}
	return ids, true
}

type CreateEventRequest struct {
	Name            string `json:"name" binding:"required,min=3,max=200"`
	Description     string `json:"description" binding:"required,min=10,max=2000"`
	StartDate       string `json:"start_date" binding:"required"`
	EndDate         string `json:"end_date" binding:"required"`
	Organizer       string `json:"organizer"`
	AuthorID        string `json:"author_id"`        // Optional: if provided, use this as author_id
	MaxParticipants *int   `json:"max_participants"` // Optional: if provided, use this limit (default: 20)
}

// CreateEvent handles POST /api/events
// Requires JWT authentication (middleware enforced)
func (h *EventHandler) CreateEvent(c *gin.Context) {
	h.log.Debug("received create event request")

	// Get authenticated user ID from JWT middleware context
	userIDStr, exists := c.Get("user_id")
	if !exists {
		h.log.Warn("unauthenticated create event attempt")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
			"code":  "UNAUTHORIZED",
		})
		return
	}

	var req CreateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.log.Error("invalid request payload for create event", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request payload",
			"code":    "INVALID_PAYLOAD",
			"details": err.Error(),
		})
		return
	}

	// Parse and validate dates
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		h.log.Warn("invalid start_date format", "start_date", req.StartDate, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid start_date format",
			"code":    "INVALID_START_DATE",
			"details": "Expected format: YYYY-MM-DD",
		})
		return
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		h.log.Warn("invalid end_date format", "end_date", req.EndDate, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid end_date format",
			"code":    "INVALID_END_DATE",
			"details": "Expected format: YYYY-MM-DD",
		})
		return
	}

	// Business validation for dates
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	if startDate.Before(today) {
		h.log.Warn("start_date is in the past", "start_date", req.StartDate)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Start date cannot be in the past",
			"code":  "PAST_START_DATE",
		})
		return
	}

	if endDate.Before(startDate) {
		h.log.Warn("end_date before start_date", "start_date", req.StartDate, "end_date", req.EndDate)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "End date must be after start date",
			"code":  "INVALID_DATE_RANGE",
		})
		return
	}

	// Validate event duration (minimum 1 day, maximum 1 year)
	duration := endDate.Sub(startDate)
	minDuration := 24 * time.Hour
	maxDuration := 365 * 24 * time.Hour

	if duration < minDuration {
		h.log.Warn("event duration too short", "duration", duration)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Event duration must be at least 1 day",
			"code":  "DURATION_TOO_SHORT",
		})
		return
	}

	if duration > maxDuration {
		h.log.Warn("event duration too long", "duration", duration)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Event duration cannot exceed 1 year",
			"code":  "DURATION_TOO_LONG",
		})
		return
	}

	// Use authenticated user as the event author
	authorID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		h.log.Error("invalid user_id from JWT token", "user_id", userIDStr, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Invalid authentication token",
			"code":  "INVALID_TOKEN",
		})
		return
	}

	// Verify user exists in database
	user, err := h.userRepo.GetByID(authorID.String())
	if err != nil {
		h.log.Error("authenticated user not found in database", "user_id", authorID, "error", err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User account not found",
			"code":  "USER_NOT_FOUND",
		})
		return
	}

	h.log.Debug("creating event for authenticated user", "author_id", authorID, "author_name", user.Name)

	// Check for duplicate event names (optional business rule)
	existingEvents, err := h.eventRepo.GetAll()
	if err == nil {
		for _, existingEvent := range existingEvents {
			if existingEvent.Name == req.Name {
				h.log.Warn("duplicate event name", "event_name", req.Name)
				c.JSON(http.StatusConflict, gin.H{
					"error": "An event with this name already exists",
					"code":  "DUPLICATE_EVENT_NAME",
				})
				return
			}
		}
	}

	newEvent := event.NewEvent(req.Name, req.Description, authorID, startDate, endDate, req.Organizer)

	// Set custom max_participants if provided, otherwise use default (20)
	if req.MaxParticipants != nil {
		if *req.MaxParticipants < 1 {
			h.log.Warn("invalid max_participants value", "value", *req.MaxParticipants)
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "max_participants must be at least 1",
				"code":    "INVALID_MAX_PARTICIPANTS",
				"details": "Please provide a positive number",
			})
			return
		}
		if *req.MaxParticipants > 100 {
			h.log.Warn("max_participants exceeds system limit", "value", *req.MaxParticipants)
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "max_participants cannot exceed 100",
				"code":    "MAX_PARTICIPANTS_LIMIT_EXCEEDED",
				"details": "System limit is 100 participants per event",
			})
			return
		}
		newEvent.MaxParticipants = req.MaxParticipants
		h.log.Debug("using custom max_participants", "value", *req.MaxParticipants)
	} // Validate the event domain entity
	if err := newEvent.Validate(); err != nil {
		h.log.Error("event validation failed", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Event validation failed",
			"code":    "VALIDATION_FAILED",
			"details": err.Error(),
		})
		return
	}

	if err := h.eventRepo.Create(newEvent); err != nil {
		h.log.Error("failed to create event", "error", err, "event_name", req.Name)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create event",
			"code":  "DB_CREATE_ERROR",
		})
		return
	}

	// Add creator as participant with 'creator' role
	if err := h.eventRepo.AddParticipantWithRole(newEvent.ID.String(), authorID.String(), event.RoleCreator); err != nil {
		h.log.Error("failed to add creator as participant", "error", err, "event_id", newEvent.ID)
		// Don't fail the request - event was created successfully
		// Creator might need to be added manually later
	}

	h.log.Info("event created successfully", "event_id", newEvent.ID, "event_name", newEvent.Name, "author_id", authorID)

	c.JSON(http.StatusCreated, gin.H{
		"event": gin.H{
			"id":               newEvent.ID.String(),
			"name":             newEvent.Name,
			"description":      newEvent.Description,
			"start_date":       newEvent.StartDate.Format("2006-01-02"),
			"end_date":         newEvent.EndDate.Format("2006-01-02"),
			"organizer":        newEvent.Organizer,
			"shareable_link":   newEvent.ShareableLink,
			"max_participants": newEvent.MaxParticipants,
			"stage":            newEvent.Stage.String(),
			"author_id":        newEvent.AuthorID.String(),
			"created_at":       newEvent.CreatedAt,
		},
		"message": "Event created successfully",
		"code":    "EVENT_CREATED",
	})
}

type UpdateStageRequest struct {
	Stage            string `json:"stage" binding:"required"`
	EstimatedEndDate string `json:"estimated_end_date"` // Optional: YYYY-MM-DD format, required for participation/voting
	// VotingConfig is required when stage is voting and ignored otherwise.
	VotingConfig *VotingConfigRequest `json:"voting_config"`
}

type UpdateEstimatedEndDateRequest struct {
	Stage            string `json:"stage" binding:"required"`
	EstimatedEndDate string `json:"estimated_end_date" binding:"required"`
}

// UpdateEventStage handles PATCH /api/events/{event_id}/stage
func (h *EventHandler) UpdateEventStage(c *gin.Context) {
	eventID := c.Param("event_id")

	h.log.Debug("updating event stage", "event_id", eventID)

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

	var req UpdateStageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.log.Warn("invalid request payload for stage update", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request payload",
			"code":    "INVALID_PAYLOAD",
			"details": err.Error(),
		})
		return
	}

	// Authorization is handled by RequireEventOwner middleware
	// User is guaranteed to be the event owner or admin at this point

	// Get the event
	existingEvent, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		h.log.Error("event not found", "event_id", eventID, "error", err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Event not found",
			"code":  "EVENT_NOT_FOUND",
		})
		return
	}

	// Parse and validate the new stage
	newStage, valid := event.StageFromString(req.Stage)
	if !valid {
		h.log.Warn("invalid stage requested", "requested_stage", req.Stage)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":        "Invalid stage",
			"code":         "INVALID_STAGE",
			"valid_stages": []string{"creation", "participation", "voting", "results"},
		})
		return
	}

	// Check if transition is valid
	if !existingEvent.CanTransitionTo(newStage) {
		h.log.Warn("invalid stage transition",
			"event_id", eventID,
			"current_stage", existingEvent.Stage.String(),
			"requested_stage", req.Stage)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":           "Invalid stage transition",
			"code":            "INVALID_TRANSITION",
			"current_stage":   existingEvent.Stage.String(),
			"requested_stage": req.Stage,
		})
		return
	}

	previousStage := existingEvent.Stage

	// Validate estimated_end_date for participation and voting stages
	var estimatedDate *time.Time
	if newStage == event.StageParticipation || newStage == event.StageVoting {
		if req.EstimatedEndDate == "" {
			h.log.Warn("missing estimated_end_date for stage transition", "stage", req.Stage)
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "estimated_end_date is required when advancing to participation or voting stage",
				"code":  "MISSING_ESTIMATED_DATE",
			})
			return
		}

		parsedDate, err := time.Parse("2006-01-02", req.EstimatedEndDate)
		if err != nil {
			h.log.Warn("invalid estimated_end_date format", "date", req.EstimatedEndDate, "error", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid estimated_end_date format",
				"code":    "INVALID_DATE_FORMAT",
				"details": "Expected format: YYYY-MM-DD",
			})
			return
		}

		// Validate date is not in the past
		today := time.Now().Truncate(24 * time.Hour)
		if parsedDate.Before(today) {
			h.log.Warn("estimated_end_date is in the past", "date", req.EstimatedEndDate)
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Estimated end date must be today or in the future",
				"code":    "INVALID_ESTIMATED_DATE",
				"details": "Provided date: " + req.EstimatedEndDate + ", Current date: " + today.Format("2006-01-02"),
			})
			return
		}

		estimatedDate = &parsedDate
	}

	// Additional business rules validation before stage transitions
	var voting *votingSetup
	switch newStage {
	case event.StageVoting:
		h.log.Debug("moving to voting stage", "event_id", eventID)

		var ok bool
		if voting, ok = h.prepareVoting(c, eventID, eventUUID, req.VotingConfig); !ok {
			return
		}

		h.log.Info("voting stage validation passed", "event_id", eventID, "attachments", voting.totalAttachments)

	case event.StageResult:
		h.log.Debug("moving to results stage", "event_id", eventID)
	}

	if voting != nil {
		// Stage, configuration and assignments are written together; on failure
		// the event stays in participation.
		if err := h.votingSetupRepo.OpenVoting(eventID, estimatedDate, voting.config, voting.assignments); err != nil {
			h.log.Error("failed to open voting", "event_id", eventID, "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to open voting",
				"code":  "VOTING_SETUP_ERROR",
			})
			return
		}
	} else if err := h.eventRepo.UpdateStageWithEstimatedDate(eventID, newStage, estimatedDate); err != nil {
		h.log.Error("failed to update event stage", "event_id", eventID, "new_stage", req.Stage, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update event stage",
			"code":  "DB_UPDATE_ERROR",
		})
		return
	}

	// Get updated event
	updatedEvent, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		h.log.Error("failed to retrieve updated event", "event_id", eventID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve updated event",
			"code":  "RETRIEVAL_ERROR",
		})
		return
	}

	h.log.Info("event stage updated successfully",
		"event_id", eventID,
		"old_stage", previousStage.String(),
		"new_stage", updatedEvent.Stage.String())

	// Entering the results stage: calculate and store the ranking once, so the
	// public read-only endpoint has something to serve to visitors.
	var results *vote.VotingResults
	if updatedEvent.Stage == event.StageResult && h.voteHandler != nil {
		var calcErr error
		if results, calcErr = h.voteHandler.CalculateAndPersistResults(eventID); calcErr != nil {
			results = nil
			h.log.Warn("failed to calculate results on stage change", "event_id", eventID, "error", calcErr)
		} else {
			h.log.Info("voting results calculated and stored", "event_id", eventID)
		}
	}

	h.notifyStageChanged(updatedEvent, req.EstimatedEndDate, voting, results)

	// Notify participants asynchronously — errors are logged but don't fail the request
	go func() {
		participants, err := h.userRepo.GetEventParticipants(updatedEvent.ID.String())
		if err != nil {
			h.log.Warn("failed to get participants for stage change email", "event_id", eventID, "error", err)
			return
		}
		emails := make([]string, 0, len(participants))
		for _, p := range participants {
			emails = append(emails, p.Email)
		}
		if err := h.emailService.SendStageChangeNotification(updatedEvent.Name, updatedEvent.Stage.String(), emails); err != nil {
			h.log.Warn("failed to send stage change emails", "event_id", eventID, "error", err)
		}
	}()

	response := gin.H{
		"data": gin.H{
			"id":                               updatedEvent.ID.String(),
			"name":                             updatedEvent.Name,
			"description":                      updatedEvent.Description,
			"start_date":                       updatedEvent.StartDate.Format("2006-01-02"),
			"end_date":                         updatedEvent.EndDate.Format("2006-01-02"),
			"stage":                            updatedEvent.Stage.String(),
			"participation_estimated_end_date": formatDatePtr(updatedEvent.ParticipationEstimatedEndDate),
			"voting_estimated_end_date":        formatDatePtr(updatedEvent.VotingEstimatedEndDate),
			"author_id":                        updatedEvent.AuthorID.String(),
			"updated_at":                       updatedEvent.UpdatedAt,
		},
		"message": "Event stage updated successfully",
		"code":    "STAGE_UPDATED",
		"transition": gin.H{
			"from": previousStage.String(),
			"to":   updatedEvent.Stage.String(),
		},
	}
	if voting != nil {
		response["voting"] = gin.H{
			"configuration":     votingConfigurationPayload(voting.config),
			"assignments_count": len(voting.assignments),
			"total_attachments": voting.totalAttachments,
		}
	}
	c.JSON(http.StatusOK, response)
}

// notifyStageChanged emits stage_changed to the registered participants (author excluded),
// with data tailored to each recipient for the voting and results stages.
func (h *EventHandler) notifyStageChanged(evt *event.Event, deadline string, voting *votingSetup, results *vote.VotingResults) {
	ids, ok := h.participantIDs(evt.ID.String())
	if !ok {
		return
	}
	assigned := map[uuid.UUID]int{}
	if voting != nil {
		for _, a := range voting.assignments {
			assigned[a.ParticipantID] = len(a.AttachmentIDs)
		}
	}
	h.notify(evt.ID, notification.TypeStageChanged, ids, func(recipient uuid.UUID) notification.Data {
		data := notification.Data{"stage": evt.Stage.String()}
		switch evt.Stage {
		case event.StageParticipation:
			data["deadline"] = deadline
		case event.StageVoting:
			data["deadline"] = deadline
			if n, has := assigned[recipient]; has {
				data["can_vote"] = true
				data["assigned_count"] = n
			} else {
				data["can_vote"] = false
			}
		case event.StageResult:
			if pos, total, found := resultPosition(results, recipient); found {
				data["result_position"] = pos
				data["result_total"] = total
			}
		}
		return data
	})
}

// votingSetup is what the participation → voting transition writes.
type votingSetup struct {
	config           *vote.VotingConfiguration
	assignments      []*vote.Assignment
	totalAttachments int
}

// prepareVoting validates everything the transition needs before any write and
// builds the configuration and assignments in memory. Evaluators are the
// participants who uploaded a proposal. It responds with the error and
// returns false when the transition cannot proceed.
func (h *EventHandler) prepareVoting(c *gin.Context, eventID string, eventUUID uuid.UUID, req *VotingConfigRequest) (*votingSetup, bool) {
	attachments, err := h.attachmentRepo.GetByEventID(eventID)
	if err != nil {
		h.log.Error("failed to get attachments", "event_id", eventID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to validate attachments",
			"code":  "ATTACHMENTS_ERROR",
		})
		return nil, false
	}

	if len(attachments) < minProposalsToVote {
		h.log.Warn("insufficient proposals for voting", "event_id", eventID, "attachment_count", len(attachments))
		respondInsufficientProposals(c, len(attachments))
		return nil, false
	}

	if req == nil {
		h.log.Warn("missing voting_config for voting transition", "event_id", eventID)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "voting_config is required when advancing to the voting stage",
			"code":  "MISSING_VOTING_CONFIG",
		})
		return nil, false
	}

	k := len(attachments)
	config, err := vote.BuildVotingConfiguration(eventUUID, req.input(), k)
	if err != nil {
		h.log.Warn("invalid voting configuration", "event_id", eventID, "error", err)
		respondVotingConfigError(c, err)
		return nil, false
	}

	evaluators := make([]uuid.UUID, k)
	attachmentIDs := make([]uuid.UUID, k)
	for i, a := range attachments {
		evaluators[i] = a.ParticipantID
		attachmentIDs[i] = a.ID
	}

	assignments, err := h.votingService.GenerateAssignments(eventUUID, evaluators, attachmentIDs, config)
	if err != nil {
		h.log.Error("failed to generate assignments", "event_id", eventID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to open voting",
			"code":  "VOTING_SETUP_ERROR",
		})
		return nil, false
	}

	return &votingSetup{config: config, assignments: assignments, totalAttachments: k}, true
}

// votingConfigurationPayload is built explicitly instead of serializing the
// domain entity.
func votingConfigurationPayload(cfg *vote.VotingConfiguration) gin.H {
	return gin.H{
		"id":                        cfg.ID.String(),
		"event_id":                  cfg.EventID.String(),
		"attachments_per_evaluator": cfg.AttachmentsPerEvaluator,
		"quality_good_threshold":    cfg.QualityGoodThreshold,
		"quality_bad_threshold":     cfg.QualityBadThreshold,
		"adjustment_magnitude":      cfg.AdjustmentMagnitude,
		"min_evaluations_per_file":  cfg.MinEvaluationsPerFile,
		"created_at":                cfg.CreatedAt,
		"updated_at":                cfg.UpdatedAt,
	}
}

// respondVotingConfigError maps the domain errors of BuildVotingConfiguration.
func respondVotingConfigError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, vote.ErrInvalidThresholds):
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quality thresholds", "code": "INVALID_THRESHOLDS", "details": err.Error()})
	case errors.Is(err, vote.ErrMExceedsEvaluable):
		c.JSON(http.StatusBadRequest, gin.H{"error": "Attachments per evaluator exceeds the proposals each participant can evaluate", "code": "M_EXCEEDS_EVALUABLE", "details": err.Error()})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Voting configuration violates mathematical constraints", "code": "MATH_CONSTRAINT_VIOLATION", "details": err.Error()})
	}
}

// UpdateEstimatedEndDate handles PATCH /api/v1/events/{event_id}/estimated-end-date
// Allows the event organizer to edit the estimated end date for an active stage
func (h *EventHandler) UpdateEstimatedEndDate(c *gin.Context) {
	eventID := c.Param("event_id")

	h.log.Debug("updating estimated end date", "event_id", eventID)

	// Validate UUID format
	if _, err := uuid.Parse(eventID); err != nil {
		h.log.Warn("invalid event_id format", "event_id", eventID, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid event_id format",
			"code":  "INVALID_EVENT_ID",
		})
		return
	}

	var req UpdateEstimatedEndDateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.log.Warn("invalid request payload", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request payload",
			"code":    "INVALID_PAYLOAD",
			"details": err.Error(),
		})
		return
	}

	// Get the event
	existingEvent, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		h.log.Error("event not found", "event_id", eventID, "error", err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Event not found",
			"code":  "EVENT_NOT_FOUND",
		})
		return
	}

	// Parse and validate target stage
	targetStage, valid := event.StageFromString(req.Stage)
	if !valid || (targetStage != event.StageParticipation && targetStage != event.StageVoting) {
		h.log.Warn("invalid stage for estimated end date", "stage", req.Stage)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":        "Invalid stage for estimated end date",
			"code":         "INVALID_STAGE",
			"valid_stages": []string{"participation", "voting"},
		})
		return
	}

	// Validate event is in the specified stage
	if existingEvent.Stage != targetStage {
		h.log.Warn("event not in specified stage",
			"event_id", eventID,
			"current_stage", existingEvent.Stage.String(),
			"requested_stage", req.Stage)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Event is not in the specified stage",
			"code":  "INVALID_STAGE_FOR_EDIT",
			"details": gin.H{
				"current_stage":   existingEvent.Stage.String(),
				"requested_stage": req.Stage,
			},
		})
		return
	}

	// Parse new date
	newDate, err := time.Parse("2006-01-02", req.EstimatedEndDate)
	if err != nil {
		h.log.Warn("invalid date format", "date", req.EstimatedEndDate, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid estimated_end_date format",
			"code":    "INVALID_DATE_FORMAT",
			"details": "Expected format: YYYY-MM-DD",
		})
		return
	}

	// Validate new date is not in the past
	today := time.Now().Truncate(24 * time.Hour)
	if newDate.Before(today) {
		h.log.Warn("new date is in the past", "date", req.EstimatedEndDate)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Estimated end date must be today or in the future",
			"code":  "INVALID_ESTIMATED_DATE",
		})
		return
	}

	// Get current estimated date for the stage
	var currentDate *time.Time
	if targetStage == event.StageParticipation {
		currentDate = existingEvent.ParticipationEstimatedEndDate
	} else {
		currentDate = existingEvent.VotingEstimatedEndDate
	}

	// Only allow postponing the deadline of a stage that hasn't ended yet, never bringing it forward.
	if currentDate != nil && !currentDate.Before(today) && newDate.Before(*currentDate) {
		h.log.Warn("attempt to advance deadline",
			"event_id", eventID,
			"current_date", currentDate.Format("2006-01-02"),
			"requested_date", req.EstimatedEndDate)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "You can only postpone the deadline, not bring it forward",
			"code":  "CANNOT_ADVANCE_DEADLINE",
			"details": gin.H{
				"current_date":   currentDate.Format("2006-01-02"),
				"requested_date": req.EstimatedEndDate,
			},
		})
		return
	}

	// Update estimated end date
	if err := h.eventRepo.UpdateEstimatedEndDate(eventID, targetStage, newDate); err != nil {
		h.log.Error("failed to update estimated end date", "event_id", eventID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update estimated end date",
			"code":  "UPDATE_ERROR",
		})
		return
	}

	h.log.Info("estimated end date updated",
		"event_id", eventID,
		"stage", req.Stage,
		"new_date", req.EstimatedEndDate)

	if ids, ok := h.participantIDs(eventID); ok {
		h.notify(existingEvent.ID, notification.TypeDeadlineChanged, ids, func(uuid.UUID) notification.Data {
			return notification.Data{"stage": req.Stage, "new_date": req.EstimatedEndDate}
		})
	}

	// Notify participants asynchronously
	go func() {
		participants, err := h.userRepo.GetEventParticipants(eventID)
		if err != nil {
			h.log.Warn("failed to get participants for estimated date email", "event_id", eventID, "error", err)
			return
		}
		emails := make([]string, 0, len(participants))
		for _, p := range participants {
			emails = append(emails, p.Email)
		}
		if err := h.emailService.SendEstimatedDateChangeNotification(existingEvent.Name, req.Stage, req.EstimatedEndDate, emails); err != nil {
			h.log.Warn("failed to send estimated date change emails", "event_id", eventID, "error", err)
		}
	}()

	// Build response
	previousDateStr := ""
	if currentDate != nil {
		previousDateStr = currentDate.Format("2006-01-02")
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Estimated end date updated successfully",
		"data": gin.H{
			"event_id":           eventID,
			"stage":              req.Stage,
			"estimated_end_date": req.EstimatedEndDate,
			"previous_date":      previousDateStr,
		},
		"code": "ESTIMATED_DATE_UPDATED",
	})
}

type RegisterParticipantRequest struct {
	ParticipantName  string `json:"participant_name" binding:"required,min=2,max=100"`
	ParticipantEmail string `json:"participant_email" binding:"required,email"`
}

// RegisterParticipant handles POST /api/events/{event_id}/register
func (h *EventHandler) RegisterParticipant(c *gin.Context) {
	eventID := c.Param("event_id")

	h.log.Debug("registering participant", "event_id", eventID)

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

	var req RegisterParticipantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.log.Warn("invalid request payload for participant registration", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request payload",
			"code":    "INVALID_PAYLOAD",
			"details": err.Error(),
		})
		return
	}

	// Check if event exists and is in participation stage
	eventObj, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		h.log.Error("event not found", "event_id", eventID, "error", err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Event not found",
			"code":  "EVENT_NOT_FOUND",
		})
		return
	}

	// Must run before the stage check: otherwise a hidden event would answer
	// INVALID_REGISTRATION_STAGE and reveal that it exists.
	if !eventVisibleTo(c, eventObj) {
		respondEventNotFound(c)
		return
	}

	// Only allow registration during participation stage
	if eventObj.Stage != event.StageParticipation {
		h.log.Warn("registration attempt outside participation stage",
			"event_id", eventID,
			"current_stage", eventObj.Stage.String())
		c.JSON(http.StatusBadRequest, gin.H{
			"error":         "Participant registration is only allowed during participation stage",
			"code":          "INVALID_REGISTRATION_STAGE",
			"current_stage": eventObj.Stage.String(),
		})
		return
	}

	// Block registration if event is paused
	if eventObj.IsPaused {
		h.log.Warn("registration attempt on paused event", "event_id", eventID)
		c.JSON(http.StatusForbidden, gin.H{
			"error": "This event is currently paused. Registration is not available.",
			"code":  "EVENT_PAUSED",
		})
		return
	}

	existingUser, err := h.userRepo.GetByEmail(req.ParticipantEmail)
	if err != nil {
		// User doesn't exist, create a new one
		h.log.Debug("creating new user", "email", req.ParticipantEmail, "name", req.ParticipantName)

		newUser := &participant.User{
			ID:    uuid.New(),
			Name:  req.ParticipantName,
			Email: req.ParticipantEmail,
			Role:  participant.RoleParticipant,
		}

		if err := h.userRepo.Create(newUser); err != nil {
			h.log.Error("failed to create participant", "email", req.ParticipantEmail, "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to create participant",
				"code":  "USER_CREATE_ERROR",
			})
			return
		}
		existingUser = newUser
		h.log.Info("new user created", "user_id", newUser.ID, "email", newUser.Email)
	} else {
		h.log.Debug("using existing user", "user_id", existingUser.ID, "email", existingUser.Email)
	}

	// Prevent event creator from registering as participant
	if existingUser.ID == eventObj.AuthorID {
		h.log.Warn("event creator attempted to register as participant",
			"event_id", eventID,
			"user_id", existingUser.ID.String())
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Event creator cannot register as a participant",
			"code":  "CREATOR_CANNOT_REGISTER",
		})
		return
	}

	// Check if participant is already registered for this event
	participantEvents, err := h.eventRepo.GetByParticipant(existingUser.ID.String())
	if err == nil && len(participantEvents) > 0 {
		for _, evt := range participantEvents {
			if evt.ID == eventUUID {
				h.log.Warn("duplicate registration attempt",
					"event_id", eventID,
					"user_id", existingUser.ID.String())
				c.JSON(http.StatusConflict, gin.H{
					"error": "Participant is already registered for this event",
					"code":  "ALREADY_REGISTERED",
				})
				return
			}
		}
	}

	// Check maximum participants limit
	currentParticipants, err := h.userRepo.GetEventParticipants(eventID)
	if err != nil {
		h.log.Error("failed to get current participants count",
			"event_id", eventID,
			"error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to verify participant limit",
			"code":  "PARTICIPANT_CHECK_ERROR",
		})
		return
	}

	// Use max_participants from event configuration (default: 20)
	maxParticipants := 20 // Default value
	if eventObj.MaxParticipants != nil && *eventObj.MaxParticipants > 0 {
		maxParticipants = *eventObj.MaxParticipants
	}

	if len(currentParticipants) >= maxParticipants {
		h.log.Warn("maximum participants reached",
			"event_id", eventID,
			"current_count", len(currentParticipants),
			"max_participants", maxParticipants)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":            "Maximum number of participants reached for this event",
			"code":             "MAX_PARTICIPANTS_REACHED",
			"current_count":    len(currentParticipants),
			"max_participants": maxParticipants,
		})
		return
	}

	// Add participant to event with 'participant' role
	if err := h.eventRepo.AddParticipantWithRole(eventID, existingUser.ID.String(), event.RoleParticipant); err != nil {
		h.log.Error("failed to register participant",
			"event_id", eventID,
			"user_id", existingUser.ID.String(),
			"error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to register participant",
			"code":  "REGISTRATION_ERROR",
		})
		return
	}

	h.log.Info("participant registered successfully",
		"event_id", eventID,
		"user_id", existingUser.ID.String(),
		"email", existingUser.Email)

	h.notify(eventUUID, notification.TypeRegistrationConfirmed, []uuid.UUID{existingUser.ID}, nil)
	if h.notifier != nil {
		if err := h.notifier.ParticipantRegistered(eventObj.AuthorID, eventUUID); err != nil {
			h.log.Warn("failed to aggregate participant_registered notification", "event_id", eventID, "error", err)
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"participant_id":    existingUser.ID.String(),
			"participant_name":  existingUser.Name,
			"participant_email": existingUser.Email,
			"event_id":          eventID,
			"event_name":        eventObj.Name,
			"registered_at":     time.Now(),
		},
		"message": "Participant registered successfully",
		"code":    "PARTICIPANT_REGISTERED",
	})
}

// GetEventParticipants handles GET /api/events/{event_id}/participants
func (h *EventHandler) GetEventParticipants(c *gin.Context) {
	eventID := c.Param("event_id")

	h.log.Debug("retrieving event participants", "event_id", eventID)

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
	if _, err := uuid.Parse(eventID); err != nil {
		h.log.Warn("invalid event_id format", "event_id", eventID, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid event_id format",
			"code":  "INVALID_EVENT_ID",
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

	if !eventVisibleTo(c, eventObj) {
		respondEventNotFound(c)
		return
	}

	// Authentication enforced by JWT middleware
	// Any authenticated user can view event participants

	participants, err := h.userRepo.GetEventParticipants(eventID)
	if err != nil {
		h.log.Error("failed to retrieve participants", "event_id", eventID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve participants",
			"code":  "RETRIEVAL_ERROR",
		})
		return
	}

	// Transform participants data
	participantData := make([]gin.H, len(participants))
	for i, p := range participants {
		participantData[i] = gin.H{
			"id":         p.ID.String(),
			"name":       p.Name,
			"email":      p.Email,
			"role":       p.EventRole, // Use event-specific role (creator/participant)
			"created_at": p.CreatedAt,
		}
	}

	h.log.Debug("participants retrieved successfully", "event_id", eventID, "count", len(participants))

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"event": gin.H{
				"id":    eventObj.ID.String(),
				"name":  eventObj.Name,
				"stage": eventObj.Stage.String(),
			},
			"participants": participantData,
		},
		"count": len(participants),
	})
}

// GetAllEvents handles GET /api/events
func (h *EventHandler) GetAllEvents(c *gin.Context) {
	h.log.Debug("retrieving all events")

	// Add pagination support
	page := 1
	limit := 10

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	// Add filtering support
	stage := c.Query("stage")

	events, err := h.eventRepo.GetAll()
	if err != nil {
		h.log.Error("failed to retrieve events", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve events",
			"code":  "RETRIEVAL_ERROR",
		})
		return
	}

	// Events in creation are never listed, not even to their author.
	q := strings.TrimSpace(c.Query("q"))
	visible := make([]*event.Event, 0, len(events))
	for _, evt := range events {
		if evt.Stage != event.StageCreation && matchesQuery(evt, q) {
			visible = append(visible, evt)
		}
	}

	// stage_counts is computed before the stage filter and pagination.
	stageCounts := countByStage(visible)

	var filteredEvents []*event.Event
	if stage != "" {
		stageEnum, valid := event.StageFromString(stage)
		if !valid {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":        "Invalid stage filter",
				"code":         "INVALID_STAGE_FILTER",
				"valid_stages": []string{"creation", "participation", "voting", "results"},
			})
			return
		}
		for _, evt := range visible {
			if evt.Stage == stageEnum {
				filteredEvents = append(filteredEvents, evt)
			}
		}
	} else {
		filteredEvents = visible
	}

	// Apply pagination
	total := len(filteredEvents)
	start := (page - 1) * limit
	end := start + limit

	if start >= total {
		filteredEvents = []*event.Event{}
	} else {
		if end > total {
			end = total
		}
		filteredEvents = filteredEvents[start:end]
	}

	// Transform events data
	eventData := make([]gin.H, len(filteredEvents))
	for i, evt := range filteredEvents {
		// Get participant IDs for this event
		participantIDs := []string{}
		participants, err := h.userRepo.GetEventParticipants(evt.ID.String())
		if err == nil {
			for _, p := range participants {
				participantIDs = append(participantIDs, p.ID.String())
			}
		}

		eventData[i] = gin.H{
			"id":                               evt.ID.String(),
			"name":                             evt.Name,
			"description":                      evt.Description,
			"start_date":                       evt.StartDate.Format("2006-01-02"),
			"end_date":                         evt.EndDate.Format("2006-01-02"),
			"stage":                            evt.Stage.String(),
			"author_id":                        evt.AuthorID.String(),
			"max_participants":                 evt.MaxParticipants,
			"participation_estimated_end_date": formatDatePtr(evt.ParticipationEstimatedEndDate),
			"voting_estimated_end_date":        formatDatePtr(evt.VotingEstimatedEndDate),
			"participant_ids":                  participantIDs,
			"participants_count":               len(participantIDs),
			"is_cancelled":                     evt.IsCancelled,
			"is_paused":                        evt.IsPaused,
			"created_at":                       evt.CreatedAt,
			"updated_at":                       evt.UpdatedAt,
		}
	}

	h.log.Debug("events retrieved successfully", "total", total, "page", page, "limit", limit)

	c.JSON(http.StatusOK, gin.H{
		"data": eventData,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + limit - 1) / limit,
		},
		"filters": gin.H{
			"stage": stage,
		},
		"stage_counts": stageCounts,
	})
}

// matchesQuery reports whether q (already trimmed) appears, ignoring case, in
// the name or the stored organizer of evt. An empty q matches everything.
func matchesQuery(evt *event.Event, q string) bool {
	if q == "" {
		return true
	}
	q = strings.ToLower(q)
	return strings.Contains(strings.ToLower(evt.Name), q) ||
		strings.Contains(strings.ToLower(evt.Organizer), q)
}

// countByStage returns the number of events per public stage; the three keys
// are always present.
func countByStage(events []*event.Event) gin.H {
	counts := map[event.Stage]int{}
	for _, evt := range events {
		counts[evt.Stage]++
	}
	return gin.H{
		"participation": counts[event.StageParticipation],
		"voting":        counts[event.StageVoting],
		"results":       counts[event.StageResult],
	}
}

// GetEvent handles GET /api/events/{event_id}
func (h *EventHandler) GetEvent(c *gin.Context) {
	eventID := c.Param("event_id")

	h.log.Debug("retrieving event", "event_id", eventID)

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
	if _, err := uuid.Parse(eventID); err != nil {
		h.log.Warn("invalid event_id format", "event_id", eventID, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid event_id format",
			"code":  "INVALID_EVENT_ID",
		})
		return
	}

	// Get the event
	eventObj, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		h.log.Error("event not found", "event_id", eventID, "error", err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Event not found",
			"code":  "EVENT_NOT_FOUND",
		})
		return
	}

	if !eventVisibleTo(c, eventObj) {
		respondEventNotFound(c)
		return
	}

	// Get additional statistics if requested
	includeStats := c.Query("include_stats") == "true"

	detail, participantCount := h.buildEventDetail(eventObj)
	response := gin.H{"data": detail}

	if includeStats {
		response["statistics"] = gin.H{
			"participants_count": participantCount,
			"duration_days":      int(eventObj.EndDate.Sub(eventObj.StartDate).Hours() / 24),
		}
	}

	h.log.Debug("event retrieved successfully", "event_id", eventID)
	c.JSON(http.StatusOK, response)
}

// buildEventDetail builds the EventDetail payload shared by GetEvent and
// UpdateEvent, and returns the number of registered participants (the author
// excluded) it reports.
func (h *EventHandler) buildEventDetail(evt *event.Event) (gin.H, int) {
	eventID := evt.ID.String()

	participants, err := h.userRepo.GetEventParticipants(eventID)
	participantIDs := []string{}
	if err == nil {
		for _, p := range participants {
			participantIDs = append(participantIDs, p.ID.String())
		}
	} else {
		h.log.Warn("failed to get event participants", "event_id", eventID, "error", err)
	}

	attachments, err := h.attachmentRepo.GetByEventID(eventID)
	attachmentCount := 0
	if err == nil {
		attachmentCount = len(attachments)
	} else {
		h.log.Warn("failed to get event attachments", "event_id", eventID, "error", err)
	}

	// Resolve organizer: use stored value or fall back to creator's username
	organizer := evt.Organizer
	if organizer == "" {
		if author, err := h.userRepo.GetByID(evt.AuthorID.String()); err == nil {
			organizer = author.Name
		}
	}

	return gin.H{
		"id":                               evt.ID.String(),
		"name":                             evt.Name,
		"description":                      evt.Description,
		"start_date":                       evt.StartDate.Format("2006-01-02"),
		"end_date":                         evt.EndDate.Format("2006-01-02"),
		"stage":                            evt.Stage.String(),
		"author_id":                        evt.AuthorID.String(),
		"organizer":                        organizer,
		"max_participants":                 evt.MaxParticipants,
		"participation_estimated_end_date": formatDatePtr(evt.ParticipationEstimatedEndDate),
		"voting_estimated_end_date":        formatDatePtr(evt.VotingEstimatedEndDate),
		"participant_ids":                  participantIDs,
		"participants_count":               len(participantIDs),
		"attachment_count":                 attachmentCount,
		"is_cancelled":                     evt.IsCancelled,
		"is_paused":                        evt.IsPaused,
		"created_at":                       evt.CreatedAt,
		"updated_at":                       evt.UpdatedAt,
	}, len(participantIDs)
}

// UpdateEventRequest holds the editable fields of PATCH /events/{event_id}.
// Pointers tell an absent field from a zero value; ranges are validated by
// validateUpdateEventRequest because binding tags skip zero values.
type UpdateEventRequest struct {
	Name            *string `json:"name"`
	Description     *string `json:"description"`
	Organizer       *string `json:"organizer"`
	MaxParticipants *int    `json:"max_participants"`
}

// validateUpdateEventRequest returns a description of the first invalid field,
// or "" when the request is valid. Lengths are counted in characters.
func validateUpdateEventRequest(req UpdateEventRequest) string {
	if req.Name == nil && req.Description == nil && req.Organizer == nil && req.MaxParticipants == nil {
		return "at least one of name, description, organizer, max_participants is required"
	}
	if req.Name != nil {
		if n := utf8.RuneCountInString(*req.Name); n < 3 || n > 200 {
			return "name must be between 3 and 200 characters"
		}
	}
	if req.Description != nil {
		if n := utf8.RuneCountInString(*req.Description); n < 10 || n > 2000 {
			return "description must be between 10 and 2000 characters"
		}
	}
	if req.Organizer != nil && utf8.RuneCountInString(*req.Organizer) > 200 {
		return "organizer must be at most 200 characters"
	}
	if req.MaxParticipants != nil && (*req.MaxParticipants < 1 || *req.MaxParticipants > 100) {
		return "max_participants must be between 1 and 100"
	}
	return ""
}

// UpdateEvent handles PATCH /api/events/{event_id}
func (h *EventHandler) UpdateEvent(c *gin.Context) {
	eventID := c.Param("event_id")

	h.log.Debug("updating event", "event_id", eventID)

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
	if _, err := uuid.Parse(eventID); err != nil {
		h.log.Warn("invalid event_id format", "event_id", eventID, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid event_id format",
			"code":  "INVALID_EVENT_ID",
		})
		return
	}

	var req UpdateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.log.Warn("invalid request payload for event update", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request payload",
			"code":    "INVALID_PAYLOAD",
			"details": err.Error(),
		})
		return
	}
	if details := validateUpdateEventRequest(req); details != "" {
		h.log.Warn("invalid event update", "event_id", eventID, "details", details)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request payload",
			"code":    "INVALID_PAYLOAD",
			"details": details,
		})
		return
	}

	existingEvent, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		h.log.Error("event not found", "event_id", eventID, "error", err)
		respondEventNotFound(c)
		return
	}

	if existingEvent.Stage != event.StageCreation && existingEvent.Stage != event.StageParticipation {
		h.log.Warn("update attempt outside creation/participation stage", "event_id", eventID, "current_stage", existingEvent.Stage)
		c.JSON(http.StatusConflict, gin.H{
			"error":         "Event can only be updated during creation or participation stage",
			"code":          "INVALID_UPDATE_STAGE",
			"current_stage": existingEvent.Stage.String(),
		})
		return
	}

	if req.MaxParticipants != nil {
		participants, err := h.userRepo.GetEventParticipants(eventID)
		if err != nil {
			h.log.Error("failed to count participants", "event_id", eventID, "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to verify registered participants",
				"code":  "PARTICIPANT_CHECK_ERROR",
			})
			return
		}
		if *req.MaxParticipants < len(participants) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":         "max_participants cannot be lower than the registered participants",
				"code":          "MAX_PARTICIPANTS_BELOW_REGISTERED",
				"current_count": len(participants),
			})
			return
		}
	}

	if req.Name != nil {
		allEvents, err := h.eventRepo.GetAll()
		if err != nil {
			h.log.Error("failed to check event name uniqueness", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to retrieve events",
				"code":  "RETRIEVAL_ERROR",
			})
			return
		}
		for _, other := range allEvents {
			if other.ID != existingEvent.ID && other.Name == *req.Name {
				c.JSON(http.StatusConflict, gin.H{
					"error": "An event with this name already exists",
					"code":  "DUPLICATE_EVENT_NAME",
				})
				return
			}
		}
		existingEvent.Name = *req.Name
	}
	if req.Description != nil {
		existingEvent.Description = *req.Description
	}
	if req.Organizer != nil {
		existingEvent.Organizer = *req.Organizer
	}
	if req.MaxParticipants != nil {
		existingEvent.MaxParticipants = req.MaxParticipants
	}

	if err := h.eventRepo.Update(existingEvent); err != nil {
		h.log.Error("failed to update event", "event_id", eventID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update event",
			"code":  "DB_UPDATE_ERROR",
		})
		return
	}

	detail, _ := h.buildEventDetail(existingEvent)
	h.log.Info("event updated", "event_id", eventID)
	c.JSON(http.StatusOK, gin.H{
		"data":    detail,
		"message": "Event updated successfully",
		"code":    "EVENT_UPDATED",
	})
}

// DeleteEvent handles DELETE /api/events/{event_id}
func (h *EventHandler) DeleteEvent(c *gin.Context) {
	eventID := c.Param("event_id")

	h.log.Debug("deleting event", "event_id", eventID)

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
	if _, err := uuid.Parse(eventID); err != nil {
		h.log.Warn("invalid event_id format", "event_id", eventID, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid event_id format",
			"code":  "INVALID_EVENT_ID",
		})
		return
	}

	// Get existing event
	existingEvent, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		h.log.Error("event not found", "event_id", eventID, "error", err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Event not found",
			"code":  "EVENT_NOT_FOUND",
		})
		return
	}

	// Only allow deletion in creation stage
	if existingEvent.Stage != event.StageCreation {
		h.log.Warn("deletion attempt outside creation stage", "event_id", eventID, "current_stage", existingEvent.Stage)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":         "Event can only be deleted during creation stage",
			"code":          "INVALID_DELETE_STAGE",
			"current_stage": existingEvent.Stage.String(),
		})
		return
	}

	h.log.Warn("event delete feature not implemented", "event_id", eventID)
	c.JSON(http.StatusNotImplemented, gin.H{
		"error":   "Event delete feature is not yet implemented",
		"code":    "NOT_IMPLEMENTED",
		"details": "EventRepository.Delete method needs to be added",
	})
}

// RemoveParticipant handles DELETE /api/events/{event_id}/participants/{participant_id}
func (h *EventHandler) RemoveParticipant(c *gin.Context) {
	eventID := c.Param("event_id")
	participantID := c.Param("participant_id")

	h.log.Debug("removing participant", "event_id", eventID, "participant_id", participantID)

	// Validate required parameters
	if eventID == "" || participantID == "" {
		h.log.Warn("missing required parameters", "event_id", eventID, "participant_id", participantID)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "event_id and participant_id are required",
			"code":  "MISSING_PARAMETERS",
		})
		return
	}

	// Validate UUID formats
	if _, err := uuid.Parse(eventID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid event_id format",
			"code":  "INVALID_EVENT_ID",
		})
		return
	}

	if _, err := uuid.Parse(participantID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid participant_id format",
			"code":  "INVALID_PARTICIPANT_ID",
		})
		return
	}

	// Get existing event
	existingEvent, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Event not found",
			"code":  "EVENT_NOT_FOUND",
		})
		return
	}

	// Only allow removal during participation stage
	if existingEvent.Stage != event.StageParticipation {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":         "Participants can only be removed during participation stage",
			"code":          "INVALID_REMOVAL_STAGE",
			"current_stage": existingEvent.Stage.String(),
		})
		return
	}

	participantEvents, err := h.eventRepo.GetByParticipant(participantID)
	isRegistered := false
	if err == nil {
		for _, evt := range participantEvents {
			if evt.ID.String() == eventID {
				isRegistered = true
				break
			}
		}
	}

	if !isRegistered {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Participant is not registered for this event",
			"code":  "NOT_REGISTERED",
		})
		return
	}

	// Remove participant from event
	if err := h.eventRepo.RemoveParticipant(eventID, participantID); err != nil {
		h.log.Error("failed to remove participant", "event_id", eventID, "participant_id", participantID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to remove participant",
			"code":  "REMOVAL_ERROR",
		})
		return
	}

	h.log.Info("participant removed successfully", "event_id", eventID, "participant_id", participantID)

	c.JSON(http.StatusOK, gin.H{
		"message": "Participant removed successfully",
		"code":    "PARTICIPANT_REMOVED",
	})
}

// GetShareableEventInfo handles GET /api/events/{event_id}/share
// Returns metadata for social media sharing (Open Graph, Twitter Card)
func (h *EventHandler) GetShareableEventInfo(c *gin.Context) {
	eventID := c.Param("event_id")

	h.log.Debug("retrieving shareable event info", "event_id", eventID)

	// Validate UUID format
	if _, err := uuid.Parse(eventID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid event_id format",
			"code":  "INVALID_EVENT_ID",
		})
		return
	}

	// Get the event
	eventObj, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Event not found",
			"code":  "EVENT_NOT_FOUND",
		})
		return
	}

	if !eventVisibleTo(c, eventObj) {
		respondEventNotFound(c)
		return
	}

	// Build shareable URL (frontend URL + shareable_link)
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	baseURL := h.config.Server.FrontendURL
	if baseURL == "" {
		baseURL = scheme + "://" + c.Request.Host
	}
	shareURL := baseURL + eventObj.ShareableLink

	// Build description excerpt (first 200 chars)
	description := eventObj.Description
	if len(description) > 200 {
		description = description[:197] + "..."
	}

	// Get statistics
	participants, _ := h.userRepo.GetEventParticipants(eventID)
	attachments, _ := h.attachmentRepo.GetByEventID(eventID)

	ogImageURL := baseURL + "/og-image.png"

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"title":          eventObj.Name,
			"description":    description,
			"share_url":      shareURL,
			"shareable_link": eventObj.ShareableLink,
			"image_url":      ogImageURL,
			"stage":          eventObj.Stage.String(),
			"start_date":     eventObj.StartDate.Format("2006-01-02"),
			"end_date":       eventObj.EndDate.Format("2006-01-02"),
			"organizer":      eventObj.Organizer,
		},
		"statistics": gin.H{
			"participants_count": len(participants),
			"attachments_count":  len(attachments),
		},
		"social_meta": gin.H{
			"og_title":            eventObj.Name,
			"og_description":      description,
			"og_type":             "website",
			"og_url":              shareURL,
			"og_image":            ogImageURL,
			"twitter_card":        "summary_large_image",
			"twitter_title":       eventObj.Name,
			"twitter_description": description,
			"twitter_image":       ogImageURL,
		},
	})
}

// CancelEvent handles PATCH /api/v1/events/{event_id}/cancel
// Marks an event as cancelled and notifies all participants via email.
func (h *EventHandler) CancelEvent(c *gin.Context) {
	eventID := c.Param("event_id")

	h.log.Debug("cancelling event", "event_id", eventID)

	if _, err := uuid.Parse(eventID); err != nil {
		h.log.Warn("invalid event_id format", "event_id", eventID, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid event_id format",
			"code":  "INVALID_EVENT_ID",
		})
		return
	}

	existingEvent, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		h.log.Error("event not found", "event_id", eventID, "error", err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Event not found",
			"code":  "EVENT_NOT_FOUND",
		})
		return
	}

	if existingEvent.IsCancelled {
		h.log.Warn("event already cancelled", "event_id", eventID)
		c.JSON(http.StatusConflict, gin.H{
			"error": "Event is already cancelled",
			"code":  "ALREADY_CANCELLED",
		})
		return
	}

	if err := h.eventRepo.CancelEvent(eventID); err != nil {
		h.log.Error("failed to cancel event", "event_id", eventID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to cancel event",
			"code":  "CANCEL_ERROR",
		})
		return
	}

	h.log.Info("event cancelled successfully", "event_id", eventID)

	if ids, ok := h.participantIDs(eventID); ok {
		h.notify(existingEvent.ID, notification.TypeEventCancelled, ids, nil)
	}

	// Notify participants asynchronously
	go func() {
		participants, err := h.userRepo.GetEventParticipants(eventID)
		if err != nil {
			h.log.Warn("failed to get participants for cancellation email", "event_id", eventID, "error", err)
			return
		}
		emails := make([]string, 0, len(participants))
		for _, p := range participants {
			emails = append(emails, p.Email)
		}
		if err := h.emailService.SendCancellationNotification(existingEvent.Name, emails); err != nil {
			h.log.Warn("failed to send cancellation emails", "event_id", eventID, "error", err)
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":           existingEvent.ID.String(),
			"name":         existingEvent.Name,
			"stage":        existingEvent.Stage.String(),
			"is_cancelled": true,
		},
		"message": "Event cancelled successfully",
		"code":    "EVENT_CANCELLED",
	})
}

// PauseEvent handles PATCH /api/v1/events/{event_id}/pause
// Toggles the paused state of an event. Notifies participants when pausing.
func (h *EventHandler) PauseEvent(c *gin.Context) {
	eventID := c.Param("event_id")

	h.log.Debug("toggling event pause", "event_id", eventID)

	if _, err := uuid.Parse(eventID); err != nil {
		h.log.Warn("invalid event_id format", "event_id", eventID, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid event_id format",
			"code":  "INVALID_EVENT_ID",
		})
		return
	}

	existingEvent, err := h.eventRepo.GetByID(eventID)
	if err != nil {
		h.log.Error("event not found", "event_id", eventID, "error", err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Event not found",
			"code":  "EVENT_NOT_FOUND",
		})
		return
	}

	if existingEvent.IsCancelled {
		h.log.Warn("cannot pause cancelled event", "event_id", eventID)
		c.JSON(http.StatusConflict, gin.H{
			"error": "Cannot pause a cancelled event",
			"code":  "EVENT_CANCELLED",
		})
		return
	}

	newPausedState := !existingEvent.IsPaused
	if err := h.eventRepo.PauseEvent(eventID, newPausedState); err != nil {
		h.log.Error("failed to toggle event pause", "event_id", eventID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update event",
			"code":  "UPDATE_ERROR",
		})
		return
	}

	h.log.Info("event pause toggled", "event_id", eventID, "is_paused", newPausedState)

	if newPausedState {
		if ids, ok := h.participantIDs(eventID); ok {
			h.notify(existingEvent.ID, notification.TypeEventPaused, ids, nil)
		}
	}

	// Notify participants when pausing (not when unpausing)
	if newPausedState {
		go func() {
			participants, err := h.userRepo.GetEventParticipants(eventID)
			if err != nil {
				h.log.Warn("failed to get participants for pause email", "event_id", eventID, "error", err)
				return
			}
			emails := make([]string, 0, len(participants))
			for _, p := range participants {
				emails = append(emails, p.Email)
			}
			if err := h.emailService.SendPauseNotification(existingEvent.Name, emails); err != nil {
				h.log.Warn("failed to send pause emails", "event_id", eventID, "error", err)
			}
		}()
	}

	message := "Event paused successfully"
	code := "EVENT_PAUSED"
	if !newPausedState {
		message = "Event resumed successfully"
		code = "EVENT_RESUMED"
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":        existingEvent.ID.String(),
			"name":      existingEvent.Name,
			"stage":     existingEvent.Stage.String(),
			"is_paused": newPausedState,
		},
		"message": message,
		"code":    code,
	})
}

// formatDatePtr formats a time pointer to YYYY-MM-DD string or returns nil
func formatDatePtr(t *time.Time) interface{} {
	if t == nil {
		return nil
	}
	return t.Format("2006-01-02")
}
