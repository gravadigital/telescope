package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/config"
	"github.com/gravadigital/telescopio-api/internal/domain/attachment"
	"github.com/gravadigital/telescopio-api/internal/domain/event"
	"github.com/gravadigital/telescopio-api/internal/domain/participant"
	"github.com/gravadigital/telescopio-api/internal/email"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testEventHandlerSet bundles the mock repositories an EventHandler needs.
type testEventHandlerSet struct {
	eventRepo      *mockEventRepository
	userRepo       *mockUserRepository
	attachmentRepo *mockAttachmentRepository
	handler        *EventHandler
}

func newTestEventHandlerSet() *testEventHandlerSet {
	s := &testEventHandlerSet{
		eventRepo:      newMockEventRepository(),
		userRepo:       newMockUserRepository(),
		attachmentRepo: newMockAttachmentRepository(),
	}
	// Email disabled by default config, so goroutine-fired notifications are
	// no-ops and won't panic or block on a real SMTP connection.
	s.handler = NewEventHandler(s.eventRepo, s.userRepo, s.attachmentRepo, email.NewEmailService(&config.Config{}), &config.Config{})
	return s
}

func dateStr(t time.Time) string {
	return t.Format("2006-01-02")
}

// performAuthedRequest is like performRequest but also injects a "user_id"
// into the Gin context, mimicking the JWT auth middleware.
func performAuthedRequest(t *testing.T, method string, handlerFunc gin.HandlerFunc, params gin.Params, userID string, body interface{}) *httptest.ResponseRecorder {
	t.Helper()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	var bodyReader *bytes.Reader
	if body != nil {
		b, err := json.Marshal(body)
		require.NoError(t, err)
		bodyReader = bytes.NewReader(b)
	} else {
		bodyReader = bytes.NewReader(nil)
	}

	req := httptest.NewRequest(method, "/test", bodyReader)
	req.Header.Set("Content-Type", "application/json")
	c.Request = req
	c.Params = params
	if userID != "" {
		c.Set("user_id", userID)
	}

	handlerFunc(c)
	return w
}

// ---------------------------------------------------------------------------
// CreateEvent
// ---------------------------------------------------------------------------

func TestCreateEvent_Success(t *testing.T) {
	s := newTestEventHandlerSet()
	author := participant.NewOrganizer("Ana", "Author", "author@example.com")
	s.userRepo.addUser(author)

	body := map[string]interface{}{
		"name":        "Star Party",
		"description": "An evening of telescope observation.",
		"start_date":  dateStr(time.Now().AddDate(0, 0, 5)),
		"end_date":    dateStr(time.Now().AddDate(0, 0, 6)),
		"organizer":   "Astro Club",
	}
	w := performAuthedRequest(t, http.MethodPost, s.handler.CreateEvent, nil, author.ID.String(), body)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Equal(t, "EVENT_CREATED", resp["code"])
}

func TestCreateEvent_RejectsUnauthenticated(t *testing.T) {
	s := newTestEventHandlerSet()
	body := map[string]interface{}{
		"name":        "Star Party",
		"description": "An evening of telescope observation.",
		"start_date":  dateStr(time.Now().AddDate(0, 0, 5)),
		"end_date":    dateStr(time.Now().AddDate(0, 0, 6)),
	}
	w := performAuthedRequest(t, http.MethodPost, s.handler.CreateEvent, nil, "", body)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestCreateEvent_RejectsPastStartDate(t *testing.T) {
	s := newTestEventHandlerSet()
	author := participant.NewOrganizer("Ana", "Author", "author@example.com")
	s.userRepo.addUser(author)

	body := map[string]interface{}{
		"name":        "Star Party",
		"description": "An evening of telescope observation.",
		"start_date":  dateStr(time.Now().AddDate(0, 0, -1)),
		"end_date":    dateStr(time.Now().AddDate(0, 0, 1)),
	}
	w := performAuthedRequest(t, http.MethodPost, s.handler.CreateEvent, nil, author.ID.String(), body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "PAST_START_DATE", jsonBody(t, w)["code"])
}

func TestCreateEvent_RejectsEndBeforeStart(t *testing.T) {
	s := newTestEventHandlerSet()
	author := participant.NewOrganizer("Ana", "Author", "author@example.com")
	s.userRepo.addUser(author)

	body := map[string]interface{}{
		"name":        "Star Party",
		"description": "An evening of telescope observation.",
		"start_date":  dateStr(time.Now().AddDate(0, 0, 5)),
		"end_date":    dateStr(time.Now().AddDate(0, 0, 1)),
	}
	w := performAuthedRequest(t, http.MethodPost, s.handler.CreateEvent, nil, author.ID.String(), body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_DATE_RANGE", jsonBody(t, w)["code"])
}

func TestCreateEvent_RejectsDurationTooShort(t *testing.T) {
	s := newTestEventHandlerSet()
	author := participant.NewOrganizer("Ana", "Author", "author@example.com")
	s.userRepo.addUser(author)

	sameDay := dateStr(time.Now().AddDate(0, 0, 3))
	body := map[string]interface{}{
		"name":        "Star Party",
		"description": "An evening of telescope observation.",
		"start_date":  sameDay,
		"end_date":    sameDay,
	}
	w := performAuthedRequest(t, http.MethodPost, s.handler.CreateEvent, nil, author.ID.String(), body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "DURATION_TOO_SHORT", jsonBody(t, w)["code"])
}

func TestCreateEvent_RejectsDurationTooLong(t *testing.T) {
	s := newTestEventHandlerSet()
	author := participant.NewOrganizer("Ana", "Author", "author@example.com")
	s.userRepo.addUser(author)

	body := map[string]interface{}{
		"name":        "Star Party",
		"description": "An evening of telescope observation.",
		"start_date":  dateStr(time.Now().AddDate(0, 0, 1)),
		"end_date":    dateStr(time.Now().AddDate(2, 0, 0)),
	}
	w := performAuthedRequest(t, http.MethodPost, s.handler.CreateEvent, nil, author.ID.String(), body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "DURATION_TOO_LONG", jsonBody(t, w)["code"])
}

func TestCreateEvent_RejectsDuplicateName(t *testing.T) {
	s := newTestEventHandlerSet()
	author := participant.NewOrganizer("Ana", "Author", "author@example.com")
	s.userRepo.addUser(author)
	existing := event.NewEvent("Star Party", "desc", author.ID, time.Now(), time.Now().AddDate(0, 0, 1), "org")
	s.eventRepo.addEvent(existing)

	body := map[string]interface{}{
		"name":        "Star Party",
		"description": "An evening of telescope observation.",
		"start_date":  dateStr(time.Now().AddDate(0, 0, 5)),
		"end_date":    dateStr(time.Now().AddDate(0, 0, 6)),
	}
	w := performAuthedRequest(t, http.MethodPost, s.handler.CreateEvent, nil, author.ID.String(), body)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Equal(t, "DUPLICATE_EVENT_NAME", jsonBody(t, w)["code"])
}

func TestCreateEvent_RejectsMaxParticipantsBelowOne(t *testing.T) {
	s := newTestEventHandlerSet()
	author := participant.NewOrganizer("Ana", "Author", "author@example.com")
	s.userRepo.addUser(author)

	body := map[string]interface{}{
		"name":             "Star Party",
		"description":      "An evening of telescope observation.",
		"start_date":       dateStr(time.Now().AddDate(0, 0, 5)),
		"end_date":         dateStr(time.Now().AddDate(0, 0, 6)),
		"max_participants": 0,
	}
	w := performAuthedRequest(t, http.MethodPost, s.handler.CreateEvent, nil, author.ID.String(), body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_MAX_PARTICIPANTS", jsonBody(t, w)["code"])
}

func TestCreateEvent_RejectsMaxParticipantsAboveLimit(t *testing.T) {
	s := newTestEventHandlerSet()
	author := participant.NewOrganizer("Ana", "Author", "author@example.com")
	s.userRepo.addUser(author)

	body := map[string]interface{}{
		"name":             "Star Party",
		"description":      "An evening of telescope observation.",
		"start_date":       dateStr(time.Now().AddDate(0, 0, 5)),
		"end_date":         dateStr(time.Now().AddDate(0, 0, 6)),
		"max_participants": 101,
	}
	w := performAuthedRequest(t, http.MethodPost, s.handler.CreateEvent, nil, author.ID.String(), body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "MAX_PARTICIPANTS_LIMIT_EXCEEDED", jsonBody(t, w)["code"])
}

func TestCreateEvent_AcceptsValidMaxParticipants(t *testing.T) {
	s := newTestEventHandlerSet()
	author := participant.NewOrganizer("Ana", "Author", "author@example.com")
	s.userRepo.addUser(author)

	body := map[string]interface{}{
		"name":             "Star Party",
		"description":      "An evening of telescope observation.",
		"start_date":       dateStr(time.Now().AddDate(0, 0, 5)),
		"end_date":         dateStr(time.Now().AddDate(0, 0, 6)),
		"max_participants": 50,
	}
	w := performAuthedRequest(t, http.MethodPost, s.handler.CreateEvent, nil, author.ID.String(), body)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	data := jsonBody(t, w)["event"].(map[string]interface{})
	assert.Equal(t, float64(50), data["max_participants"])
}

// ---------------------------------------------------------------------------
// UpdateEventStage — the stage machine gate for voting eligibility
// ---------------------------------------------------------------------------

func TestUpdateEventStage_RejectsInvalidTransition(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.Stage = event.StageCreation
	s.eventRepo.addEvent(e)

	body := map[string]interface{}{"stage": "voting"} // creation -> voting is not allowed directly
	w := performAuthedRequest(t, http.MethodPatch, s.handler.UpdateEventStage,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_TRANSITION", jsonBody(t, w)["code"])
}

func TestUpdateEventStage_RequiresEstimatedDateForParticipation(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.Stage = event.StageCreation
	s.eventRepo.addEvent(e)

	body := map[string]interface{}{"stage": "participation"}
	w := performAuthedRequest(t, http.MethodPatch, s.handler.UpdateEventStage,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "MISSING_ESTIMATED_DATE", jsonBody(t, w)["code"])
}

func TestUpdateEventStage_RejectsVotingWithoutAttachments(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.Stage = event.StageParticipation
	s.eventRepo.addEvent(e)

	body := map[string]interface{}{"stage": "voting", "estimated_end_date": dateStr(time.Now().AddDate(0, 0, 3))}
	w := performAuthedRequest(t, http.MethodPatch, s.handler.UpdateEventStage,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "NO_ATTACHMENTS", jsonBody(t, w)["code"])
}

func TestUpdateEventStage_RejectsVotingWithSingleAttachment(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.Stage = event.StageParticipation
	s.eventRepo.addEvent(e)
	a := attachmentFor(e.ID, uuid.New())
	s.attachmentRepo.addAttachment(a)

	body := map[string]interface{}{"stage": "voting", "estimated_end_date": dateStr(time.Now().AddDate(0, 0, 3))}
	w := performAuthedRequest(t, http.MethodPatch, s.handler.UpdateEventStage,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INSUFFICIENT_ATTACHMENTS", jsonBody(t, w)["code"])
}

func TestUpdateEventStage_AllowsVotingWithTwoAttachments(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.Stage = event.StageParticipation
	s.eventRepo.addEvent(e)
	s.attachmentRepo.addAttachment(attachmentFor(e.ID, uuid.New()))
	s.attachmentRepo.addAttachment(attachmentFor(e.ID, uuid.New()))
	s.userRepo.setEventParticipants(e.ID.String(), nil)

	body := map[string]interface{}{"stage": "voting", "estimated_end_date": dateStr(time.Now().AddDate(0, 0, 3))}
	w := performAuthedRequest(t, http.MethodPatch, s.handler.UpdateEventStage,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, "STAGE_UPDATED", jsonBody(t, w)["code"])
}

func TestUpdateEventStage_RejectsPastEstimatedDate(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.Stage = event.StageCreation
	s.eventRepo.addEvent(e)

	body := map[string]interface{}{"stage": "participation", "estimated_end_date": dateStr(time.Now().AddDate(0, 0, -2))}
	w := performAuthedRequest(t, http.MethodPatch, s.handler.UpdateEventStage,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_ESTIMATED_DATE", jsonBody(t, w)["code"])
}

// ---------------------------------------------------------------------------
// UpdateEstimatedEndDate — includes the disabled "no advancing deadlines"
// business rule (dead code: `if false && ...`), which we document rather
// than silently rely on.
// ---------------------------------------------------------------------------

func TestUpdateEstimatedEndDate_RejectsWrongStage(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.Stage = event.StageVoting
	s.eventRepo.addEvent(e)

	body := map[string]interface{}{"stage": "participation", "estimated_end_date": dateStr(time.Now().AddDate(0, 0, 3))}
	w := performAuthedRequest(t, http.MethodPatch, s.handler.UpdateEstimatedEndDate,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_STAGE_FOR_EDIT", jsonBody(t, w)["code"])
}

// TestUpdateEstimatedEndDate_RejectsAdvancingDeadline is a regression test
// for a fix applied after review: the handler used to have a fully-written
// check to reject advancing a deadline earlier than it already is, but it
// was guarded behind `if false && ...` and so never actually ran - the
// organizer could silently advance a deadline for a stage already in
// progress. The guard has been removed so the restriction is enforced again:
// once a stage's estimated end date is set and hasn't passed yet, it can
// only be postponed, never brought forward.
func TestUpdateEstimatedEndDate_RejectsAdvancingDeadline(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 10), "org")
	e.Stage = event.StageParticipation
	farFuture := time.Now().AddDate(0, 0, 8)
	e.ParticipationEstimatedEndDate = &farFuture
	s.eventRepo.addEvent(e)

	// Try to move the deadline earlier than the current one.
	nearer := time.Now().AddDate(0, 0, 2)
	body := map[string]interface{}{"stage": "participation", "estimated_end_date": dateStr(nearer)}
	w := performAuthedRequest(t, http.MethodPatch, s.handler.UpdateEstimatedEndDate,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
	assert.Equal(t, "CANNOT_ADVANCE_DEADLINE", jsonBody(t, w)["code"])
}

func TestUpdateEstimatedEndDate_AllowsPostponingDeadline(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 10), "org")
	e.Stage = event.StageParticipation
	current := time.Now().AddDate(0, 0, 2)
	e.ParticipationEstimatedEndDate = &current
	s.eventRepo.addEvent(e)

	// Move the deadline later than the current one.
	later := time.Now().AddDate(0, 0, 8)
	body := map[string]interface{}{"stage": "participation", "estimated_end_date": dateStr(later)}
	w := performAuthedRequest(t, http.MethodPatch, s.handler.UpdateEstimatedEndDate,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, "ESTIMATED_DATE_UPDATED", jsonBody(t, w)["code"])
}

// TestUpdateEstimatedEndDate_AllowsAdvancingWhenNoCurrentDeadline covers the
// case where the stage has no estimated end date set yet - there is nothing
// to "advance", so the restriction (which only applies when currentDate !=
// nil) must not block setting an initial date.
func TestUpdateEstimatedEndDate_AllowsAdvancingWhenNoCurrentDeadline(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 10), "org")
	e.Stage = event.StageParticipation // ParticipationEstimatedEndDate left nil
	s.eventRepo.addEvent(e)

	body := map[string]interface{}{"stage": "participation", "estimated_end_date": dateStr(time.Now().AddDate(0, 0, 2))}
	w := performAuthedRequest(t, http.MethodPatch, s.handler.UpdateEstimatedEndDate,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusOK, w.Code, w.Body.String())
}

// ---------------------------------------------------------------------------
// RegisterParticipant
// ---------------------------------------------------------------------------

func newRegisterableEvent() (*event.Event, uuid.UUID) {
	authorID := uuid.New()
	e := event.NewEvent("Event", "desc", authorID, time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.Stage = event.StageParticipation
	return e, authorID
}

func TestRegisterParticipant_Success(t *testing.T) {
	s := newTestEventHandlerSet()
	e, _ := newRegisterableEvent()
	s.eventRepo.addEvent(e)

	body := map[string]interface{}{"participant_name": "New Person", "participant_email": "new@example.com"}
	w := performRequest(t, http.MethodPost, s.handler.RegisterParticipant,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	assert.Equal(t, "PARTICIPANT_REGISTERED", jsonBody(t, w)["code"])
}

func TestRegisterParticipant_RejectsWrongStage(t *testing.T) {
	s := newTestEventHandlerSet()
	e, _ := newRegisterableEvent()
	e.Stage = event.StageCreation
	s.eventRepo.addEvent(e)

	body := map[string]interface{}{"participant_name": "New Person", "participant_email": "new@example.com"}
	w := performRequest(t, http.MethodPost, s.handler.RegisterParticipant,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_REGISTRATION_STAGE", jsonBody(t, w)["code"])
}

func TestRegisterParticipant_RejectsPausedEvent(t *testing.T) {
	s := newTestEventHandlerSet()
	e, _ := newRegisterableEvent()
	e.IsPaused = true
	s.eventRepo.addEvent(e)

	body := map[string]interface{}{"participant_name": "New Person", "participant_email": "new@example.com"}
	w := performRequest(t, http.MethodPost, s.handler.RegisterParticipant,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Equal(t, "EVENT_PAUSED", jsonBody(t, w)["code"])
}

func TestRegisterParticipant_RejectsCreatorSelfRegistration(t *testing.T) {
	s := newTestEventHandlerSet()
	e, authorID := newRegisterableEvent()
	s.eventRepo.addEvent(e)
	author := &participant.User{ID: authorID, Name: "Author", Email: "author@example.com", Role: participant.RoleOrganizer}
	s.userRepo.addUser(author)

	body := map[string]interface{}{"participant_name": "Author", "participant_email": "author@example.com"}
	w := performRequest(t, http.MethodPost, s.handler.RegisterParticipant,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "CREATOR_CANNOT_REGISTER", jsonBody(t, w)["code"])
}

func TestRegisterParticipant_RejectsDuplicateRegistration(t *testing.T) {
	s := newTestEventHandlerSet()
	e, _ := newRegisterableEvent()
	s.eventRepo.addEvent(e)
	existing := participant.NewParticipant("Existing", "Person", "existing@example.com")
	s.userRepo.addUser(existing)
	s.eventRepo.byParticipant[existing.ID.String()] = []*event.Event{e}

	body := map[string]interface{}{"participant_name": "Existing", "participant_email": "existing@example.com"}
	w := performRequest(t, http.MethodPost, s.handler.RegisterParticipant,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Equal(t, "ALREADY_REGISTERED", jsonBody(t, w)["code"])
}

func TestRegisterParticipant_RejectsWhenMaxParticipantsReached(t *testing.T) {
	s := newTestEventHandlerSet()
	e, _ := newRegisterableEvent()
	maxP := 1
	e.MaxParticipants = &maxP
	s.eventRepo.addEvent(e)

	existing := participant.NewParticipant("Existing", "Person", "existing@example.com")
	s.userRepo.addUser(existing)
	s.userRepo.setEventParticipants(e.ID.String(), []*participant.UserWithEventRole{
		{User: *existing, EventRole: "participant"},
	})

	body := map[string]interface{}{"participant_name": "New Person", "participant_email": "new@example.com"}
	w := performRequest(t, http.MethodPost, s.handler.RegisterParticipant,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "MAX_PARTICIPANTS_REACHED", jsonBody(t, w)["code"])
}

func TestRegisterParticipant_UsesDefaultMaxParticipantsOfTwenty(t *testing.T) {
	s := newTestEventHandlerSet()
	e, _ := newRegisterableEvent() // MaxParticipants left nil -> default 20
	s.eventRepo.addEvent(e)

	existingUsers := make([]*participant.UserWithEventRole, 20)
	for i := 0; i < 20; i++ {
		u := participant.NewParticipant("P", "P", uuid.NewString()+"@example.com")
		existingUsers[i] = &participant.UserWithEventRole{User: *u, EventRole: "participant"}
	}
	s.userRepo.setEventParticipants(e.ID.String(), existingUsers)

	body := map[string]interface{}{"participant_name": "New Person", "participant_email": "new21@example.com"}
	w := performRequest(t, http.MethodPost, s.handler.RegisterParticipant,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	resp := jsonBody(t, w)
	assert.Equal(t, "MAX_PARTICIPANTS_REACHED", resp["code"])
	assert.Equal(t, float64(20), resp["max_participants"])
}

// ---------------------------------------------------------------------------
// RemoveParticipant
// ---------------------------------------------------------------------------

func TestRemoveParticipant_RejectsNotRegistered(t *testing.T) {
	s := newTestEventHandlerSet()
	e, _ := newRegisterableEvent()
	s.eventRepo.addEvent(e)

	w := performRequest(t, http.MethodDelete, s.handler.RemoveParticipant,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: uuid.New().String()}}, "", nil)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, "NOT_REGISTERED", jsonBody(t, w)["code"])
}

func TestRemoveParticipant_RejectsWrongStage(t *testing.T) {
	s := newTestEventHandlerSet()
	e, _ := newRegisterableEvent()
	e.Stage = event.StageVoting
	s.eventRepo.addEvent(e)

	w := performRequest(t, http.MethodDelete, s.handler.RemoveParticipant,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: uuid.New().String()}}, "", nil)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_REMOVAL_STAGE", jsonBody(t, w)["code"])
}

func TestRemoveParticipant_Success(t *testing.T) {
	s := newTestEventHandlerSet()
	e, _ := newRegisterableEvent()
	s.eventRepo.addEvent(e)
	p := participant.NewParticipant("P", "P", "p@example.com")
	s.eventRepo.byParticipant[p.ID.String()] = []*event.Event{e}

	w := performRequest(t, http.MethodDelete, s.handler.RemoveParticipant,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}}, "", nil)

	assert.Equal(t, http.StatusOK, w.Code, w.Body.String())
}

// ---------------------------------------------------------------------------
// UpdateEvent / DeleteEvent — always return 501, but only after validating
// ---------------------------------------------------------------------------

func TestUpdateEvent_ReturnsNotImplementedAfterValidation(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.Stage = event.StageCreation
	s.eventRepo.addEvent(e)

	body := map[string]interface{}{
		"name": "Event", "description": "A sufficiently long description.",
		"start_date": dateStr(time.Now().AddDate(0, 0, 5)),
		"end_date":   dateStr(time.Now().AddDate(0, 0, 6)),
	}
	w := performRequest(t, http.MethodPut, s.handler.UpdateEvent,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusNotImplemented, w.Code)
}

func TestUpdateEvent_RejectsWrongStageBeforeNotImplemented(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.Stage = event.StageVoting
	s.eventRepo.addEvent(e)

	body := map[string]interface{}{
		"name": "Event", "description": "A sufficiently long description.",
		"start_date": dateStr(time.Now().AddDate(0, 0, 5)),
		"end_date":   dateStr(time.Now().AddDate(0, 0, 6)),
	}
	w := performRequest(t, http.MethodPut, s.handler.UpdateEvent,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_UPDATE_STAGE", jsonBody(t, w)["code"])
}

func TestDeleteEvent_ReturnsNotImplementedAfterValidation(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.Stage = event.StageCreation
	s.eventRepo.addEvent(e)

	w := performRequest(t, http.MethodDelete, s.handler.DeleteEvent,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	assert.Equal(t, http.StatusNotImplemented, w.Code)
}

func TestDeleteEvent_RejectsWrongStageBeforeNotImplemented(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.Stage = event.StageVoting
	s.eventRepo.addEvent(e)

	w := performRequest(t, http.MethodDelete, s.handler.DeleteEvent,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_DELETE_STAGE", jsonBody(t, w)["code"])
}

// ---------------------------------------------------------------------------
// CancelEvent / PauseEvent
// ---------------------------------------------------------------------------

func TestCancelEvent_RejectsAlreadyCancelled(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.IsCancelled = true
	s.eventRepo.addEvent(e)

	w := performRequest(t, http.MethodPatch, s.handler.CancelEvent,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Equal(t, "ALREADY_CANCELLED", jsonBody(t, w)["code"])
}

func TestCancelEvent_Success(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	s.eventRepo.addEvent(e)

	w := performRequest(t, http.MethodPatch, s.handler.CancelEvent,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	updated, _ := s.eventRepo.GetByID(e.ID.String())
	assert.True(t, updated.IsCancelled)
}

func TestPauseEvent_RejectsCancelledEvent(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.IsCancelled = true
	s.eventRepo.addEvent(e)

	w := performRequest(t, http.MethodPatch, s.handler.PauseEvent,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Equal(t, "EVENT_CANCELLED", jsonBody(t, w)["code"])
}

func TestPauseEvent_TogglesState(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	s.eventRepo.addEvent(e)

	w1 := performRequest(t, http.MethodPatch, s.handler.PauseEvent,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)
	require.Equal(t, http.StatusOK, w1.Code, w1.Body.String())
	assert.Equal(t, "EVENT_PAUSED", jsonBody(t, w1)["code"])

	w2 := performRequest(t, http.MethodPatch, s.handler.PauseEvent,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)
	require.Equal(t, http.StatusOK, w2.Code, w2.Body.String())
	assert.Equal(t, "EVENT_RESUMED", jsonBody(t, w2)["code"])
}

// ---------------------------------------------------------------------------
// GetShareableEventInfo — truncation and URL building
// ---------------------------------------------------------------------------

func TestGetShareableEventInfo_TruncatesLongDescription(t *testing.T) {
	s := newTestEventHandlerSet()
	longDesc := make([]byte, 250)
	for i := range longDesc {
		longDesc[i] = 'a'
	}
	e := event.NewEvent("Event", string(longDesc), uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	s.eventRepo.addEvent(e)

	w := performRequest(t, http.MethodGet, s.handler.GetShareableEventInfo,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	data := jsonBody(t, w)["data"].(map[string]interface{})
	desc := data["description"].(string)
	assert.LessOrEqual(t, len(desc), 200)
	assert.Contains(t, desc, "...")
}

func TestGetShareableEventInfo_KeepsShortDescriptionUnchanged(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Event", "short description", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	s.eventRepo.addEvent(e)

	w := performRequest(t, http.MethodGet, s.handler.GetShareableEventInfo,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	data := jsonBody(t, w)["data"].(map[string]interface{})
	assert.Equal(t, "short description", data["description"])
}

// ---------------------------------------------------------------------------
// GetAllEvents — pagination and stage filtering
// ---------------------------------------------------------------------------

func TestGetAllEvents_FiltersByStage(t *testing.T) {
	s := newTestEventHandlerSet()
	creationEvent := event.NewEvent("Creation Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	votingEvent := event.NewEvent("Voting Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	votingEvent.Stage = event.StageVoting
	s.eventRepo.addEvent(creationEvent)
	s.eventRepo.addEvent(votingEvent)

	w := performRequest(t, http.MethodGet, s.handler.GetAllEvents, nil, "stage=voting", nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	data := jsonBody(t, w)["data"].([]interface{})
	require.Len(t, data, 1)
	assert.Equal(t, "Voting Event", data[0].(map[string]interface{})["name"])
}

func TestGetAllEvents_RejectsInvalidStageFilter(t *testing.T) {
	s := newTestEventHandlerSet()
	w := performRequest(t, http.MethodGet, s.handler.GetAllEvents, nil, "stage=not-a-stage", nil)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_STAGE_FILTER", jsonBody(t, w)["code"])
}

func TestGetAllEvents_PaginatesResults(t *testing.T) {
	s := newTestEventHandlerSet()
	for i := 0; i < 15; i++ {
		e := event.NewEvent(uuid.NewString(), "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
		s.eventRepo.addEvent(e)
	}

	w := performRequest(t, http.MethodGet, s.handler.GetAllEvents, nil, "page=2&limit=10", nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	data := resp["data"].([]interface{})
	assert.Len(t, data, 5) // 15 total, page 2 of size 10 -> remaining 5
	pagination := resp["pagination"].(map[string]interface{})
	assert.Equal(t, float64(15), pagination["total"])
	assert.Equal(t, float64(2), pagination["total_pages"])
}

func attachmentFor(eventID, participantID uuid.UUID) *attachment.Attachment {
	return attachment.NewAttachment(eventID, participantID, "f.jpg", "photo.jpg", "/tmp/f.jpg", "image/jpeg", 1024)
}
