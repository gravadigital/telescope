package handlers

import (
	"errors"
	"net/http"
	"sort"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/domain/event"
	"github.com/gravadigital/telescopio-api/internal/domain/participant"
	"github.com/gravadigital/telescopio-api/internal/domain/vote"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type scopeFixture struct {
	s              *testUserHandlerSet
	user           *participant.User
	o1, o2         *event.Event // organized: creation, participation
	p1, p2, p3     *event.Event // participating: participation, voting, results
	allEventIDs    []string
	participantIDs []string
}

func newScopeFixture() scopeFixture {
	s := newTestUserHandlerSet()
	u := participant.NewOrganizer("Ana", "Author", "ana@example.com")
	s.userRepo.addUser(u)

	base := time.Now().Add(-10 * time.Hour)
	mk := func(name string, author uuid.UUID, stage event.Stage, age time.Duration) *event.Event {
		e := event.NewEvent(name, "desc", author, time.Now(), time.Now().AddDate(0, 0, 5), "org")
		e.Stage = stage
		e.CreatedAt = base.Add(age)
		s.eventRepo.addEvent(e)
		return e
	}
	f := scopeFixture{s: s, user: u}
	f.o1 = mk("O1", u.ID, event.StageCreation, 5*time.Hour)
	f.o2 = mk("O2", u.ID, event.StageParticipation, 4*time.Hour)
	f.p1 = mk("P1", uuid.New(), event.StageParticipation, 3*time.Hour)
	f.p2 = mk("P2", uuid.New(), event.StageVoting, 2*time.Hour)
	f.p3 = mk("P3", uuid.New(), event.StageResult, 1*time.Hour)
	s.eventRepo.byParticipant[u.ID.String()] = []*event.Event{f.p1, f.p2, f.p3}

	max := 20
	f.o2.MaxParticipants = &max
	est := time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)
	f.o2.ParticipationEstimatedEndDate = &est
	s.eventRepo.participantCounts = map[string]int{f.o2.ID.String(): 12}

	// U has a proposal in P1 and P3, an incomplete assignment in P2, a completed one in P3.
	s.attachmentRepo.addAttachment(attachmentFor(f.p1.ID, u.ID))
	s.attachmentRepo.addAttachment(attachmentFor(f.p3.ID, u.ID))
	a2 := &vote.Assignment{ID: uuid.New(), EventID: f.p2.ID, ParticipantID: u.ID}
	a3 := &vote.Assignment{ID: uuid.New(), EventID: f.p3.ID, ParticipantID: u.ID, IsCompleted: true}
	s.voteRepo.assignments[a2.ID.String()] = a2
	s.voteRepo.assignments[a3.ID.String()] = a3
	s.resultsRepo.byEvent[f.p3.ID.String()] = &vote.VotingResults{
		EventID: f.p3.ID,
		AdjustedRanking: vote.AttachmentResultSlice{
			{ParticipantID: uuid.New(), AdjustedRank: 1},
			{ParticipantID: u.ID, AdjustedRank: 2},
			{ParticipantID: uuid.New(), AdjustedRank: 3},
		},
	}
	s.resultsRepo.byEvent[f.p2.ID.String()] = &vote.VotingResults{EventID: f.p2.ID}

	f.allEventIDs = []string{f.o1.ID.String(), f.o2.ID.String(), f.p1.ID.String(), f.p2.ID.String(), f.p3.ID.String()}
	f.participantIDs = []string{f.p1.ID.String(), f.p2.ID.String(), f.p3.ID.String()}
	return f
}

func (f scopeFixture) get(t *testing.T, scope string, callerID uuid.UUID, role participant.Role) (int, map[string]interface{}) {
	t.Helper()
	query := ""
	if scope != "" {
		query = "scope=" + scope
	}
	w := performAs(t, http.MethodGet, f.s.handler.GetUserEvents, userParams(f.user.ID), query, nil, callerID, role)
	return w.Code, jsonBodyOrNil(t, w.Body.Bytes())
}

func userEventsByName(t *testing.T, body map[string]interface{}) map[string]map[string]interface{} {
	t.Helper()
	out := map[string]map[string]interface{}{}
	for _, item := range body["data"].([]interface{}) {
		m := item.(map[string]interface{})
		out[m["name"].(string)] = m
	}
	return out
}

func TestGetUserEvents_ScopeAllIncludesOrganizedAndParticipating(t *testing.T) {
	f := newScopeFixture()

	code, body := f.get(t, "all", f.user.ID, participant.RoleOrganizer)
	require.Equal(t, http.StatusOK, code)

	data := body["data"].([]interface{})
	require.Len(t, data, 5)
	var names []string
	for _, item := range data {
		names = append(names, item.(map[string]interface{})["name"].(string))
	}
	assert.Equal(t, []string{"O1", "O2", "P1", "P2", "P3"}, names, "ordered by created_at DESC")

	byName := userEventsByName(t, body)
	for _, n := range []string{"O1", "O2"} {
		assert.Equal(t, "creator", byName[n]["role"])
		assert.Nil(t, byName[n]["my_status"])
	}
	for _, n := range []string{"P1", "P2", "P3"} {
		assert.Equal(t, "participant", byName[n]["role"])
	}
	assert.Equal(t, "creation", byName["O1"]["stage"])

	o2 := byName["O2"]
	assert.Equal(t, float64(20), o2["max_participants"])
	assert.Equal(t, float64(12), o2["participants_count"])
	assert.Equal(t, "2026-11-01", o2["participation_estimated_end_date"])
	assert.Nil(t, o2["voting_estimated_end_date"])
	assert.Equal(t, false, o2["is_paused"])
	assert.Equal(t, false, o2["is_cancelled"])
	assert.Equal(t, "O2", o2["title"])
	assert.Equal(t, f.user.ID.String(), o2["creator_id"])
}

func TestGetUserEvents_ScopeAllMyStatus(t *testing.T) {
	f := newScopeFixture()
	_, body := f.get(t, "all", f.user.ID, participant.RoleOrganizer)
	byName := userEventsByName(t, body)

	assert.Equal(t, map[string]interface{}{"has_attachment": true, "has_assignment": false, "ranking_submitted": false, "result_position": nil, "result_total": nil}, byName["P1"]["my_status"])
	assert.Equal(t, map[string]interface{}{"has_attachment": false, "has_assignment": true, "ranking_submitted": false, "result_position": nil, "result_total": nil}, byName["P2"]["my_status"])
	assert.Equal(t, map[string]interface{}{"has_attachment": true, "has_assignment": true, "ranking_submitted": true, "result_position": float64(2), "result_total": float64(3)}, byName["P3"]["my_status"])
}

func TestGetUserEvents_ScopeAllUsesOneBatchQueryPerTable(t *testing.T) {
	f := newScopeFixture()
	_, _ = f.get(t, "all", f.user.ID, participant.RoleOrganizer)

	require.Len(t, f.s.eventRepo.countCalls, 1)
	assert.ElementsMatch(t, f.allEventIDs, f.s.eventRepo.countCalls[0])
	require.Len(t, f.s.attachmentRepo.batchCalls, 1)
	assert.Equal(t, f.user.ID.String(), f.s.attachmentRepo.batchCalls[0].participantID)
	assert.ElementsMatch(t, f.participantIDs, f.s.attachmentRepo.batchCalls[0].eventIDs)
	require.Len(t, f.s.voteRepo.batchCalls, 1)
	assert.ElementsMatch(t, f.participantIDs, f.s.voteRepo.batchCalls[0].eventIDs)
	// Results are only fetched for events in the results stage (not P2, in voting).
	require.Len(t, f.s.resultsRepo.batchCalls, 1)
	assert.Equal(t, []string{f.p3.ID.String()}, f.s.resultsRepo.batchCalls[0])
}

func TestGetUserEvents_MyStatusWithoutUsableResults(t *testing.T) {
	f := newScopeFixture()

	delete(f.s.resultsRepo.byEvent, f.p3.ID.String())
	_, body := f.get(t, "all", f.user.ID, participant.RoleOrganizer)
	status := userEventsByName(t, body)["P3"]["my_status"].(map[string]interface{})
	assert.Nil(t, status["result_position"])
	assert.Nil(t, status["result_total"])

	f.s.resultsRepo.byEvent[f.p3.ID.String()] = &vote.VotingResults{EventID: f.p3.ID,
		AdjustedRanking: vote.AttachmentResultSlice{{ParticipantID: uuid.New(), AdjustedRank: 1}}}
	_, body = f.get(t, "all", f.user.ID, participant.RoleOrganizer)
	status = userEventsByName(t, body)["P3"]["my_status"].(map[string]interface{})
	assert.Nil(t, status["result_position"])
	assert.Nil(t, status["result_total"])
}

func TestGetUserEvents_WithoutScopeKeepsHistoricalShape(t *testing.T) {
	for _, scope := range []string{"", "participating"} {
		t.Run("scope="+scope, func(t *testing.T) {
			f := newScopeFixture()
			code, body := f.get(t, scope, f.user.ID, participant.RoleOrganizer)
			require.Equal(t, http.StatusOK, code)

			data := body["data"].([]interface{})
			require.Len(t, data, 3)
			want := []string{"author_id", "created_at", "creator_id", "date", "description", "end_date", "id", "name", "organizer", "stage", "start_date", "title", "updated_at"}
			for _, item := range data {
				var keys []string
				for k := range item.(map[string]interface{}) {
					keys = append(keys, k)
				}
				sort.Strings(keys)
				assert.Equal(t, want, keys)
			}
			assert.Empty(t, f.s.eventRepo.countCalls)
			assert.Empty(t, f.s.attachmentRepo.batchCalls)
			assert.Empty(t, f.s.voteRepo.batchCalls)
			assert.Empty(t, f.s.resultsRepo.batchCalls)
		})
	}
}

func TestGetUserEvents_ScopeAllOnAnotherUser(t *testing.T) {
	f := newScopeFixture()

	code, body := f.get(t, "all", uuid.New(), participant.RoleParticipant)
	assert.Equal(t, http.StatusForbidden, code)
	assert.Equal(t, "FORBIDDEN", body["code"])
	assert.Empty(t, f.s.eventRepo.countCalls)
	assert.Zero(t, f.s.eventRepo.listCalls, "no event lookup before the permission check")
	assert.Empty(t, f.s.attachmentRepo.batchCalls)
	assert.Empty(t, f.s.voteRepo.batchCalls)
	assert.Empty(t, f.s.resultsRepo.batchCalls)

	code, body = f.get(t, "all", uuid.New(), participant.RoleAdmin)
	require.Equal(t, http.StatusOK, code)
	assert.Len(t, body["data"], 5)

	// Without scope the historical check is unchanged, admin included.
	code, body = f.get(t, "", uuid.New(), participant.RoleParticipant)
	assert.Equal(t, http.StatusUnauthorized, code)
	assert.Equal(t, "UNAUTHORIZED_ACCESS", body["code"])
}

func TestGetUserEvents_InvalidScope(t *testing.T) {
	f := newScopeFixture()

	code, body := f.get(t, "mine", f.user.ID, participant.RoleOrganizer)
	assert.Equal(t, http.StatusBadRequest, code)
	assert.Equal(t, "INVALID_PAYLOAD", body["code"])
	assert.Equal(t, "scope must be one of: participating, all", body["details"])
}

func TestGetUserEvents_ScopeAllWithoutAuthentication(t *testing.T) {
	f := newScopeFixture()
	w := performAs(t, http.MethodGet, f.s.handler.GetUserEvents, userParams(f.user.ID), "scope=all", nil, uuid.Nil, "")
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Equal(t, "NO_AUTH_TOKEN", jsonBody(t, w)["code"])
}

func TestGetUserEvents_ScopeAllBatchFailure(t *testing.T) {
	f := newScopeFixture()
	f.s.voteRepo.batchErr = errors.New("db down")

	code, body := f.get(t, "all", f.user.ID, participant.RoleOrganizer)
	assert.Equal(t, http.StatusInternalServerError, code)
	assert.Equal(t, "RETRIEVAL_ERROR", body["code"])
}

func TestGetUserEvents_ScopeAllWithoutEvents(t *testing.T) {
	s := newTestUserHandlerSet()
	u := participant.NewParticipant("Sin", "Eventos", "none@example.com")
	s.userRepo.addUser(u)

	w := performAs(t, http.MethodGet, s.handler.GetUserEvents, userParams(u.ID), "scope=all", nil, u.ID, participant.RoleParticipant)
	require.Equal(t, http.StatusOK, w.Code)
	assert.JSONEq(t, `{"data":[]}`, w.Body.String())
	assert.Empty(t, s.eventRepo.countCalls)
}

func TestBuildMyStatus(t *testing.T) {
	userID := uuid.New()
	ranking := vote.AttachmentResultSlice{{ParticipantID: uuid.New(), AdjustedRank: 1}, {ParticipantID: userID, AdjustedRank: 2}}
	results := &vote.VotingResults{AdjustedRanking: ranking}
	completed := &vote.Assignment{IsCompleted: true}
	pending := &vote.Assignment{}

	tests := []struct {
		name       string
		stage      event.Stage
		attachment bool
		assignment *vote.Assignment
		results    *vote.VotingResults
		submitted  bool
		position   interface{}
		total      interface{}
	}{
		{"participation, proposal only", event.StageParticipation, true, nil, nil, false, nil, nil},
		{"voting, pending assignment", event.StageVoting, false, pending, nil, false, nil, nil},
		{"voting, stored results are ignored", event.StageVoting, false, completed, results, true, nil, nil},
		{"results, ranked", event.StageResult, true, completed, results, true, 2, 2},
		{"results, no stored results", event.StageResult, true, completed, nil, true, nil, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildMyStatus(&event.Event{Stage: tt.stage}, userID, tt.attachment, tt.assignment, tt.results)
			assert.Equal(t, tt.attachment, got["has_attachment"])
			assert.Equal(t, tt.assignment != nil, got["has_assignment"])
			assert.Equal(t, tt.submitted, got["ranking_submitted"])
			assert.Equal(t, tt.position, got["result_position"])
			assert.Equal(t, tt.total, got["result_total"])
		})
	}
}
