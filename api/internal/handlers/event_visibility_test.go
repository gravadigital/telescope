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
	"github.com/gravadigital/telescopio-api/internal/domain/event"
	"github.com/gravadigital/telescopio-api/internal/domain/participant"
	"github.com/gravadigital/telescopio-api/internal/middleware/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// performAs is performRequest with the identity JWT middleware would leave in the
// context. A zero userID means anonymous.
func performAs(t *testing.T, method string, handlerFunc gin.HandlerFunc, params gin.Params, query string, body interface{}, userID uuid.UUID, role participant.Role) *httptest.ResponseRecorder {
	t.Helper()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	var raw []byte
	switch b := body.(type) {
	case nil:
	case string:
		raw = []byte(b)
	default:
		var err error
		raw, err = json.Marshal(b)
		require.NoError(t, err)
	}
	url := "/test"
	if query != "" {
		url += "?" + query
	}
	req := httptest.NewRequest(method, url, bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	c.Request = req
	c.Params = params
	if userID != uuid.Nil {
		c.Set("user_id", userID.String())
		c.Set("user_role", role)
	}

	handlerFunc(c)
	return w
}

func eventParams(e *event.Event) gin.Params {
	return gin.Params{{Key: "event_id", Value: e.ID.String()}}
}

func newDraftEvent(authorID uuid.UUID) *event.Event {
	e := event.NewEvent("Borrador Andes", "desc", authorID, time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.Stage = event.StageCreation
	return e
}

func assertEventNotFound(t *testing.T, w *httptest.ResponseRecorder) {
	t.Helper()
	require.Equal(t, http.StatusNotFound, w.Code, w.Body.String())
	assert.JSONEq(t, `{"error":"Event not found","code":"EVENT_NOT_FOUND"}`, w.Body.String())
}

func TestEventVisibleTo(t *testing.T) {
	authorID := uuid.New()
	draft := newDraftEvent(authorID)
	public := newDraftEvent(authorID)
	public.Stage = event.StageParticipation

	tests := []struct {
		name   string
		evt    *event.Event
		userID uuid.UUID
		role   participant.Role
		want   bool
	}{
		{"creation anonymous", draft, uuid.Nil, "", false},
		{"creation other user", draft, uuid.New(), participant.RoleParticipant, false},
		{"creation author", draft, authorID, participant.RoleOrganizer, true},
		{"creation admin", draft, uuid.New(), participant.RoleAdmin, true},
		{"participation anonymous", public, uuid.Nil, "", true},
		{"participation other user", public, uuid.New(), participant.RoleParticipant, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			if tt.userID != uuid.Nil {
				c.Set("user_id", tt.userID.String())
				c.Set("user_role", tt.role)
			}
			assert.Equal(t, tt.want, eventVisibleTo(c, tt.evt))
		})
	}
}

func TestGetEvent_HiddenInCreation(t *testing.T) {
	s := newTestEventHandlerSet()
	authorID := uuid.New()
	draft := newDraftEvent(authorID)
	s.eventRepo.addEvent(draft)

	w := performAs(t, http.MethodGet, s.handler.GetEvent, eventParams(draft), "", nil, uuid.Nil, "")
	assertEventNotFound(t, w)

	w = performAs(t, http.MethodGet, s.handler.GetEvent, eventParams(draft), "", nil, uuid.New(), participant.RoleParticipant)
	assertEventNotFound(t, w)

	w = performAs(t, http.MethodGet, s.handler.GetEvent, eventParams(draft), "", nil, authorID, participant.RoleOrganizer)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	data := jsonBody(t, w)["data"].(map[string]interface{})
	assert.Equal(t, "creation", data["stage"])
	assert.Equal(t, float64(0), data["participants_count"])

	w = performAs(t, http.MethodGet, s.handler.GetEvent, eventParams(draft), "", nil, uuid.New(), participant.RoleAdmin)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
}

func TestGetEvent_PublicOutsideCreation(t *testing.T) {
	s := newTestEventHandlerSet()
	e, _ := newRegisterableEvent()
	s.eventRepo.addEvent(e)

	w := performAs(t, http.MethodGet, s.handler.GetEvent, eventParams(e), "", nil, uuid.Nil, "")
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, e.ID.String(), jsonBody(t, w)["data"].(map[string]interface{})["id"])
}

func TestGetEvent_ParticipantsCount(t *testing.T) {
	s := newTestEventHandlerSet()
	e, _ := newRegisterableEvent()
	s.eventRepo.addEvent(e)
	setEventParticipantCount(s, e.ID.String(), 12)

	w := performAs(t, http.MethodGet, s.handler.GetEvent, eventParams(e), "", nil, uuid.Nil, "")
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, float64(12), jsonBody(t, w)["data"].(map[string]interface{})["participants_count"])
}

func TestGetShareableEventInfo_HiddenInCreation(t *testing.T) {
	s := newTestEventHandlerSet()
	authorID := uuid.New()
	draft := newDraftEvent(authorID)
	s.eventRepo.addEvent(draft)

	assertEventNotFound(t, performAs(t, http.MethodGet, s.handler.GetShareableEventInfo, eventParams(draft), "", nil, uuid.Nil, ""))

	w := performAs(t, http.MethodGet, s.handler.GetShareableEventInfo, eventParams(draft), "", nil, authorID, participant.RoleOrganizer)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, "Borrador Andes", jsonBody(t, w)["data"].(map[string]interface{})["title"])
}

func TestGetEventParticipants_HiddenInCreation(t *testing.T) {
	s := newTestEventHandlerSet()
	authorID := uuid.New()
	draft := newDraftEvent(authorID)
	s.eventRepo.addEvent(draft)

	assertEventNotFound(t, performAs(t, http.MethodGet, s.handler.GetEventParticipants, eventParams(draft), "", nil, uuid.New(), participant.RoleParticipant))

	w := performAs(t, http.MethodGet, s.handler.GetEventParticipants, eventParams(draft), "", nil, authorID, participant.RoleOrganizer)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Equal(t, float64(0), resp["count"])
	assert.Equal(t, "creation", resp["data"].(map[string]interface{})["event"].(map[string]interface{})["stage"])
}

func TestRegisterParticipant_HiddenInCreationDoesNotRevealStage(t *testing.T) {
	s := newTestEventHandlerSet()
	draft := newDraftEvent(uuid.New())
	s.eventRepo.addEvent(draft)

	body := map[string]interface{}{"participant_name": "Luz Pérez", "participant_email": "luz@example.com"}
	w := performAs(t, http.MethodPost, s.handler.RegisterParticipant, eventParams(draft), "", body, uuid.Nil, "")

	assertEventNotFound(t, w)
	_, err := s.userRepo.GetByEmail("luz@example.com")
	assert.Error(t, err, "no user may be created for a hidden event")
}

func TestGetEventAttachments_HiddenInCreation(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	authorID := uuid.New()
	draft := newDraftEvent(authorID)
	s.eventRepo.addEvent(draft)

	assertEventNotFound(t, performAs(t, http.MethodGet, s.handler.GetEventAttachments, eventParams(draft), "", nil, uuid.New(), participant.RoleParticipant))

	w := performAs(t, http.MethodGet, s.handler.GetEventAttachments, eventParams(draft), "", nil, authorID, participant.RoleOrganizer)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.JSONEq(t, `{"data":[],"count":0}`, w.Body.String())
}

func TestGetEventAttachments_UnknownEventStillReturnsEmptyList(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	missing := &event.Event{ID: uuid.New()}

	w := performAs(t, http.MethodGet, s.handler.GetEventAttachments, eventParams(missing), "", nil, uuid.New(), participant.RoleParticipant)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.JSONEq(t, `{"data":[],"count":0}`, w.Body.String())
}

func TestGetVotingStatistics_HiddenInCreation(t *testing.T) {
	s := newTestHandlerSet()
	draft := newDraftEvent(uuid.New())
	s.eventRepo.addEvent(draft)
	public := newParticipationEvent()
	s.eventRepo.addEvent(public)

	assertEventNotFound(t, performAs(t, http.MethodGet, s.handler.GetVotingStatistics, eventParams(draft), "", nil, uuid.Nil, ""))

	w := performAs(t, http.MethodGet, s.handler.GetVotingStatistics, eventParams(public), "", nil, uuid.Nil, "")
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, public.ID.String(), jsonBody(t, w)["data"].(map[string]interface{})["event_id"])
}

// publicEventsRouter replicates the eventsPublic group of cmd/api/main.go.
func publicEventsRouter(s *testEventHandlerSet) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	g := r.Group("/api/v1/events")
	g.Use(auth.OptionalJWTAuthMiddleware())
	g.GET("/:event_id", s.handler.GetEvent)
	return r
}

func TestPublicEventsRoute_InvalidTokenIsAnonymousNeverUnauthorized(t *testing.T) {
	s := newTestEventHandlerSet()
	public, authorID := newRegisterableEvent()
	draft := newDraftEvent(authorID)
	s.eventRepo.addEvent(public)
	s.eventRepo.addEvent(draft)
	r := publicEventsRouter(s)

	get := func(id uuid.UUID, header string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/events/"+id.String(), nil)
		req.Header.Set("Authorization", header)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}

	w := get(public.ID, "Bearer not-a-jwt")
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())

	// A bad token is not an identity, even if it claims to be the author.
	assertEventNotFound(t, get(draft.ID, "Bearer not-a-jwt"))

	token, err := auth.GenerateToken(authorID, "ana@example.com", participant.RoleOrganizer)
	require.NoError(t, err)
	w = get(draft.ID, "Bearer "+token)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
}

func userParams(id uuid.UUID) gin.Params {
	return gin.Params{{Key: "user_id", Value: id.String()}}
}

func jsonBodyOrNil(t *testing.T, raw []byte) map[string]interface{} {
	t.Helper()
	var out map[string]interface{}
	require.NoError(t, json.Unmarshal(raw, &out), string(raw))
	return out
}
