package handlers

import (
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/config"
	"github.com/gravadigital/telescopio-api/internal/domain/event"
	"github.com/gravadigital/telescopio-api/internal/domain/notification"
	"github.com/gravadigital/telescopio-api/internal/domain/participant"
	"github.com/gravadigital/telescopio-api/internal/domain/vote"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func idSet(users []*participant.User) map[uuid.UUID]bool {
	m := map[uuid.UUID]bool{}
	for _, u := range users {
		m[u.ID] = true
	}
	return m
}

func recipients(n []*notification.Notification) map[uuid.UUID]bool {
	m := map[uuid.UUID]bool{}
	for _, x := range n {
		m[x.RecipientID] = true
	}
	return m
}

func seedInscribed(s *testEventHandlerSet, e *event.Event, n int) []*participant.User {
	users := make([]*participant.User, n)
	roles := make([]*participant.UserWithEventRole, n)
	for i := range users {
		u := participant.NewParticipant("P", "articipant", uuid.NewString()+"@example.com")
		s.userRepo.addUser(u)
		users[i] = u
		roles[i] = &participant.UserWithEventRole{User: *u, EventRole: "participant"}
	}
	s.userRepo.setEventParticipants(e.ID.String(), roles)
	return users
}

func newEventInStage(s *testEventHandlerSet, stage event.Stage) *event.Event {
	e := event.NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.Stage = stage
	s.eventRepo.addEvent(e)
	return e
}

func stageParams(e *event.Event) gin.Params {
	return gin.Params{{Key: "event_id", Value: e.ID.String()}}
}

// --- stage_changed (TS-1 to TS-5) ---

func TestUpdateEventStage_NotifiesParticipantsOnParticipation(t *testing.T) { // TS-1
	s := newTestEventHandlerSet()
	e := newEventInStage(s, event.StageCreation)
	users := seedInscribed(s, e, 4)
	date := dateStr(time.Now().AddDate(0, 0, 5))

	w := patchStage(t, s, e.ID, map[string]interface{}{"stage": "participation", "estimated_end_date": date})

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, "STAGE_UPDATED", jsonBody(t, w)["code"])
	require.Len(t, s.notifRepo.created, 4)
	assert.Equal(t, idSet(users), recipients(s.notifRepo.created))
	for _, n := range s.notifRepo.created {
		assert.Equal(t, notification.TypeStageChanged, n.Type)
		assert.Equal(t, e.ID, n.EventID)
		assert.NotEqual(t, e.AuthorID, n.RecipientID)
		assert.Equal(t, notification.Data{"stage": "participation", "deadline": date}, n.Data)
	}
}

func TestUpdateEventStage_VotingNotificationDistinguishesNonParticipants(t *testing.T) { // TS-2
	s := newTestEventHandlerSet()
	f := seedOpenVoting(s, 4, 3)
	date := dateStr(time.Now().AddDate(0, 0, 5))

	w := patchStage(t, s, f.event.ID, votingBody(date, map[string]interface{}{"attachments_per_evaluator": 2}))

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	got := s.notifRepo.byRecipient(notification.TypeStageChanged)
	require.Len(t, got, 4)
	for i := 0; i < 3; i++ {
		assert.Equal(t, notification.Data{"stage": "voting", "deadline": date, "can_vote": true, "assigned_count": 2}, got[f.users[i].ID])
	}
	assert.Equal(t, notification.Data{"stage": "voting", "deadline": date, "can_vote": false}, got[f.users[3].ID])
	assert.NotContains(t, got[f.users[3].ID], "assigned_count")
}

func resultsScenario(t *testing.T, s *testEventHandlerSet, withConfig bool) (*event.Event, []*participant.User, *mockVotingResultsRepository) {
	t.Helper()
	configRepo := newMockVotingConfigurationRepository()
	resultsRepo := newMockVotingResultsRepository()
	s.handler.voteHandler = NewDistributedVoteHandler(
		newMockVoteRepository(), s.eventRepo, s.attachmentRepo, s.userRepo, configRepo, resultsRepo,
		&config.Config{}, nil,
	)
	voteRepo := newMockVoteRepository()
	s.handler.voteHandler = NewDistributedVoteHandler(
		voteRepo, s.eventRepo, s.attachmentRepo, s.userRepo, configRepo, resultsRepo,
		&config.Config{}, nil,
	)
	e := newEventInStage(s, event.StageVoting)
	users := seedInscribed(s, e, 4) // the 4th has no proposal
	for _, u := range users[:3] {
		s.attachmentRepo.addAttachment(attachmentFor(e.ID, u.ID))
	}
	if withConfig {
		configRepo.byEvent[e.ID.String()] = &vote.VotingConfiguration{
			ID: uuid.New(), EventID: e.ID, AttachmentsPerEvaluator: 2,
			QualityGoodThreshold: 0.6, QualityBadThreshold: 0.3, AdjustmentMagnitude: 3, MinEvaluationsPerFile: 1,
		}
	}
	attachments := s.attachmentRepo.byEvent[e.ID.String()]
	voteRepo.votes = append(voteRepo.votes, &vote.Vote{
		ID: uuid.New(), EventID: e.ID, VoterID: users[0].ID, AttachmentID: attachments[1].ID, RankPosition: 1,
	})
	return e, users, resultsRepo
}

func TestUpdateEventStage_ResultsNotificationCarriesPosition(t *testing.T) { // TS-3
	s := newTestEventHandlerSet()
	e, users, resultsRepo := resultsScenario(t, s, true)

	w := patchStage(t, s, e.ID, map[string]interface{}{"stage": "results"})

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	stored, err := resultsRepo.GetByEventID(e.ID.String())
	require.NoError(t, err)
	require.NotEmpty(t, stored.AdjustedRanking)
	got := s.notifRepo.byRecipient(notification.TypeStageChanged)
	require.Len(t, got, 4)
	withPosition := 0
	for _, u := range users {
		pos, total, ok := resultPosition(stored, u.ID)
		if ok {
			withPosition++
			assert.Equal(t, notification.Data{"stage": "results", "result_position": pos, "result_total": total}, got[u.ID])
		} else {
			assert.Equal(t, notification.Data{"stage": "results"}, got[u.ID])
		}
	}
	assert.Equal(t, 3, withPosition)
	assert.Equal(t, notification.Data{"stage": "results"}, got[users[3].ID])
}

func TestUpdateEventStage_ResultsNotificationWithoutPositionWhenCalculationFails(t *testing.T) { // TS-4
	s := newTestEventHandlerSet()
	e, users, _ := resultsScenario(t, s, false)

	w := patchStage(t, s, e.ID, map[string]interface{}{"stage": "results"})

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	got := s.notifRepo.byRecipient(notification.TypeStageChanged)
	require.Len(t, got, 4)
	for _, u := range users {
		assert.Equal(t, notification.Data{"stage": "results"}, got[u.ID])
	}
}

func TestUpdateEventStage_ResultsNotificationWithoutVoteHandler(t *testing.T) { // TS-5
	s := newTestEventHandlerSet()
	e := newEventInStage(s, event.StageVoting)
	users := seedInscribed(s, e, 3)

	w := patchStage(t, s, e.ID, map[string]interface{}{"stage": "results"})

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	got := s.notifRepo.byRecipient(notification.TypeStageChanged)
	for _, u := range users {
		assert.Equal(t, notification.Data{"stage": "results"}, got[u.ID])
	}
}

// --- cancel / pause / deadline (TS-6 to TS-10, TS-16, TS-17) ---

func TestCancelEvent_NotifiesParticipants(t *testing.T) { // TS-6
	s := newTestEventHandlerSet()
	e := newEventInStage(s, event.StageParticipation)
	users := seedInscribed(s, e, 2)

	w := performRequest(t, http.MethodPatch, s.handler.CancelEvent, stageParams(e), "", nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Equal(t, "EVENT_CANCELLED", resp["code"])
	assert.Equal(t, true, resp["data"].(map[string]interface{})["is_cancelled"])
	require.Len(t, s.notifRepo.created, 2)
	assert.Equal(t, idSet(users), recipients(s.notifRepo.created))
	for _, n := range s.notifRepo.created {
		assert.Equal(t, notification.TypeEventCancelled, n.Type)
		v, _ := n.Data.Value()
		assert.Equal(t, "{}", v)
	}
}

func TestCancelEvent_AlreadyCancelledDoesNotNotify(t *testing.T) { // TS-7
	s := newTestEventHandlerSet()
	e := newEventInStage(s, event.StageParticipation)
	e.IsCancelled = true
	seedInscribed(s, e, 2)

	w := performRequest(t, http.MethodPatch, s.handler.CancelEvent, stageParams(e), "", nil)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Equal(t, "ALREADY_CANCELLED", jsonBody(t, w)["code"])
	assert.Empty(t, s.notifRepo.created)
}

func TestPauseEvent_NotifiesOnPauseNotOnResume(t *testing.T) { // TS-8
	s := newTestEventHandlerSet()
	e := newEventInStage(s, event.StageParticipation)
	seedInscribed(s, e, 2)

	w1 := performRequest(t, http.MethodPatch, s.handler.PauseEvent, stageParams(e), "", nil)
	require.Equal(t, http.StatusOK, w1.Code, w1.Body.String())
	assert.Equal(t, "EVENT_PAUSED", jsonBody(t, w1)["code"])
	require.Len(t, s.notifRepo.created, 2)
	for _, n := range s.notifRepo.created {
		assert.Equal(t, notification.TypeEventPaused, n.Type)
		assert.Empty(t, n.Data)
	}

	w2 := performRequest(t, http.MethodPatch, s.handler.PauseEvent, stageParams(e), "", nil)
	require.Equal(t, http.StatusOK, w2.Code, w2.Body.String())
	assert.Equal(t, "EVENT_RESUMED", jsonBody(t, w2)["code"])
	assert.Len(t, s.notifRepo.created, 2, "resuming must not notify")
}

func deadlineEvent(s *testEventHandlerSet) (*event.Event, string, string) {
	e := newEventInStage(s, event.StageParticipation)
	cur := time.Now().AddDate(0, 0, 3)
	e.ParticipationEstimatedEndDate = &cur
	return e, dateStr(cur), dateStr(time.Now().AddDate(0, 0, 8))
}

func TestUpdateEstimatedEndDate_NotifiesParticipants(t *testing.T) { // TS-9
	s := newTestEventHandlerSet()
	e, prev, later := deadlineEvent(s)
	seedInscribed(s, e, 2)

	w := performAuthedRequest(t, http.MethodPatch, s.handler.UpdateEstimatedEndDate, stageParams(e), "",
		map[string]interface{}{"stage": "participation", "estimated_end_date": later})

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Equal(t, "ESTIMATED_DATE_UPDATED", resp["code"])
	assert.Equal(t, prev, resp["data"].(map[string]interface{})["previous_date"])
	require.Len(t, s.notifRepo.created, 2)
	for _, n := range s.notifRepo.created {
		assert.Equal(t, notification.TypeDeadlineChanged, n.Type)
		assert.Equal(t, notification.Data{"stage": "participation", "new_date": later}, n.Data)
	}
}

func TestUpdateEstimatedEndDate_RejectedDoesNotNotify(t *testing.T) { // TS-10
	s := newTestEventHandlerSet()
	e, _, _ := deadlineEvent(s)
	seedInscribed(s, e, 2)

	w := performAuthedRequest(t, http.MethodPatch, s.handler.UpdateEstimatedEndDate, stageParams(e), "",
		map[string]interface{}{"stage": "participation", "estimated_end_date": dateStr(time.Now().AddDate(0, 0, 1))})

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "CANNOT_ADVANCE_DEADLINE", jsonBody(t, w)["code"])
	assert.Empty(t, s.notifRepo.created)
}

func TestCancelEvent_ParticipantsReadFailureDoesNotChangeResponse(t *testing.T) { // TS-16
	s := newTestEventHandlerSet()
	e := newEventInStage(s, event.StageParticipation)
	s.userRepo.getParticipantsErr = errors.New("db down")

	w := performRequest(t, http.MethodPatch, s.handler.CancelEvent, stageParams(e), "", nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, "EVENT_CANCELLED", jsonBody(t, w)["code"])
	assert.Empty(t, s.notifRepo.created)
}

func TestCancelEvent_WithoutParticipantsSkipsBatch(t *testing.T) { // TS-17
	s := newTestEventHandlerSet()
	e := newEventInStage(s, event.StageParticipation)

	w := performRequest(t, http.MethodPatch, s.handler.CancelEvent, stageParams(e), "", nil)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Zero(t, s.notifRepo.batchCalls)
}

// --- registration (TS-11, TS-12) ---

func TestRegisterParticipant_EmitsConfirmationAndAggregatedNotice(t *testing.T) { // TS-11
	s := newTestEventHandlerSet()
	e, authorID := newRegisterableEvent()
	s.eventRepo.addEvent(e)

	w := performRequest(t, http.MethodPost, s.handler.RegisterParticipant, stageParams(e), "",
		map[string]interface{}{"participant_name": "Luz Pérez", "participant_email": "luz@example.com"})

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	assert.Equal(t, "PARTICIPANT_REGISTERED", jsonBody(t, w)["code"])
	luz, err := s.userRepo.GetByEmail("luz@example.com")
	require.NoError(t, err)
	require.Len(t, s.notifRepo.created, 1)
	n := s.notifRepo.created[0]
	assert.Equal(t, notification.TypeRegistrationConfirmed, n.Type)
	assert.Equal(t, luz.ID, n.RecipientID)
	assert.Empty(t, n.Data)
	assert.Equal(t, [][2]string{{authorID.String(), e.ID.String()}}, s.notifRepo.registeredUpserts)
}

func TestRegisterParticipant_RejectedDoesNotNotify(t *testing.T) { // TS-12
	body := map[string]interface{}{"participant_name": "Luz", "participant_email": "luz@example.com"}
	tests := []struct {
		name   string
		setup  func(e *event.Event)
		status int
		code   string
	}{
		{"wrong stage", func(e *event.Event) { e.Stage = event.StageVoting }, http.StatusBadRequest, "INVALID_REGISTRATION_STAGE"},
		{"paused", func(e *event.Event) { e.IsPaused = true }, http.StatusForbidden, "EVENT_PAUSED"},
		{"max reached", func(e *event.Event) { m := 1; e.MaxParticipants = &m }, http.StatusBadRequest, "MAX_PARTICIPANTS_REACHED"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := newTestEventHandlerSet()
			e, _ := newRegisterableEvent()
			tt.setup(e)
			s.eventRepo.addEvent(e)
			seedInscribed(s, e, 1)

			w := performRequest(t, http.MethodPost, s.handler.RegisterParticipant, stageParams(e), "", body)

			assert.Equal(t, tt.status, w.Code, w.Body.String())
			assert.Equal(t, tt.code, jsonBody(t, w)["code"])
			assert.Empty(t, s.notifRepo.created)
			assert.Empty(t, s.notifRepo.registeredUpserts)
		})
	}
}

func TestRegisterParticipant_AlreadyRegisteredDoesNotNotify(t *testing.T) { // TS-12
	s := newTestEventHandlerSet()
	e, _ := newRegisterableEvent()
	s.eventRepo.addEvent(e)
	existing := participant.NewParticipant("Existing", "Person", "existing@example.com")
	s.userRepo.addUser(existing)
	s.eventRepo.byParticipant[existing.ID.String()] = []*event.Event{e}

	w := performRequest(t, http.MethodPost, s.handler.RegisterParticipant, stageParams(e), "",
		map[string]interface{}{"participant_name": "Existing", "participant_email": "existing@example.com"})

	assert.Equal(t, http.StatusConflict, w.Code, w.Body.String())
	assert.Equal(t, "ALREADY_REGISTERED", jsonBody(t, w)["code"])
	assert.Empty(t, s.notifRepo.created)
	assert.Empty(t, s.notifRepo.registeredUpserts)
}

// --- ranking (TS-13, TS-14) ---

func TestSubmitRankingVotes_NotifiesParticipantWithReplacedFlag(t *testing.T) { // TS-13
	s := newTestHandlerSet()
	e, p, assignment, attachments := setupVotingScenario(t, s)
	body := map[string]interface{}{
		"assignment_id": assignment.ID.String(),
		"rankings": []map[string]interface{}{
			{"attachment_id": attachments[0].ID.String(), "rank": 1},
			{"attachment_id": attachments[1].ID.String(), "rank": 2},
		},
	}
	params := gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}}

	w1 := performRequest(t, http.MethodPost, s.handler.SubmitRankingVotes, params, "", body)
	require.Equal(t, http.StatusCreated, w1.Code, w1.Body.String())
	assert.Equal(t, false, jsonBody(t, w1)["replaced"])
	w2 := performRequest(t, http.MethodPost, s.handler.SubmitRankingVotes, params, "", body)
	require.Equal(t, http.StatusCreated, w2.Code, w2.Body.String())
	assert.Equal(t, true, jsonBody(t, w2)["replaced"])

	require.Len(t, s.notifRepo.created, 2)
	assert.Equal(t, notification.TypeRankingSubmitted, s.notifRepo.created[0].Type)
	assert.Equal(t, p.ID, s.notifRepo.created[0].RecipientID)
	assert.Equal(t, notification.Data{"replaced": false}, s.notifRepo.created[0].Data)
	assert.Equal(t, notification.Data{"replaced": true}, s.notifRepo.created[1].Data)
}

func TestSubmitRankingVotes_RejectedDoesNotNotify(t *testing.T) { // TS-14
	s := newTestHandlerSet()
	e, p, assignment, attachments := setupVotingScenario(t, s)
	body := map[string]interface{}{
		"assignment_id": assignment.ID.String(),
		"rankings": []map[string]interface{}{
			{"attachment_id": attachments[0].ID.String(), "rank": 1},
			{"attachment_id": attachments[1].ID.String(), "rank": 1},
		},
	}

	w := performRequest(t, http.MethodPost, s.handler.SubmitRankingVotes,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}}, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "Duplicate rank found", jsonBody(t, w)["error"])
	assert.Empty(t, s.notifRepo.created)
}

// --- failures never change the response (TS-15) ---

func TestNotificationInsertFailureDoesNotChangeResponses(t *testing.T) { // TS-15
	boom := errors.New("db down")

	t.Run("stage", func(t *testing.T) {
		s := newTestEventHandlerSet()
		s.notifRepo.createErr = boom
		e := newEventInStage(s, event.StageCreation)
		seedInscribed(s, e, 2)
		w := patchStage(t, s, e.ID, map[string]interface{}{"stage": "participation", "estimated_end_date": dateStr(time.Now().AddDate(0, 0, 5))})
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())
		assert.Equal(t, "STAGE_UPDATED", jsonBody(t, w)["code"])
		assert.NotContains(t, w.Body.String(), "db down")
	})
	t.Run("cancel and pause", func(t *testing.T) {
		s := newTestEventHandlerSet()
		s.notifRepo.createErr = boom
		e := newEventInStage(s, event.StageParticipation)
		seedInscribed(s, e, 2)
		w := performRequest(t, http.MethodPatch, s.handler.PauseEvent, stageParams(e), "", nil)
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())
		assert.Equal(t, "EVENT_PAUSED", jsonBody(t, w)["code"])
		w = performRequest(t, http.MethodPatch, s.handler.CancelEvent, stageParams(e), "", nil)
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())
		assert.Equal(t, "EVENT_CANCELLED", jsonBody(t, w)["code"])
	})
	t.Run("deadline", func(t *testing.T) {
		s := newTestEventHandlerSet()
		s.notifRepo.createErr = boom
		e, _, later := deadlineEvent(s)
		seedInscribed(s, e, 2)
		w := performAuthedRequest(t, http.MethodPatch, s.handler.UpdateEstimatedEndDate, stageParams(e), "",
			map[string]interface{}{"stage": "participation", "estimated_end_date": later})
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())
		assert.Equal(t, "ESTIMATED_DATE_UPDATED", jsonBody(t, w)["code"])
	})
	t.Run("register", func(t *testing.T) {
		s := newTestEventHandlerSet()
		s.notifRepo.createErr, s.notifRepo.upsertErr = boom, boom
		e, _ := newRegisterableEvent()
		s.eventRepo.addEvent(e)
		w := performRequest(t, http.MethodPost, s.handler.RegisterParticipant, stageParams(e), "",
			map[string]interface{}{"participant_name": "Luz", "participant_email": "luz@example.com"})
		require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
		assert.Equal(t, "PARTICIPANT_REGISTERED", jsonBody(t, w)["code"])
	})
	t.Run("ranking", func(t *testing.T) {
		s := newTestHandlerSet()
		s.notifRepo.createErr = boom
		e, p, assignment, attachments := setupVotingScenario(t, s)
		body := map[string]interface{}{
			"assignment_id": assignment.ID.String(),
			"rankings": []map[string]interface{}{
				{"attachment_id": attachments[0].ID.String(), "rank": 1},
				{"attachment_id": attachments[1].ID.String(), "rank": 2},
			},
		}
		w := performRequest(t, http.MethodPost, s.handler.SubmitRankingVotes,
			gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}}, "", body)
		require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
		assert.Equal(t, float64(2), jsonBody(t, w)["votes_count"])
	})
}
