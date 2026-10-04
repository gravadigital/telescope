package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/domain/event"
	"github.com/gravadigital/telescopio-api/internal/domain/notification"
	"github.com/gravadigital/telescopio-api/internal/domain/participant"
	"github.com/gravadigital/telescopio-api/internal/domain/vote"
	"github.com/gravadigital/telescopio-api/internal/middleware/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func postReminder(t *testing.T, s *testEventHandlerSet, eventID string, body interface{}) *httptest.ResponseRecorder {
	t.Helper()
	return performAuthedRequest(t, http.MethodPost, s.handler.SendReminder,
		gin.Params{{Key: "event_id", Value: eventID}}, uuid.NewString(), body)
}

// reminderFixture seeds an event with three inscribed participants; P1 and P2 have a proposal.
func reminderFixture(s *testEventHandlerSet, stage event.Stage) (*event.Event, []*participant.User) {
	e := newEventInStage(s, stage)
	d := time.Date(2026, 11, 15, 0, 0, 0, 0, time.UTC)
	v := time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC)
	e.ParticipationEstimatedEndDate, e.VotingEstimatedEndDate = &d, &v
	users := seedInscribed(s, e, 3)
	s.attachmentRepo.addAttachment(attachmentFor(e.ID, users[0].ID))
	s.attachmentRepo.addAttachment(attachmentFor(e.ID, users[1].ID))
	return e, users
}

func TestSendReminder_File(t *testing.T) { // TS-53
	s := newTestEventHandlerSet()
	e, users := reminderFixture(s, event.StageParticipation)

	w := postReminder(t, s, e.ID.String(), map[string]string{"type": "file"})

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	body := jsonBody(t, w)
	assert.Equal(t, "REMINDER_SENT", body["code"])
	assert.Equal(t, "Reminder sent successfully", body["message"])
	assert.Equal(t, map[string]interface{}{"type": "file", "recipients_count": float64(1)}, body["data"])
	require.Len(t, s.notifRepo.created, 1)
	n := s.notifRepo.created[0]
	assert.Equal(t, notification.TypeFileReminder, n.Type)
	assert.Equal(t, users[2].ID, n.RecipientID)
	assert.Equal(t, notification.Data{"deadline": "2026-11-15"}, n.Data)
}

func TestSendReminder_Vote(t *testing.T) { // TS-54
	s := newTestEventHandlerSet()
	e, users := reminderFixture(s, event.StageVoting)
	extra := participant.NewParticipant("P", "4", uuid.NewString()+"@example.com")
	s.userRepo.addUser(extra)
	all := append([]*participant.User{}, users...)
	all = append(all, extra)
	roles := make([]*participant.UserWithEventRole, len(all))
	for i, u := range all {
		roles[i] = &participant.UserWithEventRole{User: *u, EventRole: "participant"}
		a := vote.NewAssignment(e.ID, u.ID, []uuid.UUID{uuid.New(), uuid.New()})
		a.IsCompleted = u.ID == extra.ID
		s.voteRepo.assignments[a.ID.String()] = a
	}
	s.userRepo.setEventParticipants(e.ID.String(), roles)

	w := postReminder(t, s, e.ID.String(), map[string]string{"type": "vote"})

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, map[string]interface{}{"type": "vote", "recipients_count": float64(3)}, jsonBody(t, w)["data"])
	got := s.notifRepo.byRecipient(notification.TypeVoteReminder)
	require.Len(t, got, 3)
	for _, u := range users {
		assert.Equal(t, notification.Data{"deadline": "2026-12-01"}, got[u.ID])
	}
	assert.NotContains(t, got, extra.ID)
}

func TestSendReminder_WithoutDeadline(t *testing.T) { // TS-55
	s := newTestEventHandlerSet()
	e, _ := reminderFixture(s, event.StageParticipation)
	e.ParticipationEstimatedEndDate = nil

	w := postReminder(t, s, e.ID.String(), map[string]string{"type": "file"})

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	require.Len(t, s.notifRepo.created, 1)
	deadline, present := s.notifRepo.created[0].Data["deadline"]
	assert.True(t, present)
	assert.Nil(t, deadline)
}

func TestSendReminder_NoPendingRecipients(t *testing.T) { // TS-56
	t.Run("file", func(t *testing.T) {
		s := newTestEventHandlerSet()
		e, users := reminderFixture(s, event.StageParticipation)
		s.attachmentRepo.addAttachment(attachmentFor(e.ID, users[2].ID))
		w := postReminder(t, s, e.ID.String(), map[string]string{"type": "file"})
		assert.Equal(t, http.StatusConflict, w.Code)
		assert.Equal(t, "NO_PENDING_RECIPIENTS", jsonBody(t, w)["code"])
		assert.Empty(t, s.notifRepo.created)
	})
	t.Run("vote", func(t *testing.T) {
		s := newTestEventHandlerSet()
		e, users := reminderFixture(s, event.StageVoting)
		a := vote.NewAssignment(e.ID, users[0].ID, []uuid.UUID{uuid.New()})
		a.IsCompleted = true
		s.voteRepo.assignments[a.ID.String()] = a
		w := postReminder(t, s, e.ID.String(), map[string]string{"type": "vote"})
		assert.Equal(t, http.StatusConflict, w.Code)
		assert.Equal(t, "NO_PENDING_RECIPIENTS", jsonBody(t, w)["code"])
		assert.Empty(t, s.notifRepo.created)
	})
}

func TestSendReminder_WrongStage(t *testing.T) { // TS-57
	tests := []struct {
		stage event.Stage
		typ   string
	}{
		{event.StageParticipation, "vote"},
		{event.StageVoting, "file"},
		{event.StageResult, "file"},
	}
	for _, tt := range tests {
		t.Run(tt.stage.String()+"/"+tt.typ, func(t *testing.T) {
			s := newTestEventHandlerSet()
			e, _ := reminderFixture(s, tt.stage)
			w := postReminder(t, s, e.ID.String(), map[string]string{"type": tt.typ})
			assert.Equal(t, http.StatusConflict, w.Code)
			body := jsonBody(t, w)
			assert.Equal(t, "INVALID_EVENT_STAGE", body["code"])
			assert.Equal(t, tt.stage.String(), body["current_stage"])
			assert.Empty(t, s.notifRepo.created)
		})
	}
}

func TestSendReminder_PausedOrCancelled(t *testing.T) { // TS-58, TS-59
	tests := map[string]func(e *event.Event){
		"paused":                   func(e *event.Event) { e.IsPaused = true },
		"cancelled":                func(e *event.Event) { e.IsCancelled = true },
		"paused beats wrong stage": func(e *event.Event) { e.IsPaused = true; e.Stage = event.StageVoting },
	}
	for name, mutate := range tests {
		t.Run(name, func(t *testing.T) {
			s := newTestEventHandlerSet()
			e, _ := reminderFixture(s, event.StageParticipation)
			mutate(e)
			w := postReminder(t, s, e.ID.String(), map[string]string{"type": "file"})
			assert.Equal(t, http.StatusConflict, w.Code)
			assert.Equal(t, "EVENT_PAUSED_OR_CANCELLED", jsonBody(t, w)["code"])
			assert.Empty(t, s.notifRepo.created)
		})
	}
}

func TestSendReminder_InvalidBody(t *testing.T) { // TS-60
	for name, body := range map[string]interface{}{
		"empty object": map[string]string{},
		"bad type":     map[string]string{"type": "email"},
		"empty type":   map[string]string{"type": ""},
	} {
		t.Run(name, func(t *testing.T) {
			s := newTestEventHandlerSet()
			e, _ := reminderFixture(s, event.StageParticipation)
			w := postReminder(t, s, e.ID.String(), body)
			assert.Equal(t, http.StatusBadRequest, w.Code)
			assert.Equal(t, "INVALID_PAYLOAD", jsonBody(t, w)["code"])
		})
	}
	t.Run("not json", func(t *testing.T) {
		s := newTestEventHandlerSet()
		e, _ := reminderFixture(s, event.StageParticipation)
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString("not-json"))
		c.Params = gin.Params{{Key: "event_id", Value: e.ID.String()}}
		s.handler.SendReminder(c)
		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Equal(t, "INVALID_PAYLOAD", jsonBody(t, w)["code"])
	})
}

func TestSendReminder_InvalidOrUnknownEvent(t *testing.T) { // TS-61
	s := newTestEventHandlerSet()
	w := postReminder(t, s, "not-a-uuid", map[string]string{"type": "file"})
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_EVENT_ID", jsonBody(t, w)["code"])

	w = postReminder(t, s, uuid.NewString(), map[string]string{"type": "file"})
	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, "EVENT_NOT_FOUND", jsonBody(t, w)["code"])
}

func TestSendReminder_NotificationFailureDoesNotChangeResponse(t *testing.T) { // TS-62
	s := newTestEventHandlerSet()
	s.notifRepo.createErr = errors.New("db down")
	e, _ := reminderFixture(s, event.StageParticipation)

	w := postReminder(t, s, e.ID.String(), map[string]string{"type": "file"})

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	body := jsonBody(t, w)
	assert.Equal(t, "REMINDER_SENT", body["code"])
	assert.Equal(t, float64(1), body["data"].(map[string]interface{})["recipients_count"])
}

func TestSendReminder_ReadFailures(t *testing.T) { // TS-63
	t.Run("file", func(t *testing.T) {
		s := newTestEventHandlerSet()
		e, _ := reminderFixture(s, event.StageParticipation)
		s.attachmentRepo.getByEventErr = errors.New("boom")
		w := postReminder(t, s, e.ID.String(), map[string]string{"type": "file"})
		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Equal(t, "RETRIEVAL_ERROR", jsonBody(t, w)["code"])
		assert.Empty(t, s.notifRepo.created)
	})
	t.Run("vote", func(t *testing.T) {
		s := newTestEventHandlerSet()
		e, _ := reminderFixture(s, event.StageVoting)
		s.voteRepo.getAssignmentsErr = errors.New("boom")
		w := postReminder(t, s, e.ID.String(), map[string]string{"type": "vote"})
		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Equal(t, "RETRIEVAL_ERROR", jsonBody(t, w)["code"])
		assert.Empty(t, s.notifRepo.created)
	})
}

func TestSendReminder_OnlyOwnerOnRealRoute(t *testing.T) { // TS-64
	s := newTestEventHandlerSet()
	e, _ := reminderFixture(s, event.StageParticipation)
	other := participant.NewParticipant("Other", "User", "other@example.com")
	s.userRepo.addUser(other)
	token, err := auth.GenerateToken(other.ID, other.Email, participant.RoleParticipant)
	require.NoError(t, err)

	r := gin.New()
	g := r.Group("/api/v1/events")
	g.Use(auth.JWTAuthMiddleware())
	g.POST("/:event_id/reminders", auth.RequireEventOwner(s.eventRepo), s.handler.SendReminder)

	payload, _ := json.Marshal(map[string]string{"type": "file"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/events/"+e.ID.String()+"/reminders", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code, w.Body.String())
	body := jsonBody(t, w)
	assert.Equal(t, "FORBIDDEN", body["error"])
	assert.Equal(t, "Only the event creator or an admin can perform this action", body["message"])
	assert.Empty(t, s.notifRepo.created)
}
