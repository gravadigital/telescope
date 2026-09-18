package handlers

import (
	"errors"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/domain/vote"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testVoteDraftHandlerSet bundles the mock dependencies a VoteDraftHandler needs.
type testVoteDraftHandlerSet struct {
	draftRepo *mockVoteDraftRepository
	voteRepo  *mockVoteRepository
	handler   *VoteDraftHandler
}

func newTestVoteDraftHandlerSet() *testVoteDraftHandlerSet {
	s := &testVoteDraftHandlerSet{
		draftRepo: newMockVoteDraftRepository(),
		voteRepo:  newMockVoteRepository(),
	}
	s.handler = NewVoteDraftHandler(s.draftRepo, s.voteRepo)
	return s
}

// ---------------------------------------------------------------------------
// SaveDraft
// ---------------------------------------------------------------------------

func TestSaveDraft_Success(t *testing.T) {
	s := newTestVoteDraftHandlerSet()
	eventID := uuid.New()
	participantID := uuid.New()
	assignment := vote.NewAssignment(eventID, participantID, []uuid.UUID{uuid.New(), uuid.New()})
	s.voteRepo.assignments[assignment.ID.String()] = assignment

	body := map[string]interface{}{
		"rankings": []map[string]interface{}{
			{"attachment_id": assignment.GetAttachmentUUIDs()[0].String(), "rank": 1},
			{"attachment_id": assignment.GetAttachmentUUIDs()[1].String(), "rank": 2},
		},
	}
	w := performAuthedRequest(t, http.MethodPut, s.handler.SaveDraft,
		gin.Params{{Key: "event_id", Value: eventID.String()}, {Key: "participant_id", Value: participantID.String()}},
		participantID.String(), body)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Equal(t, "DRAFT_SAVED", resp["code"])

	saved, err := s.draftRepo.GetByAssignmentAndParticipant(assignment.ID, participantID)
	require.NoError(t, err)
	assert.Len(t, saved.Rankings, 2)
}

func TestSaveDraft_RejectsUnauthenticated(t *testing.T) {
	s := newTestVoteDraftHandlerSet()
	eventID := uuid.New()
	participantID := uuid.New()

	body := map[string]interface{}{
		"rankings": []map[string]interface{}{{"attachment_id": uuid.New().String(), "rank": 1}},
	}
	w := performAuthedRequest(t, http.MethodPut, s.handler.SaveDraft,
		gin.Params{{Key: "event_id", Value: eventID.String()}, {Key: "participant_id", Value: participantID.String()}},
		"", body) // no authenticated user_id set

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Equal(t, "UNAUTHORIZED", jsonBody(t, w)["code"])
}

func TestSaveDraft_RejectsInvalidEventID(t *testing.T) {
	s := newTestVoteDraftHandlerSet()
	body := map[string]interface{}{
		"rankings": []map[string]interface{}{{"attachment_id": uuid.New().String(), "rank": 1}},
	}
	w := performAuthedRequest(t, http.MethodPut, s.handler.SaveDraft,
		gin.Params{{Key: "event_id", Value: "not-a-uuid"}, {Key: "participant_id", Value: uuid.New().String()}},
		uuid.New().String(), body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_EVENT_ID", jsonBody(t, w)["code"])
}

func TestSaveDraft_RejectsMissingAssignment(t *testing.T) {
	s := newTestVoteDraftHandlerSet()
	eventID := uuid.New()
	participantID := uuid.New()
	// No assignment created for this event/participant pair.

	body := map[string]interface{}{
		"rankings": []map[string]interface{}{{"attachment_id": uuid.New().String(), "rank": 1}},
	}
	w := performAuthedRequest(t, http.MethodPut, s.handler.SaveDraft,
		gin.Params{{Key: "event_id", Value: eventID.String()}, {Key: "participant_id", Value: participantID.String()}},
		participantID.String(), body)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, "ASSIGNMENT_NOT_FOUND", jsonBody(t, w)["code"])
}

func TestSaveDraft_RejectsAlreadyCompletedAssignment(t *testing.T) {
	s := newTestVoteDraftHandlerSet()
	eventID := uuid.New()
	participantID := uuid.New()
	assignment := vote.NewAssignment(eventID, participantID, []uuid.UUID{uuid.New()})
	assignment.MarkCompleted()
	s.voteRepo.assignments[assignment.ID.String()] = assignment

	body := map[string]interface{}{
		"rankings": []map[string]interface{}{{"attachment_id": assignment.GetAttachmentUUIDs()[0].String(), "rank": 1}},
	}
	w := performAuthedRequest(t, http.MethodPut, s.handler.SaveDraft,
		gin.Params{{Key: "event_id", Value: eventID.String()}, {Key: "participant_id", Value: participantID.String()}},
		participantID.String(), body)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Equal(t, "ASSIGNMENT_ALREADY_COMPLETED", jsonBody(t, w)["code"])
}

func TestSaveDraft_RejectsInvalidAttachmentIDInRankings(t *testing.T) {
	s := newTestVoteDraftHandlerSet()
	eventID := uuid.New()
	participantID := uuid.New()
	assignment := vote.NewAssignment(eventID, participantID, []uuid.UUID{uuid.New()})
	s.voteRepo.assignments[assignment.ID.String()] = assignment

	body := map[string]interface{}{
		"rankings": []map[string]interface{}{{"attachment_id": "not-a-uuid", "rank": 1}},
	}
	w := performAuthedRequest(t, http.MethodPut, s.handler.SaveDraft,
		gin.Params{{Key: "event_id", Value: eventID.String()}, {Key: "participant_id", Value: participantID.String()}},
		participantID.String(), body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_ATTACHMENT_ID", jsonBody(t, w)["code"])
}

func TestSaveDraft_OverwritesExistingDraft(t *testing.T) {
	s := newTestVoteDraftHandlerSet()
	eventID := uuid.New()
	participantID := uuid.New()
	attachments := []uuid.UUID{uuid.New(), uuid.New()}
	assignment := vote.NewAssignment(eventID, participantID, attachments)
	s.voteRepo.assignments[assignment.ID.String()] = assignment

	firstBody := map[string]interface{}{
		"rankings": []map[string]interface{}{{"attachment_id": attachments[0].String(), "rank": 1}},
	}
	w1 := performAuthedRequest(t, http.MethodPut, s.handler.SaveDraft,
		gin.Params{{Key: "event_id", Value: eventID.String()}, {Key: "participant_id", Value: participantID.String()}},
		participantID.String(), firstBody)
	require.Equal(t, http.StatusOK, w1.Code, w1.Body.String())

	secondBody := map[string]interface{}{
		"rankings": []map[string]interface{}{
			{"attachment_id": attachments[0].String(), "rank": 2},
			{"attachment_id": attachments[1].String(), "rank": 1},
		},
	}
	w2 := performAuthedRequest(t, http.MethodPut, s.handler.SaveDraft,
		gin.Params{{Key: "event_id", Value: eventID.String()}, {Key: "participant_id", Value: participantID.String()}},
		participantID.String(), secondBody)
	require.Equal(t, http.StatusOK, w2.Code, w2.Body.String())

	saved, err := s.draftRepo.GetByAssignmentAndParticipant(assignment.ID, participantID)
	require.NoError(t, err)
	assert.Len(t, saved.Rankings, 2, "the second save must replace, not append to, the first draft")
}

// ---------------------------------------------------------------------------
// GetDraft
// ---------------------------------------------------------------------------

func TestGetDraft_Success(t *testing.T) {
	s := newTestVoteDraftHandlerSet()
	eventID := uuid.New()
	participantID := uuid.New()
	assignment := vote.NewAssignment(eventID, participantID, []uuid.UUID{uuid.New()})
	s.voteRepo.assignments[assignment.ID.String()] = assignment
	require.NoError(t, s.draftRepo.Upsert(&vote.VoteDraft{
		EventID: eventID, AssignmentID: assignment.ID, ParticipantID: participantID,
		Rankings: vote.DraftRankings{{AttachmentID: uuid.New(), Rank: 1}},
	}))

	w := performRequest(t, http.MethodGet, s.handler.GetDraft,
		gin.Params{{Key: "event_id", Value: eventID.String()}, {Key: "participant_id", Value: participantID.String()}}, "", nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
}

func TestGetDraft_RejectsMissingAssignment(t *testing.T) {
	s := newTestVoteDraftHandlerSet()
	w := performRequest(t, http.MethodGet, s.handler.GetDraft,
		gin.Params{{Key: "event_id", Value: uuid.New().String()}, {Key: "participant_id", Value: uuid.New().String()}}, "", nil)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, "ASSIGNMENT_NOT_FOUND", jsonBody(t, w)["code"])
}

func TestGetDraft_ReturnsNotFoundWhenNoDraftSavedYet(t *testing.T) {
	s := newTestVoteDraftHandlerSet()
	eventID := uuid.New()
	participantID := uuid.New()
	assignment := vote.NewAssignment(eventID, participantID, []uuid.UUID{uuid.New()})
	s.voteRepo.assignments[assignment.ID.String()] = assignment
	// Assignment exists, but no draft was ever saved for it.

	w := performRequest(t, http.MethodGet, s.handler.GetDraft,
		gin.Params{{Key: "event_id", Value: eventID.String()}, {Key: "participant_id", Value: participantID.String()}}, "", nil)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, "DRAFT_NOT_FOUND", jsonBody(t, w)["code"])
}

func TestGetDraft_ReportsGenericErrorDistinctlyFromNotFound(t *testing.T) {
	s := newTestVoteDraftHandlerSet()
	eventID := uuid.New()
	participantID := uuid.New()
	assignment := vote.NewAssignment(eventID, participantID, []uuid.UUID{uuid.New()})
	s.voteRepo.assignments[assignment.ID.String()] = assignment
	s.draftRepo.getErr = errors.New("simulated db failure")

	w := performRequest(t, http.MethodGet, s.handler.GetDraft,
		gin.Params{{Key: "event_id", Value: eventID.String()}, {Key: "participant_id", Value: participantID.String()}}, "", nil)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Equal(t, "DRAFT_GET_ERROR", jsonBody(t, w)["code"])
}
