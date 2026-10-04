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
	"github.com/gravadigital/telescopio-api/internal/config"
	"github.com/gravadigital/telescopio-api/internal/domain/attachment"
	"github.com/gravadigital/telescopio-api/internal/domain/event"
	"github.com/gravadigital/telescopio-api/internal/domain/participant"
	"github.com/gravadigital/telescopio-api/internal/domain/vote"
	"github.com/gravadigital/telescopio-api/internal/middleware/auth"
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
		a := attachment.NewAttachment(eventID, owner.ID, "f.jpg", "photo.jpg", "/tmp/f.jpg", "image/jpeg", 1024, "")
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

func TestCreateVotingConfiguration_RejectsFewerThanThreeProposals(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, 5)
	addAttachments(s, e.ID, users[:2]) // 5 inscribed, only 2 proposals

	w := performRequest(t, http.MethodPost, s.handler.CreateVotingConfiguration,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "",
		map[string]interface{}{"attachments_per_evaluator": 2})

	assert.Equal(t, http.StatusBadRequest, w.Code)
	resp := jsonBody(t, w)
	assert.Equal(t, "INSUFFICIENT_ATTACHMENTS", resp["code"])
	assert.Equal(t, float64(2), resp["current_count"])
	assert.Equal(t, float64(3), resp["required_minimum"])
}

func TestCreateVotingConfiguration_DefaultMinEvaluationsIsMinOfThreeAndM(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, 4)
	addAttachments(s, e.ID, users[:3])

	w := performRequest(t, http.MethodPost, s.handler.CreateVotingConfiguration,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "",
		map[string]interface{}{"attachments_per_evaluator": 2})

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	data := jsonBody(t, w)["data"].(map[string]interface{})
	assert.Equal(t, float64(2), data["attachments_per_evaluator"])
	assert.Equal(t, float64(2), data["min_evaluations_per_file"])
	assert.Equal(t, 0.6, data["quality_good_threshold"])
	assert.Equal(t, 0.3, data["quality_bad_threshold"])
	assert.Equal(t, float64(3), data["adjustment_magnitude"])
}

func TestCreateVotingConfiguration_RejectsCloseThresholdsWith400(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, 3)
	addAttachments(s, e.ID, users)

	w := performRequest(t, http.MethodPost, s.handler.CreateVotingConfiguration,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "",
		map[string]interface{}{"attachments_per_evaluator": 2, "quality_good_threshold": 0.65, "quality_bad_threshold": 0.6})

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_THRESHOLDS", jsonBody(t, w)["code"])
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

func TestGenerateAssignmentsHandler_OnlyParticipantsWithProposalEvaluate(t *testing.T) {
	s := newTestHandlerSet()
	e := newVotingEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, 5)
	addAttachments(s, e.ID, users[:3]) // 5 inscribed, 3 proposals
	s.configRepo.byEvent[e.ID.String()] = &vote.VotingConfiguration{
		ID: uuid.New(), EventID: e.ID, AttachmentsPerEvaluator: 2,
		QualityGoodThreshold: 0.6, QualityBadThreshold: 0.3,
		AdjustmentMagnitude: 3, MinEvaluationsPerFile: 2,
	}

	w := performRequest(t, http.MethodPost, s.handler.GenerateAssignments,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Equal(t, "ASSIGNMENTS_GENERATED", resp["code"])
	data := resp["data"].(map[string]interface{})
	assert.Equal(t, float64(3), data["assignments_count"])
	assert.Equal(t, float64(3), data["total_participants"])
	assert.Equal(t, float64(3), data["total_attachments"])
	assert.Equal(t, float64(6), data["total_evaluations"])
	assert.Equal(t, float64(2), data["attachments_per_evaluator"])

	saved, err := s.voteRepo.GetAssignmentsByEventID(e.ID.String())
	require.NoError(t, err)
	withProposal := map[uuid.UUID]bool{}
	for _, u := range users[:3] {
		withProposal[u.ID] = true
	}
	for _, a := range saved {
		assert.True(t, withProposal[a.ParticipantID], "assignment for a participant without proposal")
	}
}

func TestGenerateAssignmentsHandler_RejectsFewerThanThreeProposals(t *testing.T) {
	s := newTestHandlerSet()
	e := newVotingEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, 5)
	addAttachments(s, e.ID, users[:2])
	s.configRepo.byEvent[e.ID.String()] = &vote.VotingConfiguration{
		ID: uuid.New(), EventID: e.ID, AttachmentsPerEvaluator: 1,
		QualityGoodThreshold: 0.6, QualityBadThreshold: 0.3,
		AdjustmentMagnitude: 3, MinEvaluationsPerFile: 1,
	}

	w := performRequest(t, http.MethodPost, s.handler.GenerateAssignments,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	resp := jsonBody(t, w)
	assert.Equal(t, "INSUFFICIENT_ATTACHMENTS", resp["code"])
	assert.Equal(t, float64(2), resp["current_count"])
	assert.Equal(t, float64(3), resp["required_minimum"])
}

// ---------------------------------------------------------------------------
// GetParticipantAssignment
// ---------------------------------------------------------------------------

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
	assert.Equal(t, "participation", jsonBody(t, w)["current_stage"])
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
	foreignAttachment := attachment.NewAttachment(e.ID, uuid.New(), "x.jpg", "x.jpg", "/tmp/x.jpg", "image/jpeg", 10, "")
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
// GetStoredResults — public read-only view: never recalculates, only serves
// what CalculateAndPersistResults stored when the event entered results.
// ---------------------------------------------------------------------------

func newResultsEvent() *event.Event {
	e := event.NewEvent("Test Event", "desc", uuid.New(), time.Now(), time.Now().Add(48*time.Hour), "org")
	e.Stage = event.StageResult
	return e
}

func TestGetStoredResults_ReturnsStoredRankingWithoutRecalculating(t *testing.T) {
	s := newTestHandlerSet()
	e := newResultsEvent()
	s.eventRepo.addEvent(e)
	s.resultsRepo.byEvent[e.ID.String()] = &vote.VotingResults{
		ID:                uuid.New(),
		EventID:           e.ID,
		GlobalRanking:     vote.AttachmentResultSlice{{AttachmentID: uuid.New(), Filename: "winner.pdf", MBCScore: 1}},
		AdjustedRanking:   vote.AttachmentResultSlice{{AttachmentID: uuid.New(), Filename: "winner.pdf", MBCScore: 1}},
		TotalParticipants: 3,
		TotalVotes:        3,
	}
	// No voting config and no votes on purpose: a read must succeed with just
	// the stored row.

	w := performRequest(t, http.MethodGet, s.handler.GetStoredResults,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	data := resp["data"].(map[string]interface{})
	ranking := data["global_ranking"].([]interface{})
	require.Len(t, ranking, 1)
	assert.Equal(t, "winner.pdf", ranking[0].(map[string]interface{})["filename"])
}

func TestGetStoredResults_NotCalculatedYetReturns404(t *testing.T) {
	s := newTestHandlerSet()
	e := newResultsEvent()
	s.eventRepo.addEvent(e)

	w := performRequest(t, http.MethodGet, s.handler.GetStoredResults,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, "RESULTS_NOT_CALCULATED", jsonBody(t, w)["error"])
}

func TestGetStoredResults_RejectsWrongStage(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent()
	s.eventRepo.addEvent(e)

	w := performRequest(t, http.MethodGet, s.handler.GetStoredResults,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

// ---------------------------------------------------------------------------
// CalculateAndPersistResults — called when the organizer moves the event into
// the results stage, so the read-only endpoint has a row to serve.
// ---------------------------------------------------------------------------

func TestCalculateAndPersistResults_StoresRankingForVisitors(t *testing.T) {
	s := newTestHandlerSet()
	e := newVotingEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, 3)
	attachments := addAttachments(s, e.ID, users)
	s.configRepo.byEvent[e.ID.String()] = &vote.VotingConfiguration{
		ID: uuid.New(), EventID: e.ID, AttachmentsPerEvaluator: 2,
		QualityGoodThreshold: 0.6, QualityBadThreshold: 0.3, AdjustmentMagnitude: 3, MinEvaluationsPerFile: 1,
	}
	s.voteRepo.votes = append(s.voteRepo.votes, &vote.Vote{
		ID: uuid.New(), EventID: e.ID, VoterID: users[0].ID,
		AttachmentID: attachments[1].ID, RankPosition: 1,
	})

	require.NoError(t, s.handler.CalculateAndPersistResults(e.ID.String()),
		"stage change must leave a stored ranking behind")

	stored, err := s.resultsRepo.GetByEventID(e.ID.String())
	require.NoError(t, err)
	require.NotNil(t, stored)
	require.Len(t, stored.GlobalRanking, len(attachments))
	for _, item := range stored.GlobalRanking {
		assert.NotEmpty(t, item.ParticipantName, "names must be persisted so the read-only endpoint can show authors")
	}
}

func TestCalculateAndPersistResults_RejectsUnknownEvent(t *testing.T) {
	s := newTestHandlerSet()

	assert.Error(t, s.handler.CalculateAndPersistResults(uuid.NewString()))
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

func previewFor(t *testing.T, inscribed, proposals int) map[string]interface{} {
	t.Helper()
	s := newTestHandlerSet()
	e := newParticipationEvent()
	s.eventRepo.addEvent(e)
	users := addParticipants(s, e.ID, inscribed)
	addAttachments(s, e.ID, users[:proposals])

	w := performRequest(t, http.MethodGet, s.handler.PreviewVotingConfiguration,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	return jsonBody(t, w)["data"].(map[string]interface{})
}

func TestPreviewVotingConfiguration_Success(t *testing.T) {
	data := previewFor(t, 4, 3)

	assert.Equal(t, float64(4), data["participants_count"])
	assert.Equal(t, float64(3), data["participants_with_proposal"])
	assert.Equal(t, true, data["can_open_voting"])
	assert.Equal(t, float64(2), data["min_m"])
	assert.Equal(t, float64(2), data["max_m"])
	assert.Equal(t, float64(2), data["recommended_m"])
	assert.Equal(t, map[string]interface{}{
		"quality_good_threshold": 0.6,
		"quality_bad_threshold":  0.3,
		"adjustment_magnitude":   float64(3),
	}, data["defaults"])
}

func TestPreviewVotingConfiguration_TenProposals(t *testing.T) {
	data := previewFor(t, 12, 10)

	assert.Equal(t, float64(12), data["participants_count"])
	assert.Equal(t, float64(10), data["participants_with_proposal"])
	assert.Equal(t, true, data["can_open_voting"])
	assert.Equal(t, float64(6), data["min_m"])
	assert.Equal(t, float64(9), data["max_m"])
	assert.Equal(t, float64(7), data["recommended_m"])
}

func TestPreviewVotingConfiguration_TwoProposalsCannotOpen(t *testing.T) {
	data := previewFor(t, 5, 2)

	assert.Equal(t, false, data["can_open_voting"])
	assert.Equal(t, float64(1), data["min_m"])
	assert.Equal(t, float64(1), data["max_m"])
	assert.Equal(t, float64(1), data["recommended_m"])
}

func TestPreviewVotingConfiguration_NoProposalsClampsToZero(t *testing.T) {
	data := previewFor(t, 3, 0)

	assert.Equal(t, float64(3), data["participants_count"])
	assert.Equal(t, float64(0), data["participants_with_proposal"])
	assert.Equal(t, false, data["can_open_voting"])
	assert.Equal(t, float64(0), data["min_m"])
	assert.Equal(t, float64(0), data["max_m"])
	assert.Equal(t, float64(0), data["recommended_m"])
}

func TestPreviewVotingConfiguration_RejectsInvalidAndUnknownEventID(t *testing.T) {
	s := newTestHandlerSet()

	w := performRequest(t, http.MethodGet, s.handler.PreviewVotingConfiguration,
		gin.Params{{Key: "event_id", Value: "not-a-uuid"}}, "", nil)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_EVENT_ID", jsonBody(t, w)["code"])

	w = performRequest(t, http.MethodGet, s.handler.PreviewVotingConfiguration,
		gin.Params{{Key: "event_id", Value: uuid.NewString()}}, "", nil)
	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, "EVENT_NOT_FOUND", jsonBody(t, w)["code"])
}

// The route is protected by RequireEventOwner: only the author (or an admin)
// reaches the handler.
func TestPreviewVotingConfiguration_OnlyTheAuthorCanSeeIt(t *testing.T) {
	s := newTestHandlerSet()
	e := newParticipationEvent()
	s.eventRepo.addEvent(e)

	serve := func(userID uuid.UUID, role participant.Role) *httptest.ResponseRecorder {
		router := gin.New()
		router.GET("/events/:event_id/voting-config/preview",
			func(c *gin.Context) {
				c.Set("user_id", userID.String())
				c.Set("user_role", role)
			},
			auth.RequireEventOwner(s.eventRepo),
			s.handler.PreviewVotingConfiguration)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/events/"+e.ID.String()+"/voting-config/preview", nil))
		return w
	}

	w := serve(uuid.New(), participant.RoleParticipant)
	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Equal(t, "FORBIDDEN", jsonBody(t, w)["error"])

	w = serve(e.AuthorID, participant.RoleOrganizer)
	assert.Equal(t, http.StatusOK, w.Code, w.Body.String())
}

// ---------------------------------------------------------------------------
// S-007: anonymous assignment, ranking replacement
// ---------------------------------------------------------------------------

// anonymityScenario builds event E with proposals A1 (P1), A2 (P2), A3 (P3), a participant P4
// without proposal, and the assignment X1 of P1 = [A2, A3].
type anonymityScenario struct {
	e          *event.Event
	p          []*participant.User // P1..P4
	a          []*attachment.Attachment
	assignment *vote.Assignment
}

func setupAnonymityScenario(s *testHandlerSet, e *event.Event) anonymityScenario {
	s.eventRepo.addEvent(e)
	e.Name = "Convocatoria 2026"
	users := addParticipants(s, e.ID, 4)
	mk := func(owner *participant.User, name, mime string, size int64, desc, key string) *attachment.Attachment {
		att := attachment.NewAttachment(e.ID, owner.ID, owner.ID.String()+"_file", name, key, mime, size, desc)
		s.attachmentRepo.addAttachment(att)
		return att
	}
	atts := []*attachment.Attachment{
		mk(users[0], "informe-garcia.pdf", "application/pdf", 2048, "Observación de Júpiter", "key-a1"),
		mk(users[1], "juan-perez.png", "image/png", 4096, "", "key-a2"),
		mk(users[2], "notas.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 8192, "Notas de campo", "key-a3"),
	}
	assignment := vote.NewAssignment(e.ID, users[0].ID, []uuid.UUID{atts[1].ID, atts[2].ID})
	s.voteRepo.assignments[assignment.ID.String()] = assignment
	return anonymityScenario{e: e, p: users, a: atts, assignment: assignment}
}

func assignmentParams(e *event.Event, p *participant.User) gin.Params {
	return gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}}
}

func TestGetParticipantAssignment_ReturnsAnonymousPayload(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newVotingEvent())

	w := performRequest(t, http.MethodGet, s.handler.GetParticipantAssignment, assignmentParams(sc.e, sc.p[0]), "", nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Equal(t, "Convocatoria 2026", resp["event_name"])
	assert.Equal(t, sc.p[0].ID.String(), resp["participant_id"])

	a := resp["assignment"].(map[string]interface{})
	assert.ElementsMatch(t, []string{"id", "event_id", "is_completed", "completed_at", "attachments"}, keys(a))
	assert.Equal(t, sc.assignment.ID.String(), a["id"])
	assert.Equal(t, false, a["is_completed"])
	assert.Nil(t, a["completed_at"])

	items := a["attachments"].([]interface{})
	require.Len(t, items, 2)
	first := items[0].(map[string]interface{})
	second := items[1].(map[string]interface{})
	for _, it := range items {
		assert.ElementsMatch(t, []string{"id", "label", "mime_type", "file_size", "description"}, keys(it.(map[string]interface{})))
	}
	assert.Equal(t, sc.a[1].ID.String(), first["id"])
	assert.Equal(t, "Propuesta 1", first["label"])
	assert.Equal(t, "image/png", first["mime_type"])
	assert.Equal(t, float64(4096), first["file_size"])
	assert.Nil(t, first["description"])
	assert.Equal(t, "Propuesta 2", second["label"])
	assert.Equal(t, "Notas de campo", second["description"])

	body := w.Body.String()
	for _, leaked := range []string{
		"juan-perez.png", "notas.docx", sc.p[1].ID.String(), sc.p[2].ID.String(),
		"original_name", "filename", "file_path", "attachment_ids", "quality_score",
		"expertise_match_score", "conflict_of_interest", "vote_count",
	} {
		assert.NotContains(t, body, leaked)
	}
}

func keys(m map[string]interface{}) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	return out
}

func TestGetParticipantAssignment_AvailableInResults(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newResultsEvent())
	completedAt := time.Date(2026, 10, 10, 12, 0, 0, 0, time.UTC)
	sc.assignment.IsCompleted = true
	sc.assignment.CompletedAt = &completedAt

	w := performRequest(t, http.MethodGet, s.handler.GetParticipantAssignment, assignmentParams(sc.e, sc.p[0]), "", nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	a := jsonBody(t, w)["assignment"].(map[string]interface{})
	assert.Equal(t, true, a["is_completed"])
	assert.Equal(t, "2026-10-10T12:00:00Z", a["completed_at"])
	assert.Len(t, a["attachments"], 2)
}

func TestGetParticipantAssignment_NoAssignment(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newVotingEvent())

	w := performRequest(t, http.MethodGet, s.handler.GetParticipantAssignment, assignmentParams(sc.e, sc.p[3]), "", nil)

	require.Equal(t, http.StatusNotFound, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Equal(t, "NO_ASSIGNMENT", resp["code"])
	assert.Equal(t, "Participant has no assignment in this event", resp["error"])
}

func TestGetParticipantAssignment_DatabaseErrorIsNotNoAssignment(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newVotingEvent())
	s.voteRepo.getAssignmentByPartErr = errors.New("db down")

	w := performRequest(t, http.MethodGet, s.handler.GetParticipantAssignment, assignmentParams(sc.e, sc.p[0]), "", nil)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Equal(t, "RETRIEVAL_ERROR", jsonBody(t, w)["code"])
}

func TestGetParticipantAssignment_AssignedAttachmentMissingFromEvent(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newVotingEvent())
	sc.assignment.AttachmentIDs = append(sc.assignment.AttachmentIDs, uuid.NewString())

	w := performRequest(t, http.MethodGet, s.handler.GetParticipantAssignment, assignmentParams(sc.e, sc.p[0]), "", nil)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Equal(t, "RETRIEVAL_ERROR", jsonBody(t, w)["code"])
}

func submitBody(assignment *vote.Assignment, ranks ...[2]interface{}) map[string]interface{} {
	rankings := make([]map[string]interface{}, len(ranks))
	for i, r := range ranks {
		rankings[i] = map[string]interface{}{"attachment_id": r[0].(uuid.UUID).String(), "rank": r[1]}
	}
	return map[string]interface{}{"assignment_id": assignment.ID.String(), "rankings": rankings}
}

func votesOf(s *testHandlerSet, assignmentID uuid.UUID) map[uuid.UUID]int {
	out := map[uuid.UUID]int{}
	for _, v := range s.voteRepo.votes {
		if v.AssignmentID == assignmentID {
			out[v.AttachmentID] = v.RankPosition
		}
	}
	return out
}

func TestSubmitRankingVotes_FirstSubmissionIsNotAReplacement(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newVotingEvent())
	body := submitBody(sc.assignment, [2]interface{}{sc.a[1].ID, 1}, [2]interface{}{sc.a[2].ID, 2})

	w := performRequest(t, http.MethodPost, s.handler.SubmitRankingVotes, assignmentParams(sc.e, sc.p[0]), "", body)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Equal(t, "Ranking votes submitted successfully", resp["message"])
	assert.Equal(t, sc.e.ID.String(), resp["event_id"])
	assert.Equal(t, sc.p[0].ID.String(), resp["participant_id"])
	assert.Equal(t, float64(2), resp["votes_count"])
	assert.Equal(t, false, resp["replaced"])

	require.Len(t, s.voteRepo.replaceCalls, 1)
	call := s.voteRepo.replaceCalls[0]
	assert.Equal(t, sc.assignment.ID.String(), call.assignmentID)
	require.Len(t, call.votes, 2)
	for _, v := range call.votes {
		assert.Equal(t, sc.assignment.ID, v.AssignmentID)
		assert.Equal(t, sc.p[0].ID, v.VoterID)
		assert.Equal(t, sc.e.ID, v.EventID)
	}
}

func TestSubmitRankingVotes_ReplacesCompletedRanking(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newVotingEvent())
	for i, att := range sc.a[1:] {
		v := vote.NewVote(sc.e.ID, sc.p[0].ID, att.ID, i+1)
		v.AssignmentID = sc.assignment.ID
		s.voteRepo.votes = append(s.voteRepo.votes, v)
	}
	sc.assignment.MarkCompleted()
	body := submitBody(sc.assignment, [2]interface{}{sc.a[2].ID, 1}, [2]interface{}{sc.a[1].ID, 2})

	w := performRequest(t, http.MethodPost, s.handler.SubmitRankingVotes, assignmentParams(sc.e, sc.p[0]), "", body)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Equal(t, true, resp["replaced"])
	assert.Equal(t, float64(2), resp["votes_count"])
	assert.Equal(t, map[uuid.UUID]int{sc.a[2].ID: 1, sc.a[1].ID: 2}, votesOf(s, sc.assignment.ID))
	assert.True(t, sc.assignment.IsCompleted)
}

func TestSubmitRankingVotes_ReplacesAfterPartialSubmission(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newVotingEvent())
	prev := vote.NewVote(sc.e.ID, sc.p[0].ID, sc.a[1].ID, 1)
	prev.AssignmentID = sc.assignment.ID
	s.voteRepo.votes = append(s.voteRepo.votes, prev)
	body := submitBody(sc.assignment, [2]interface{}{sc.a[1].ID, 1}, [2]interface{}{sc.a[2].ID, 2})

	w := performRequest(t, http.MethodPost, s.handler.SubmitRankingVotes, assignmentParams(sc.e, sc.p[0]), "", body)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	assert.Equal(t, true, jsonBody(t, w)["replaced"])
	assert.Len(t, votesOf(s, sc.assignment.ID), 2, "no duplicated vote for the first proposal")
}

func TestSubmitRankingVotes_RejectsOutsideVoting(t *testing.T) {
	for _, tc := range []struct {
		name  string
		e     *event.Event
		stage string
	}{
		{"results", newResultsEvent(), "results"},
		{"participation", newParticipationEvent(), "participation"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			s := newTestHandlerSet()
			sc := setupAnonymityScenario(s, tc.e)
			body := submitBody(sc.assignment, [2]interface{}{sc.a[2].ID, 1}, [2]interface{}{sc.a[1].ID, 2})

			w := performRequest(t, http.MethodPost, s.handler.SubmitRankingVotes, assignmentParams(sc.e, sc.p[0]), "", body)

			require.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
			resp := jsonBody(t, w)
			assert.Equal(t, "Voting is only allowed during voting stage", resp["error"])
			assert.Equal(t, tc.stage, resp["current_stage"])
			assert.Empty(t, s.voteRepo.replaceCalls)
			assert.Empty(t, s.voteRepo.votes)
		})
	}
}

func TestSubmitRankingVotes_ReturnsErrorWhenSaveFails(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newVotingEvent())
	s.voteRepo.replaceVotesErr = errors.New("insert vote")
	body := submitBody(sc.assignment, [2]interface{}{sc.a[1].ID, 1}, [2]interface{}{sc.a[2].ID, 2})

	w := performRequest(t, http.MethodPost, s.handler.SubmitRankingVotes, assignmentParams(sc.e, sc.p[0]), "", body)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Equal(t, "Failed to save votes", jsonBody(t, w)["error"])
	assert.Empty(t, s.voteRepo.votes)
}

func TestSubmitRankingVotes_RejectsUnassignedAttachment(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newVotingEvent())
	body := submitBody(sc.assignment, [2]interface{}{sc.a[0].ID, 1}, [2]interface{}{sc.a[1].ID, 2})

	w := performRequest(t, http.MethodPost, s.handler.SubmitRankingVotes, assignmentParams(sc.e, sc.p[0]), "", body)

	require.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "Attachment is not assigned to this participant: "+sc.a[0].ID.String(), jsonBody(t, w)["error"])
	assert.Empty(t, s.voteRepo.replaceCalls)
}

func TestSubmitRankingVotes_RejectsMalformedPathIDs(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newVotingEvent())
	body := submitBody(sc.assignment, [2]interface{}{sc.a[1].ID, 1})

	w := performRequest(t, http.MethodPost, s.handler.SubmitRankingVotes,
		gin.Params{{Key: "event_id", Value: sc.e.ID.String()}, {Key: "participant_id", Value: "not-a-uuid"}}, "", body)

	assert.Contains(t, []int{http.StatusBadRequest, http.StatusForbidden}, w.Code, "must not panic")
}
