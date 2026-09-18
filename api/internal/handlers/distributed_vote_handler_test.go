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
	"github.com/gravadigital/telescopio-api/internal/domain/vote"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// testHandlerSet bundles all the mock repositories a DistributedVoteHandler
// needs, so each test can configure only the ones it cares about.
type testHandlerSet struct {
	eventRepo      *mockEventRepository
	userRepo       *mockUserRepository
	attachmentRepo *mockAttachmentRepository
	voteRepo       *mockVoteRepository
	configRepo     *mockVotingConfigurationRepository
	resultsRepo    *mockVotingResultsRepository
	handler        *DistributedVoteHandler
}

func newTestHandlerSet() *testHandlerSet {
	s := &testHandlerSet{
		eventRepo:      newMockEventRepository(),
		userRepo:       newMockUserRepository(),
		attachmentRepo: newMockAttachmentRepository(),
		voteRepo:       newMockVoteRepository(),
		configRepo:     newMockVotingConfigurationRepository(),
		resultsRepo:    newMockVotingResultsRepository(),
	}
	s.handler = NewDistributedVoteHandler(
		s.voteRepo, s.eventRepo, s.attachmentRepo, s.userRepo, s.configRepo, s.resultsRepo,
		&config.Config{},
	)
	return s
}

// performRequest builds a Gin context with the given path params and JSON
// body, invokes handlerFunc, and returns the recorded response.
func performRequest(t *testing.T, method string, handlerFunc gin.HandlerFunc, params gin.Params, query string, body interface{}) *httptest.ResponseRecorder {
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

	url := "/test"
	if query != "" {
		url += "?" + query
	}
	req := httptest.NewRequest(method, url, bodyReader)
	req.Header.Set("Content-Type", "application/json")
	c.Request = req
	c.Params = params

	handlerFunc(c)
	return w
}

func jsonBody(t *testing.T, w *httptest.ResponseRecorder) map[string]interface{} {
	t.Helper()
	var out map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &out)
	require.NoError(t, err, "response body: %s", w.Body.String())
	return out
}

func newParticipationEvent() *event.Event {
	e := event.NewEvent("Test Event", "desc", uuid.New(), time.Now(), time.Now().Add(48*time.Hour), "org")
	e.Stage = event.StageParticipation
	return e
}

func newVotingEvent() *event.Event {
	e := event.NewEvent("Test Event", "desc", uuid.New(), time.Now(), time.Now().Add(48*time.Hour), "org")
	e.Stage = event.StageVoting
	return e
}

func addParticipants(s *testHandlerSet, eventID uuid.UUID, n int) []*participant.User {
	users := make([]*participant.User, n)
	roles := make([]*participant.UserWithEventRole, n)
	for i := 0; i < n; i++ {
		u := participant.NewParticipant("P", "articipant", uuid.NewString()+"@example.com")
		s.userRepo.addUser(u)
		s.eventRepo.byParticipant[u.ID.String()] = append(s.eventRepo.byParticipant[u.ID.String()], s.eventRepo.events[eventID.String()])
		users[i] = u
		roles[i] = &participant.UserWithEventRole{User: *u, EventRole: "participant"}
	}
	s.userRepo.setEventParticipants(eventID.String(), roles)
	return users
}

func addAttachments(s *testHandlerSet, eventID uuid.UUID, owners []*participant.User) []*attachment.Attachment {
	out := make([]*attachment.Attachment, len(owners))
	for i, owner := range owners {
		a := attachment.NewAttachment(eventID, owner.ID, "f.jpg", "photo.jpg", "/tmp/f.jpg", "image/jpeg", 1024)
		s.attachmentRepo.addAttachment(a)
		out[i] = a
	}
	return out
}

// ---------------------------------------------------------------------------
// CreateVotingConfiguration
// ---------------------------------------------------------------------------

func TestCreateVotingConfiguration_Success(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, 3)
	addAttachments(s, e.ID, users)

	body := map[string]interface{}{
		"attachments_per_evaluator": 2,
		"min_evaluations_per_file":  1,
		"adjustment_magnitude":      3,
	}
	w := performRequest(t, http.MethodPost, s.handler.CreateVotingConfiguration,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Equal(t, "CONFIG_CREATED", resp["code"])
}

func TestCreateVotingConfiguration_RejectsInvalidEventID(t *testing.T) {
	s := newTestHandlerSet()
	w := performRequest(t, http.MethodPost, s.handler.CreateVotingConfiguration,
		gin.Params{{Key: "event_id", Value: "not-a-uuid"}}, "", map[string]interface{}{"attachments_per_evaluator": 2})

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_EVENT_ID", jsonBody(t, w)["code"])
}

func TestCreateVotingConfiguration_RejectsWrongStage(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent()
	e.Stage = event.StageCreation
	s.eventRepo.addEvent(e)

	w := performRequest(t, http.MethodPost, s.handler.CreateVotingConfiguration,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "",
		map[string]interface{}{"attachments_per_evaluator": 2, "min_evaluations_per_file": 1, "adjustment_magnitude": 3})

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_EVENT_STAGE", jsonBody(t, w)["code"])
}

func TestCreateVotingConfiguration_RejectsWhenAlreadyExists(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent()
	s.eventRepo.addEvent(e)
	s.configRepo.byEvent[e.ID.String()] = vote.NewVotingConfiguration(e.ID, 2)

	w := performRequest(t, http.MethodPost, s.handler.CreateVotingConfiguration,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "",
		map[string]interface{}{"attachments_per_evaluator": 2, "min_evaluations_per_file": 1, "adjustment_magnitude": 3})

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Equal(t, "CONFIG_EXISTS", jsonBody(t, w)["code"])
}

func TestCreateVotingConfiguration_RejectsInsufficientParticipants(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, 1) // only 1, need >= 2
	addAttachments(s, e.ID, users)

	w := performRequest(t, http.MethodPost, s.handler.CreateVotingConfiguration,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "",
		map[string]interface{}{"attachments_per_evaluator": 2, "min_evaluations_per_file": 1, "adjustment_magnitude": 3})

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INSUFFICIENT_PARTICIPANTS", jsonBody(t, w)["code"])
}

func TestCreateVotingConfiguration_RejectsMExceedingConflictOfInterestBound(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, 3)
	addAttachments(s, e.ID, users) // 3 attachments -> max evaluable per participant = 2

	w := performRequest(t, http.MethodPost, s.handler.CreateVotingConfiguration,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "",
		map[string]interface{}{"attachments_per_evaluator": 3, "min_evaluations_per_file": 1, "adjustment_magnitude": 3})

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "M_EXCEEDS_EVALUABLE", jsonBody(t, w)["code"])
}

// TestCreateVotingConfiguration_AppliesSmartDefaults_ForThresholds verifies
// quality thresholds default correctly when omitted (bind as 0).
func TestCreateVotingConfiguration_AppliesSmartDefaults_ForThresholds(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, 4)
	addAttachments(s, e.ID, users)

	body := map[string]interface{}{
		"attachments_per_evaluator": 3,
		"adjustment_magnitude":      5,
		"min_evaluations_per_file":  2,
	}
	w := performRequest(t, http.MethodPost, s.handler.CreateVotingConfiguration,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	saved := s.configRepo.byEvent[e.ID.String()]
	require.NotNil(t, saved)
	assert.Equal(t, 0.6, saved.QualityGoodThreshold)
	assert.Equal(t, 0.3, saved.QualityBadThreshold)
	assert.Equal(t, 5, saved.AdjustmentMagnitude)
	assert.Equal(t, 2, saved.MinEvaluationsPerFile)
}

// TestCreateVotingConfiguration_AppliesSmartDefaults_ForMagnitudeAndMinEval is
// a regression test for a bug found while writing this suite:
// CreateVotingConfiguration has smart-default logic for AdjustmentMagnitude
// and MinEvaluationsPerFile ("if config.AdjustmentMagnitude == 0 { ... = 3
// }"), but the request struct's `binding:"min=1"` tag on both fields used to
// make ShouldBindJSON reject the request with 400 before that code could
// ever see a zero value - a client omitting either field (reasonably
// expecting the documented default) got a validation error instead.
//
// Both tags are now `omitempty,min=1,max=N`, so an omitted/zero value skips
// the min check and reaches the default block, while an explicit out-of-range
// value (e.g. 0 sent as significant, or negative) is still rejected.
func TestCreateVotingConfiguration_AppliesSmartDefaults_ForMagnitudeAndMinEval(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, 4)
	addAttachments(s, e.ID, users)

	// Omit adjustment_magnitude and min_evaluations_per_file entirely.
	body := map[string]interface{}{"attachments_per_evaluator": 3}
	w := performRequest(t, http.MethodPost, s.handler.CreateVotingConfiguration,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	saved := s.configRepo.byEvent[e.ID.String()]
	require.NotNil(t, saved)
	assert.Equal(t, 3, saved.AdjustmentMagnitude)
	assert.Equal(t, 3, saved.MinEvaluationsPerFile)
}

// ---------------------------------------------------------------------------
// GenerateAssignments
// ---------------------------------------------------------------------------

func TestGenerateAssignmentsHandler_Success(t *testing.T) {
	s := newTestHandlerSet()
	e := newVotingEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, 4)
	addAttachments(s, e.ID, users)
	s.configRepo.byEvent[e.ID.String()] = &vote.VotingConfiguration{
		ID: uuid.New(), EventID: e.ID, AttachmentsPerEvaluator: 2,
		QualityGoodThreshold: 0.6, QualityBadThreshold: 0.3,
		AdjustmentMagnitude: 3, MinEvaluationsPerFile: 1,
	}

	w := performRequest(t, http.MethodPost, s.handler.GenerateAssignments,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	saved, err := s.voteRepo.GetAssignmentsByEventID(e.ID.String())
	require.NoError(t, err)
	assert.Len(t, saved, 4)
}

func TestGenerateAssignmentsHandler_RejectsWrongStage(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent() // must be exactly StageVoting, not Participation
	s.eventRepo.addEvent(e)

	w := performRequest(t, http.MethodPost, s.handler.GenerateAssignments,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_EVENT_STAGE", jsonBody(t, w)["code"])
}

func TestGenerateAssignmentsHandler_RejectsWhenAssignmentsExist(t *testing.T) {
	s := newTestHandlerSet()
	e := newVotingEvent()
	s.eventRepo.addEvent(e)
	existing := vote.NewAssignment(e.ID, uuid.New(), []uuid.UUID{uuid.New()})
	s.voteRepo.assignments[existing.ID.String()] = existing

	w := performRequest(t, http.MethodPost, s.handler.GenerateAssignments,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Equal(t, "ASSIGNMENTS_EXIST", jsonBody(t, w)["code"])
}

func TestGenerateAssignmentsHandler_RejectsMissingConfig(t *testing.T) {
	s := newTestHandlerSet()
	e := newVotingEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, 3)
	addAttachments(s, e.ID, users)
	// No voting configuration created.

	w := performRequest(t, http.MethodPost, s.handler.GenerateAssignments,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, "CONFIG_NOT_FOUND", jsonBody(t, w)["code"])
}

// ---------------------------------------------------------------------------
// GetParticipantAssignment
// ---------------------------------------------------------------------------

func TestGetParticipantAssignment_Success(t *testing.T) {
	s := newTestHandlerSet()
	e := newVotingEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, 2)
	p := users[0]

	assignment := vote.NewAssignment(e.ID, p.ID, []uuid.UUID{uuid.New()})
	s.voteRepo.assignments[assignment.ID.String()] = assignment

	w := performRequest(t, http.MethodGet, s.handler.GetParticipantAssignment,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}}, "", nil)

	assert.Equal(t, http.StatusOK, w.Code, w.Body.String())
}

func TestGetParticipantAssignment_RejectsNonParticipant(t *testing.T) {
	s := newTestHandlerSet()
	e := newVotingEvent()
	s.eventRepo.addEvent(e)
	stranger := uuid.New() // never registered for the event

	w := performRequest(t, http.MethodGet, s.handler.GetParticipantAssignment,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: stranger.String()}}, "", nil)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestGetParticipantAssignment_RejectsWrongStage(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent()
	s.eventRepo.addEvent(e)

	w := performRequest(t, http.MethodGet, s.handler.GetParticipantAssignment,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: uuid.New().String()}}, "", nil)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// ---------------------------------------------------------------------------
// SubmitRankingVotes — this is the endpoint behind the "what if a participant
// doesn't vote" scenario: it's what marks an assignment IsCompleted.
// ---------------------------------------------------------------------------

func setupVotingScenario(t *testing.T, s *testHandlerSet) (e *event.Event, p *participant.User, assignment *vote.Assignment, attachments []*attachment.Attachment) {
	t.Helper()
	e = newVotingEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, 2)
	p = users[0]
	attachments = addAttachments(s, e.ID, users)

	assignment = vote.NewAssignment(e.ID, p.ID, []uuid.UUID{attachments[0].ID, attachments[1].ID})
	s.voteRepo.assignments[assignment.ID.String()] = assignment
	return
}

func TestSubmitRankingVotes_CompletesAssignmentWhenAllAttachmentsRanked(t *testing.T) {
	s := newTestHandlerSet()
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
	updated, err := s.voteRepo.GetAssignmentByParticipant(e.ID.String(), p.ID.String())
	require.NoError(t, err)
	assert.True(t, updated.IsCompleted, "assignment should be marked completed once every attachment is ranked")
	assert.NotNil(t, updated.CompletedAt)
}

func TestSubmitRankingVotes_DoesNotCompleteAssignmentOnPartialVote(t *testing.T) {
	s := newTestHandlerSet()
	e, p, assignment, attachments := setupVotingScenario(t, s)

	// Only rank one of the two assigned attachments.
	body := map[string]interface{}{
		"assignment_id": assignment.ID.String(),
		"rankings": []map[string]interface{}{
			{"attachment_id": attachments[0].ID.String(), "rank": 1},
		},
	}
	w := performRequest(t, http.MethodPost, s.handler.SubmitRankingVotes,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}}, "", body)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	updated, err := s.voteRepo.GetAssignmentByParticipant(e.ID.String(), p.ID.String())
	require.NoError(t, err)
	assert.False(t, updated.IsCompleted, "a partial vote must not mark the assignment completed")
}

func TestSubmitRankingVotes_RejectsAlreadyCompletedAssignment(t *testing.T) {
	s := newTestHandlerSet()
	e, p, assignment, attachments := setupVotingScenario(t, s)
	assignment.MarkCompleted()
	s.voteRepo.assignments[assignment.ID.String()] = assignment

	body := map[string]interface{}{
		"assignment_id": assignment.ID.String(),
		"rankings": []map[string]interface{}{
			{"attachment_id": attachments[0].ID.String(), "rank": 1},
			{"attachment_id": attachments[1].ID.String(), "rank": 2},
		},
	}
	w := performRequest(t, http.MethodPost, s.handler.SubmitRankingVotes,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}}, "", body)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Equal(t, "VOTES_ALREADY_SUBMITTED", jsonBody(t, w)["code"])
}

func TestSubmitRankingVotes_RejectsDuplicateRanks(t *testing.T) {
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
}

func TestSubmitRankingVotes_RejectsNonConsecutiveRanks(t *testing.T) {
	s := newTestHandlerSet()
	e, p, assignment, attachments := setupVotingScenario(t, s)

	body := map[string]interface{}{
		"assignment_id": assignment.ID.String(),
		"rankings": []map[string]interface{}{
			{"attachment_id": attachments[0].ID.String(), "rank": 1},
			{"attachment_id": attachments[1].ID.String(), "rank": 3}, // skips 2
		},
	}
	w := performRequest(t, http.MethodPost, s.handler.SubmitRankingVotes,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}}, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestSubmitRankingVotes_RejectsAttachmentNotInAssignment(t *testing.T) {
	s := newTestHandlerSet()
	e, p, assignment, _ := setupVotingScenario(t, s)
	foreignAttachment := attachment.NewAttachment(e.ID, uuid.New(), "x.jpg", "x.jpg", "/tmp/x.jpg", "image/jpeg", 10)
	s.attachmentRepo.addAttachment(foreignAttachment)

	body := map[string]interface{}{
		"assignment_id": assignment.ID.String(),
		"rankings": []map[string]interface{}{
			{"attachment_id": foreignAttachment.ID.String(), "rank": 1},
		},
	}
	w := performRequest(t, http.MethodPost, s.handler.SubmitRankingVotes,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}}, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestSubmitRankingVotes_RejectsMismatchedAssignmentID(t *testing.T) {
	s := newTestHandlerSet()
	e, p, _, attachments := setupVotingScenario(t, s)

	body := map[string]interface{}{
		"assignment_id": uuid.New().String(), // does not match participant's real assignment
		"rankings": []map[string]interface{}{
			{"attachment_id": attachments[0].ID.String(), "rank": 1},
		},
	}
	w := performRequest(t, http.MethodPost, s.handler.SubmitRankingVotes,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}}, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// ---------------------------------------------------------------------------
// GetDistributedResults — the endpoint discussed earlier: does it require
// every participant to have voted before results can be calculated? (No.)
// ---------------------------------------------------------------------------

func TestGetDistributedResults_SucceedsWithPartialVoting(t *testing.T) {
	s := newTestHandlerSet()
	e := newVotingEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, 3)
	attachments := addAttachments(s, e.ID, users)
	s.configRepo.byEvent[e.ID.String()] = &vote.VotingConfiguration{
		ID: uuid.New(), EventID: e.ID, AttachmentsPerEvaluator: 2,
		QualityGoodThreshold: 0.6, QualityBadThreshold: 0.3, AdjustmentMagnitude: 3, MinEvaluationsPerFile: 1,
	}

	// Only users[0] voted; users[1] and users[2] never submitted anything.
	s.voteRepo.votes = append(s.voteRepo.votes, &vote.Vote{
		ID: uuid.New(), EventID: e.ID, VoterID: users[0].ID,
		AttachmentID: attachments[1].ID, RankPosition: 1,
	})
	incomplete1 := vote.NewAssignment(e.ID, users[1].ID, []uuid.UUID{attachments[0].ID})
	incomplete2 := vote.NewAssignment(e.ID, users[2].ID, []uuid.UUID{attachments[2].ID})
	complete := vote.NewAssignment(e.ID, users[0].ID, []uuid.UUID{attachments[1].ID})
	complete.MarkCompleted()
	s.voteRepo.assignments[incomplete1.ID.String()] = incomplete1
	s.voteRepo.assignments[incomplete2.ID.String()] = incomplete2
	s.voteRepo.assignments[complete.ID.String()] = complete

	w := performRequest(t, http.MethodGet, s.handler.GetDistributedResults,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String(),
		"results must be computable even when some participants never voted")

	resp := jsonBody(t, w)
	data := resp["data"].(map[string]interface{})
	assert.NotEmpty(t, data["global_ranking"])
}

func TestGetDistributedResults_RejectsWrongStage(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent()
	s.eventRepo.addEvent(e)

	w := performRequest(t, http.MethodGet, s.handler.GetDistributedResults,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestGetDistributedResults_RejectsMissingConfig(t *testing.T) {
	s := newTestHandlerSet()
	e := newVotingEvent()
	s.eventRepo.addEvent(e)

	w := performRequest(t, http.MethodGet, s.handler.GetDistributedResults,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// ---------------------------------------------------------------------------
// GetVotingStatistics
// ---------------------------------------------------------------------------

func TestGetVotingStatistics_ReportsCompletionRateAndNonVoters(t *testing.T) {
	s := newTestHandlerSet()
	e := newVotingEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, 2)

	completed := vote.NewAssignment(e.ID, users[0].ID, []uuid.UUID{uuid.New()})
	completed.MarkCompleted()
	notCompleted := vote.NewAssignment(e.ID, users[1].ID, []uuid.UUID{uuid.New()})
	s.voteRepo.assignments[completed.ID.String()] = completed
	s.voteRepo.assignments[notCompleted.ID.String()] = notCompleted

	w := performRequest(t, http.MethodGet, s.handler.GetVotingStatistics,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	data := jsonBody(t, w)["data"].(map[string]interface{})
	assert.InDelta(t, 0.5, data["completion_rate"], 1e-9)

	status := data["participant_voting_status"].(map[string]interface{})
	assert.Equal(t, true, status[users[0].ID.String()])
	assert.Equal(t, false, status[users[1].ID.String()])
}

// ---------------------------------------------------------------------------
// GetVotingConfiguration / UpdateVotingConfiguration / DeleteVotingConfiguration
// ---------------------------------------------------------------------------

func TestGetVotingConfiguration_NotFound(t *testing.T) {
	s := newTestHandlerSet()
	w := performRequest(t, http.MethodGet, s.handler.GetVotingConfiguration,
		gin.Params{{Key: "event_id", Value: uuid.New().String()}}, "", nil)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, "CONFIG_NOT_FOUND", jsonBody(t, w)["code"])
}

func TestUpdateVotingConfiguration_RejectsWhenAssignmentsExist(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent()
	s.eventRepo.addEvent(e)
	s.configRepo.byEvent[e.ID.String()] = vote.NewVotingConfiguration(e.ID, 2)
	existingAssignment := vote.NewAssignment(e.ID, uuid.New(), []uuid.UUID{uuid.New()})
	s.voteRepo.assignments[existingAssignment.ID.String()] = existingAssignment

	body := map[string]interface{}{"attachments_per_evaluator": 3, "min_evaluations_per_file": 1, "adjustment_magnitude": 3}
	w := performRequest(t, http.MethodPut, s.handler.UpdateVotingConfiguration,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "ASSIGNMENTS_EXIST", jsonBody(t, w)["code"])
}

func TestDeleteVotingConfiguration_RejectsWhenAssignmentsExist(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent()
	s.eventRepo.addEvent(e)
	s.configRepo.byEvent[e.ID.String()] = vote.NewVotingConfiguration(e.ID, 2)
	existingAssignment := vote.NewAssignment(e.ID, uuid.New(), []uuid.UUID{uuid.New()})
	s.voteRepo.assignments[existingAssignment.ID.String()] = existingAssignment

	w := performRequest(t, http.MethodDelete, s.handler.DeleteVotingConfiguration,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "ASSIGNMENTS_EXIST", jsonBody(t, w)["code"])
}

func TestDeleteVotingConfiguration_Success(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent()
	s.eventRepo.addEvent(e)
	s.configRepo.byEvent[e.ID.String()] = vote.NewVotingConfiguration(e.ID, 2)

	w := performRequest(t, http.MethodDelete, s.handler.DeleteVotingConfiguration,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	assert.Equal(t, http.StatusOK, w.Code, w.Body.String())
	_, err := s.configRepo.GetByEventID(e.ID.String())
	assert.Error(t, err, "config should have been deleted")
}

// ---------------------------------------------------------------------------
// PreviewVotingConfiguration
// ---------------------------------------------------------------------------

func TestPreviewVotingConfiguration_Success(t *testing.T) {
	s := newTestHandlerSet()
	eventID := uuid.New()
	users := addParticipants(s, eventID, 3)
	_ = users
	s.eventRepo.addEvent(&event.Event{ID: eventID, Stage: event.StageParticipation})
	addAttachments(s, eventID, users)

	body := map[string]interface{}{"attachments_per_evaluator": 2, "min_evaluations_per_file": 1, "adjustment_magnitude": 3}
	w := performRequest(t, http.MethodPost, s.handler.PreviewVotingConfiguration,
		gin.Params{{Key: "event_id", Value: eventID.String()}}, "", body)

	assert.Equal(t, http.StatusOK, w.Code, w.Body.String())
}

// TestPreviewVotingConfiguration_NoAttachments_DoesNotDivideByZero is a
// regression test for a bug found while writing this suite:
// PreviewVotingConfiguration used to compute
// avgEvaluationsPerFile = maxPossibleAssignments / len(attachments) with no
// guard for len(attachments) == 0. Go float division by zero doesn't panic
// (it yields +Inf), but json.Marshal cannot encode +Inf/NaN, so the response
// body silently failed to serialize while still reporting 200.
//
// The handler now guards len(attachments) == 0 and reports 0 for the
// affected metrics instead of dividing.
func TestPreviewVotingConfiguration_NoAttachments_DoesNotDivideByZero(t *testing.T) {
	s := newTestHandlerSet()
	eventID := uuid.New()
	// No attachments registered for this event at all.

	body := map[string]interface{}{"attachments_per_evaluator": 2, "min_evaluations_per_file": 1, "adjustment_magnitude": 3}
	w := performRequest(t, http.MethodPost, s.handler.PreviewVotingConfiguration,
		gin.Params{{Key: "event_id", Value: eventID.String()}}, "", body)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	resp := jsonBody(t, w) // fails the test if the body isn't valid JSON
	metrics := resp["calculated_metrics"].(map[string]interface{})
	assert.Equal(t, 0.0, metrics["avg_evaluations_per_file"])
	assert.Equal(t, 0.0, metrics["evaluation_coverage_ratio"])
}

// TestPreviewVotingConfiguration_AppliesSameDefaultsAsCreate is a regression
// test for the inconsistency found alongside the division-by-zero bug:
// PreviewVotingConfiguration only defaulted quality thresholds, never
// AdjustmentMagnitude/MinEvaluationsPerFile, unlike CreateVotingConfiguration.
// A preview response could show min_evaluations_per_file=0 while the eventual
// Create call would save it as 3 - a preview that didn't reflect reality.
func TestPreviewVotingConfiguration_AppliesSameDefaultsAsCreate(t *testing.T) {
	s := newTestHandlerSet()
	eventID := uuid.New()
	users := addParticipants(s, eventID, 3)
	s.eventRepo.addEvent(&event.Event{ID: eventID, Stage: event.StageParticipation})
	addAttachments(s, eventID, users)

	// Omit adjustment_magnitude and min_evaluations_per_file.
	body := map[string]interface{}{"attachments_per_evaluator": 2}
	w := performRequest(t, http.MethodPost, s.handler.PreviewVotingConfiguration,
		gin.Params{{Key: "event_id", Value: eventID.String()}}, "", body)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	configuration := resp["configuration"].(map[string]interface{})
	assert.Equal(t, 3.0, configuration["adjustment_magnitude"])
	assert.Equal(t, 3.0, configuration["min_evaluations_per_file"])
}
