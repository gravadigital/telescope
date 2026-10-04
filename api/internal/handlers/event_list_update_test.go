package handlers

import (
	"errors"
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

func seedEvent(s *testEventHandlerSet, name, organizer string, stage event.Stage) *event.Event {
	e := event.NewEvent(name, "Descripción de prueba del evento.", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), organizer)
	e.Stage = stage
	s.eventRepo.addEvent(e)
	return e
}

func seedListing(s *testEventHandlerSet) {
	seedEvent(s, "Borrador Uno", "Club Ciencia Sur", event.StageCreation)
	seedEvent(s, "Borrador Dos", "", event.StageCreation)
	seedEvent(s, "Semana de la Ciencia", "Astro Club", event.StageParticipation)
	seedEvent(s, "Noche de Galaxias", "Club CIENCIA Norte", event.StageParticipation)
	seedEvent(s, "Taller Lunar", "Astro Club", event.StageParticipation)
	seedEvent(s, "Ciencia Ciudadana", "", event.StageVoting)
	seedEvent(s, "Cometas 2026", "Astro Club", event.StageVoting)
	seedEvent(s, "Eclipse Total", "Astro Club", event.StageResult)
}

func listNames(t *testing.T, w *httptest.ResponseRecorder) []string {
	t.Helper()
	var names []string
	for _, item := range jsonBody(t, w)["data"].([]interface{}) {
		names = append(names, item.(map[string]interface{})["name"].(string))
	}
	return names
}

func TestGetAllEvents_NeverListsCreation(t *testing.T) {
	s := newTestEventHandlerSet()
	seedListing(s)

	w := performRequest(t, http.MethodGet, s.handler.GetAllEvents, nil, "limit=100", nil)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, float64(6), jsonBody(t, w)["pagination"].(map[string]interface{})["total"])
	assert.NotContains(t, listNames(t, w), "Borrador Uno")
}

func TestGetAllEvents_NeverListsCreationEvenForItsAuthor(t *testing.T) {
	s := newTestEventHandlerSet()
	seedListing(s)
	var draftAuthor uuid.UUID
	for _, e := range s.eventRepo.events {
		if e.Name == "Borrador Uno" {
			draftAuthor = e.AuthorID
		}
	}

	w := performAs(t, http.MethodGet, s.handler.GetAllEvents, nil, "limit=100", nil, draftAuthor, participant.RoleOrganizer)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.NotContains(t, listNames(t, w), "Borrador Uno")
}

func TestGetAllEvents_StageCreationIsEmpty(t *testing.T) {
	s := newTestEventHandlerSet()
	seedListing(s)

	w := performRequest(t, http.MethodGet, s.handler.GetAllEvents, nil, "stage=creation", nil)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Empty(t, resp["data"])
	pagination := resp["pagination"].(map[string]interface{})
	assert.Equal(t, float64(0), pagination["total"])
	assert.Equal(t, float64(0), pagination["total_pages"])
	assert.Equal(t, "creation", resp["filters"].(map[string]interface{})["stage"])
}

func TestGetAllEvents_SearchByNameOrOrganizer(t *testing.T) {
	s := newTestEventHandlerSet()
	seedListing(s)

	w := performRequest(t, http.MethodGet, s.handler.GetAllEvents, nil, "q=ciencia&limit=100", nil)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.ElementsMatch(t, []string{"Semana de la Ciencia", "Noche de Galaxias", "Ciencia Ciudadana"}, listNames(t, w))
}

func TestGetAllEvents_StageCountsComputedBeforeStageFilter(t *testing.T) {
	s := newTestEventHandlerSet()
	seedListing(s)

	w := performRequest(t, http.MethodGet, s.handler.GetAllEvents, nil, "q=ciencia&stage=participation", nil)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.ElementsMatch(t, []string{"Semana de la Ciencia", "Noche de Galaxias"}, listNames(t, w))
	assert.Equal(t, map[string]interface{}{"participation": float64(2), "voting": float64(1), "results": float64(0)}, jsonBody(t, w)["stage_counts"])
}

func TestGetAllEvents_StageCountsComputedBeforePagination(t *testing.T) {
	s := newTestEventHandlerSet()
	seedListing(s)

	w := performRequest(t, http.MethodGet, s.handler.GetAllEvents, nil, "limit=1&page=2", nil)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Len(t, resp["data"], 1)
	assert.Equal(t, float64(6), resp["pagination"].(map[string]interface{})["total"])
	assert.Equal(t, map[string]interface{}{"participation": float64(3), "voting": float64(2), "results": float64(1)}, resp["stage_counts"])
}

func TestGetAllEvents_BlankQueryDoesNotFilter(t *testing.T) {
	s := newTestEventHandlerSet()
	seedListing(s)

	w := performRequest(t, http.MethodGet, s.handler.GetAllEvents, nil, "q=%20%20&limit=100", nil)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, float64(6), jsonBody(t, w)["pagination"].(map[string]interface{})["total"])
}

func TestGetAllEvents_ParticipantsCountPerItem(t *testing.T) {
	s := newTestEventHandlerSet()
	e := seedEvent(s, "Con inscriptos", "org", event.StageParticipation)
	setEventParticipantCount(s, e.ID.String(), 12)

	w := performRequest(t, http.MethodGet, s.handler.GetAllEvents, nil, "stage=participation", nil)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	item := jsonBody(t, w)["data"].([]interface{})[0].(map[string]interface{})
	assert.Equal(t, float64(12), item["participants_count"])
	assert.Len(t, item["participant_ids"], 12)
}

func TestMatchesQueryAndCountByStage(t *testing.T) {
	e := &event.Event{Name: "Noche de Galaxias", Organizer: "Club CIENCIA Norte"}
	assert.True(t, matchesQuery(e, ""))
	assert.True(t, matchesQuery(e, "galaxias"))
	assert.True(t, matchesQuery(e, "ciencia"))
	assert.False(t, matchesQuery(e, "cometa"))

	counts := countByStage([]*event.Event{{Stage: event.StageVoting}, {Stage: event.StageVoting}})
	assert.Equal(t, 0, counts["participation"])
	assert.Equal(t, 2, counts["voting"])
	assert.Equal(t, 0, counts["results"])
}

// ---------------------------------------------------------------------------
// UpdateEvent (PATCH /events/{event_id})
// ---------------------------------------------------------------------------

type updateFixture struct {
	s      *testEventHandlerSet
	author *participant.User
	evt    *event.Event
}

func newUpdateFixture(stage event.Stage, registered int) updateFixture {
	s := newTestEventHandlerSet()
	author := participant.NewOrganizer("Ana", "Author", "author@example.com")
	s.userRepo.addUser(author)
	e := event.NewEvent("Semana de la Ciencia", "Observación guiada de cielo profundo.", author.ID, time.Now(), time.Now().AddDate(0, 0, 5), "Astro Club")
	e.Stage = stage
	max := 20
	e.MaxParticipants = &max
	s.eventRepo.addEvent(e)
	setEventParticipantCount(s, e.ID.String(), registered)
	return updateFixture{s, author, e}
}

func (f updateFixture) patch(t *testing.T, body interface{}) *httptest.ResponseRecorder {
	t.Helper()
	return performAs(t, http.MethodPatch, f.s.handler.UpdateEvent, eventParams(f.evt), "", body, f.author.ID, participant.RoleOrganizer)
}

func TestUpdateEvent_Success(t *testing.T) {
	f := newUpdateFixture(event.StageParticipation, 12)
	f.s.eventRepo.addEvent(event.NewEvent("Eclipse Total", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), ""))

	w := f.patch(t, map[string]interface{}{"name": "Semana de la Ciencia 2026", "max_participants": 30})

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Equal(t, "EVENT_UPDATED", resp["code"])
	assert.Equal(t, "Event updated successfully", resp["message"])
	data := resp["data"].(map[string]interface{})
	assert.Equal(t, "Semana de la Ciencia 2026", data["name"])
	assert.Equal(t, float64(30), data["max_participants"])
	assert.Equal(t, "Observación guiada de cielo profundo.", data["description"])
	assert.Equal(t, float64(12), data["participants_count"])
	assert.Equal(t, "participation", data["stage"])
	require.Len(t, f.s.eventRepo.updated, 1)
	assert.Equal(t, "Semana de la Ciencia 2026", f.s.eventRepo.updated[0].Name)
}

func TestUpdateEvent_InCreation(t *testing.T) {
	f := newUpdateFixture(event.StageCreation, 0)

	w := f.patch(t, map[string]interface{}{"description": "Descripción corregida del evento."})

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	data := jsonBody(t, w)["data"].(map[string]interface{})
	assert.Equal(t, "Descripción corregida del evento.", data["description"])
	assert.Equal(t, "creation", data["stage"])
}

func TestUpdateEvent_EmptyOrganizerFallsBackToAuthorName(t *testing.T) {
	f := newUpdateFixture(event.StageParticipation, 0)

	w := f.patch(t, map[string]interface{}{"organizer": ""})

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, "", f.s.eventRepo.updated[0].Organizer)
	assert.Equal(t, f.author.Name, jsonBody(t, w)["data"].(map[string]interface{})["organizer"])
}

func TestUpdateEvent_MaxParticipantsAgainstRegistered(t *testing.T) {
	f := newUpdateFixture(event.StageParticipation, 12)

	w := f.patch(t, map[string]interface{}{"max_participants": 10})
	require.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Equal(t, "MAX_PARTICIPANTS_BELOW_REGISTERED", resp["code"])
	assert.Equal(t, float64(12), resp["current_count"])
	assert.Empty(t, f.s.eventRepo.updated)

	w = f.patch(t, map[string]interface{}{"max_participants": 12})
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, float64(12), jsonBody(t, w)["data"].(map[string]interface{})["max_participants"])
}

func TestUpdateEvent_RejectsVotingAndResults(t *testing.T) {
	for _, stage := range []event.Stage{event.StageVoting, event.StageResult} {
		t.Run(stage.String(), func(t *testing.T) {
			f := newUpdateFixture(stage, 0)
			w := f.patch(t, map[string]interface{}{"name": "Otro nombre válido"})

			require.Equal(t, http.StatusConflict, w.Code, w.Body.String())
			resp := jsonBody(t, w)
			assert.Equal(t, "INVALID_UPDATE_STAGE", resp["code"])
			assert.Equal(t, stage.String(), resp["current_stage"])
			assert.Empty(t, f.s.eventRepo.updated)
		})
	}
}

func TestUpdateEvent_RejectsEmptyAndIgnoredOnlyBodies(t *testing.T) {
	f := newUpdateFixture(event.StageParticipation, 0)
	for name, body := range map[string]interface{}{
		"empty":        map[string]interface{}{},
		"only ignored": map[string]interface{}{"start_date": "2030-01-01"},
	} {
		t.Run(name, func(t *testing.T) {
			w := f.patch(t, body)
			require.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
			assert.Equal(t, "INVALID_PAYLOAD", jsonBody(t, w)["code"])
		})
	}
	assert.Empty(t, f.s.eventRepo.updated)
}

func TestUpdateEvent_RejectsOutOfRangeValues(t *testing.T) {
	f := newUpdateFixture(event.StageCreation, 0)
	tests := map[string]interface{}{
		"name too short":       map[string]interface{}{"name": "ab"},
		"name empty":           map[string]interface{}{"name": ""},
		"name too long":        map[string]interface{}{"name": strings.Repeat("a", 201)},
		"description short":    map[string]interface{}{"description": "corta"},
		"description too long": map[string]interface{}{"description": strings.Repeat("a", 2001)},
		"organizer too long":   map[string]interface{}{"organizer": strings.Repeat("a", 201)},
		"max zero":             map[string]interface{}{"max_participants": 0},
		"max over limit":       map[string]interface{}{"max_participants": 101},
		"max wrong type":       map[string]interface{}{"max_participants": "diez"},
		"not json":             "not-json",
	}
	for name, body := range tests {
		t.Run(name, func(t *testing.T) {
			w := f.patch(t, body)
			require.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
			assert.Equal(t, "INVALID_PAYLOAD", jsonBody(t, w)["code"])
		})
	}
	assert.Empty(t, f.s.eventRepo.updated)
}

func TestUpdateEvent_AcceptsBoundaryValues(t *testing.T) {
	tests := map[string]interface{}{
		"name min":         map[string]interface{}{"name": "abc"},
		"name max":         map[string]interface{}{"name": strings.Repeat("a", 200)},
		"description min":  map[string]interface{}{"description": strings.Repeat("a", 10)},
		"description max":  map[string]interface{}{"description": strings.Repeat("a", 2000)},
		"organizer max":    map[string]interface{}{"organizer": strings.Repeat("a", 200)},
		"max participants": map[string]interface{}{"max_participants": 100},
		"name in runes":    map[string]interface{}{"name": "Ñandú"},
		"name 200 runes":   map[string]interface{}{"name": strings.Repeat("é", 200)},
	}
	for name, body := range tests {
		t.Run(name, func(t *testing.T) {
			f := newUpdateFixture(event.StageParticipation, 0)
			w := f.patch(t, body)
			require.Equal(t, http.StatusOK, w.Code, w.Body.String())
			assert.Equal(t, "EVENT_UPDATED", jsonBody(t, w)["code"])
		})
	}

	f := newUpdateFixture(event.StageCreation, 0)
	w := f.patch(t, map[string]interface{}{"max_participants": 1})
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
}

func TestUpdateEvent_DuplicateName(t *testing.T) {
	f := newUpdateFixture(event.StageParticipation, 0)
	f.s.eventRepo.addEvent(event.NewEvent("Eclipse Total", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), ""))

	w := f.patch(t, map[string]interface{}{"name": "Eclipse Total"})
	require.Equal(t, http.StatusConflict, w.Code, w.Body.String())
	assert.Equal(t, "DUPLICATE_EVENT_NAME", jsonBody(t, w)["code"])
	assert.Empty(t, f.s.eventRepo.updated)

	// Resending the event's own name is not a conflict.
	w = f.patch(t, map[string]interface{}{"name": "Semana de la Ciencia", "max_participants": 25})
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, float64(25), jsonBody(t, w)["data"].(map[string]interface{})["max_participants"])
}

func TestUpdateEvent_IgnoresDates(t *testing.T) {
	f := newUpdateFixture(event.StageParticipation, 0)
	start, end := f.evt.StartDate, f.evt.EndDate

	w := f.patch(t, map[string]interface{}{"name": "Semana de la Ciencia II", "start_date": "2030-01-01", "end_date": "2030-02-01"})

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	data := jsonBody(t, w)["data"].(map[string]interface{})
	assert.Equal(t, start.Format("2006-01-02"), data["start_date"])
	assert.Equal(t, end.Format("2006-01-02"), data["end_date"])
}

func TestUpdateEvent_RoutingWithOwnerMiddleware(t *testing.T) {
	f := newUpdateFixture(event.StageParticipation, 0)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	g := r.Group("/api/v1/events")
	g.Use(auth.JWTAuthMiddleware())
	g.PATCH("/:event_id", auth.RequireEventOwner(f.s.eventRepo), f.s.handler.UpdateEvent)

	do := func(token string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/events/"+f.evt.ID.String(), strings.NewReader(`{"name":"Hackeado"}`))
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
	assert.Equal(t, "Only the event creator or an admin can perform this action", jsonBody(t, w)["message"])

	w = do("")
	require.Equal(t, http.StatusUnauthorized, w.Code, w.Body.String())
	assert.Equal(t, "Missing Authorization header", jsonBody(t, w)["message"])
	assert.Empty(t, f.s.eventRepo.updated)
}

func TestUpdateEvent_AdminPathErrors(t *testing.T) {
	f := newUpdateFixture(event.StageParticipation, 0)
	admin := uuid.New()
	body := map[string]interface{}{"name": "Nombre válido"}

	w := performAs(t, http.MethodPatch, f.s.handler.UpdateEvent, gin.Params{{Key: "event_id", Value: "not-a-uuid"}}, "", body, admin, participant.RoleAdmin)
	require.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_EVENT_ID", jsonBody(t, w)["code"])

	w = performAs(t, http.MethodPatch, f.s.handler.UpdateEvent, gin.Params{{Key: "event_id", Value: uuid.NewString()}}, "", body, admin, participant.RoleAdmin)
	assertEventNotFound(t, w)
}

func TestUpdateEvent_RepositoryFailures(t *testing.T) {
	t.Run("update fails", func(t *testing.T) {
		f := newUpdateFixture(event.StageParticipation, 0)
		f.s.eventRepo.updateErr = errors.New("db down")

		w := f.patch(t, map[string]interface{}{"name": "Nombre válido"})
		require.Equal(t, http.StatusInternalServerError, w.Code, w.Body.String())
		assert.Equal(t, "DB_UPDATE_ERROR", jsonBody(t, w)["code"])
		assert.NotContains(t, w.Body.String(), "db down")
	})
	t.Run("participant count fails", func(t *testing.T) {
		f := newUpdateFixture(event.StageParticipation, 0)
		f.s.userRepo.getParticipantsErr = errors.New("db down")

		w := f.patch(t, map[string]interface{}{"max_participants": 30})
		require.Equal(t, http.StatusInternalServerError, w.Code, w.Body.String())
		assert.Equal(t, "PARTICIPANT_CHECK_ERROR", jsonBody(t, w)["code"])
	})
}
