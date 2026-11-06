package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
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

// ---------------------------------------------------------------------------
// CreateEvent (S-019 CA-1, CA-2, CA-10)
// ---------------------------------------------------------------------------

func createEventBody(extra map[string]interface{}) map[string]interface{} {
	body := map[string]interface{}{
		"name":        "Convocatoria 2026",
		"description": "Descripción de prueba",
		"start_date":  dateStr(time.Now().AddDate(0, 0, 1)),
		"end_date":    dateStr(time.Now().AddDate(0, 0, 10)),
	}
	for k, v := range extra {
		body[k] = v
	}
	return body
}

func TestCreateEvent_CoverColor(t *testing.T) {
	tests := []struct {
		name  string
		extra map[string]interface{}
		want  string
	}{
		{"palette color", map[string]interface{}{"cover_color": "mint"}, "mint"},
		{"last color of the palette", map[string]interface{}{"cover_color": "mist"}, "mist"},
		{"no color uses the default", nil, "lavender"},
		{"empty string uses the default", map[string]interface{}{"cover_color": ""}, "lavender"},
		{"null uses the default", map[string]interface{}{"cover_color": nil}, "lavender"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := newTestEventHandlerSet()
			author := participant.NewOrganizer("Ana", "Author", "author@example.com")
			s.userRepo.addUser(author)

			w := performAuthedRequest(t, http.MethodPost, s.handler.CreateEvent, nil, author.ID.String(), createEventBody(tt.extra))

			require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
			created := jsonBody(t, w)["event"].(map[string]interface{})
			assert.Equal(t, tt.want, created["cover_color"])
			require.Len(t, s.eventRepo.events, 1)
			for _, stored := range s.eventRepo.events {
				assert.Equal(t, event.CoverColor(tt.want), stored.CoverColor)
			}
		})
	}
}

func TestCreateEvent_RejectsCoverColorOutsideThePalette(t *testing.T) {
	for _, color := range []string{"red", "#ff0000", "Mint", " mint"} {
		t.Run(color, func(t *testing.T) {
			s := newTestEventHandlerSet()
			author := participant.NewOrganizer("Ana", "Author", "author@example.com")
			s.userRepo.addUser(author)

			w := performAuthedRequest(t, http.MethodPost, s.handler.CreateEvent, nil, author.ID.String(),
				createEventBody(map[string]interface{}{"cover_color": color}))

			require.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
			resp := jsonBody(t, w)
			assert.Equal(t, "INVALID_COVER_COLOR", resp["code"])
			assert.Contains(t, resp["details"], "lavender")
			assert.Contains(t, resp["details"], "mist")
			assert.Empty(t, s.eventRepo.events, "nothing is created")
		})
	}
}

// ---------------------------------------------------------------------------
// UpdateEvent (S-019 CA-4 to CA-7, CA-10, CA-11)
// ---------------------------------------------------------------------------

func TestUpdateEvent_CoverColorTogetherWithOtherFields(t *testing.T) {
	for _, stage := range []event.Stage{event.StageCreation, event.StageParticipation} {
		t.Run(stage.String(), func(t *testing.T) {
			f := newUpdateFixture(stage, 0)

			w := f.patch(t, map[string]interface{}{"name": "Nuevo nombre", "cover_color": "peach"})

			require.Equal(t, http.StatusOK, w.Code, w.Body.String())
			resp := jsonBody(t, w)
			assert.Equal(t, "EVENT_UPDATED", resp["code"])
			data := resp["data"].(map[string]interface{})
			assert.Equal(t, "Nuevo nombre", data["name"])
			assert.Equal(t, "peach", data["cover_color"])
			require.Len(t, f.s.eventRepo.updated, 1)
			assert.Equal(t, event.CoverColorPeach, f.s.eventRepo.updated[0].CoverColor)
		})
	}
}

func TestUpdateEvent_OnlyCoverColorIsAcceptedInAnyStage(t *testing.T) {
	for _, stage := range []event.Stage{event.StageCreation, event.StageParticipation, event.StageVoting, event.StageResult} {
		t.Run(stage.String(), func(t *testing.T) {
			f := newUpdateFixture(stage, 0)

			w := f.patch(t, map[string]interface{}{"cover_color": "sky"})

			require.Equal(t, http.StatusOK, w.Code, w.Body.String())
			data := jsonBody(t, w)["data"].(map[string]interface{})
			assert.Equal(t, "sky", data["cover_color"])
			assert.Equal(t, stage.String(), data["stage"])
			assert.Equal(t, "Semana de la Ciencia", data["name"], "the rest of the event is untouched")
			require.Len(t, f.s.eventRepo.updated, 1)
		})
	}
}

func TestUpdateEvent_OtherFieldsStayBlockedOutsideCreationAndParticipation(t *testing.T) {
	for field, value := range map[string]interface{}{
		"name":             "Otro nombre válido",
		"description":      "Otra descripción lo bastante larga.",
		"organizer":        "Otro club",
		"max_participants": 25,
	} {
		t.Run(field, func(t *testing.T) {
			f := newUpdateFixture(event.StageVoting, 0)

			w := f.patch(t, map[string]interface{}{field: value, "cover_color": "sky"})

			require.Equal(t, http.StatusConflict, w.Code, w.Body.String())
			resp := jsonBody(t, w)
			assert.Equal(t, "INVALID_UPDATE_STAGE", resp["code"])
			assert.Equal(t, "voting", resp["current_stage"])
			assert.Empty(t, f.s.eventRepo.updated)
			assert.Equal(t, event.DefaultCoverColor, f.evt.CoverColor, "the color does not change either")
		})
	}
}

func TestUpdateEvent_CoverColorOnPausedOrCancelledEvents(t *testing.T) {
	tests := []struct {
		name  string
		stage event.Stage
		set   func(e *event.Event)
	}{
		{"paused", event.StageVoting, func(e *event.Event) { e.IsPaused = true }},
		{"cancelled", event.StageResult, func(e *event.Event) { e.IsCancelled = true }},
		{"paused and cancelled", event.StageParticipation, func(e *event.Event) { e.IsPaused, e.IsCancelled = true, true }},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newUpdateFixture(tt.stage, 0)
			tt.set(f.evt)
			wasPaused, wasCancelled := f.evt.IsPaused, f.evt.IsCancelled

			w := f.patch(t, map[string]interface{}{"cover_color": "mint"})

			require.Equal(t, http.StatusOK, w.Code, w.Body.String())
			data := jsonBody(t, w)["data"].(map[string]interface{})
			assert.Equal(t, "mint", data["cover_color"])
			assert.Equal(t, wasPaused, f.evt.IsPaused)
			assert.Equal(t, wasCancelled, f.evt.IsCancelled)
			assert.Equal(t, tt.stage, f.evt.Stage)
		})
	}
}

func TestUpdateEvent_RejectsCoverColorOutsideThePalette(t *testing.T) {
	tests := []struct {
		name  string
		stage event.Stage
		body  map[string]interface{}
	}{
		{"only color", event.StageParticipation, map[string]interface{}{"cover_color": "red"}},
		{"hex", event.StageParticipation, map[string]interface{}{"cover_color": "#ff0000"}},
		{"empty string", event.StageParticipation, map[string]interface{}{"cover_color": ""}},
		{"valid name next to a bad color", event.StageParticipation, map[string]interface{}{"name": "Nombre válido", "cover_color": "red"}},
		{"in voting it is a 400, not a 409", event.StageVoting, map[string]interface{}{"cover_color": "red"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newUpdateFixture(tt.stage, 0)

			w := f.patch(t, tt.body)

			require.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
			assert.Equal(t, "INVALID_COVER_COLOR", jsonBody(t, w)["code"])
			assert.Empty(t, f.s.eventRepo.updated)
			assert.Equal(t, event.DefaultCoverColor, f.evt.CoverColor)
		})
	}
}

func TestUpdateEvent_CoverColorRequiresTheEventOwner(t *testing.T) {
	f := newUpdateFixture(event.StageVoting, 0)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	g := r.Group("/api/v1/events")
	g.Use(auth.JWTAuthMiddleware())
	g.PATCH("/:event_id", auth.RequireEventOwner(f.s.eventRepo), f.s.handler.UpdateEvent)

	do := func(token string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/events/"+f.evt.ID.String(), strings.NewReader(`{"cover_color":"mint"}`))
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}

	other := participant.NewParticipant("Otra", "Persona", "other@example.com")
	token, err := auth.GenerateToken(other.ID, other.Email, participant.RoleParticipant)
	require.NoError(t, err)

	w := do(token)
	require.Equal(t, http.StatusForbidden, w.Code, w.Body.String())
	assert.Equal(t, "FORBIDDEN", jsonBody(t, w)["error"])

	w = do("")
	require.Equal(t, http.StatusUnauthorized, w.Code, w.Body.String())

	assert.Empty(t, f.s.eventRepo.updated)
	assert.Equal(t, event.DefaultCoverColor, f.evt.CoverColor)
}

// ---------------------------------------------------------------------------
// Reads expose cover_color (S-019 CA-1)
// ---------------------------------------------------------------------------

func TestGetEvent_ExposesCoverColor(t *testing.T) {
	s := newTestEventHandlerSet()
	e := event.NewEvent("Evento con color", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.Stage = event.StageParticipation
	e.CoverColor = event.CoverColorMint
	s.eventRepo.addEvent(e)

	w := performAs(t, http.MethodGet, s.handler.GetEvent, eventParams(e), "", nil, uuid.Nil, "")

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, "mint", jsonBody(t, w)["data"].(map[string]interface{})["cover_color"])
}

func TestGetAllEvents_ExposesCoverColor(t *testing.T) {
	s := newTestEventHandlerSet()
	colored := seedEvent(s, "Con color", "org", event.StageParticipation)
	colored.CoverColor = event.CoverColorPeach
	seedEvent(s, "Con el default", "org", event.StageParticipation)

	w := performRequest(t, http.MethodGet, s.handler.GetAllEvents, nil, "limit=100", nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	byName := map[string]interface{}{}
	for _, item := range jsonBody(t, w)["data"].([]interface{}) {
		m := item.(map[string]interface{})
		byName[m["name"].(string)] = m["cover_color"]
	}
	assert.Equal(t, map[string]interface{}{"Con color": "peach", "Con el default": "lavender"}, byName)
}

func TestGetUserEvents_ScopeAllExposesCoverColor(t *testing.T) {
	f := newScopeFixture()
	f.o2.CoverColor = event.CoverColorMint
	f.p1.CoverColor = event.CoverColorPeach

	code, body := f.get(t, "all", f.user.ID, participant.RoleOrganizer)
	require.Equal(t, http.StatusOK, code)

	byName := userEventsByName(t, body)
	assert.Equal(t, "mint", byName["O2"]["cover_color"])
	assert.Equal(t, "peach", byName["P1"]["cover_color"])
	assert.Equal(t, "lavender", byName["O1"]["cover_color"])
}
