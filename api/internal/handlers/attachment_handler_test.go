package handlers

import (
	"bytes"
	"errors"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
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
	"github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testAttachmentHandlerSet bundles the mock dependencies an AttachmentHandler needs.
type testAttachmentHandlerSet struct {
	attachmentRepo *mockAttachmentRepository
	eventRepo      *mockEventRepository
	voteRepo       *mockVoteRepository
	userRepo       *mockUserRepository
	fileStorage    *mockFileStorage
	handler        *AttachmentHandler
}

func newTestAttachmentHandlerSet() *testAttachmentHandlerSet {
	s := &testAttachmentHandlerSet{
		attachmentRepo: newMockAttachmentRepository(),
		eventRepo:      newMockEventRepository(),
		voteRepo:       newMockVoteRepository(),
		userRepo:       newMockUserRepository(),
		fileStorage:    newMockFileStorage(),
	}
	cfg := &config.Config{}
	cfg.Upload.MaxFileSize = 10 * 1024 * 1024
	s.handler = NewAttachmentHandler(s.attachmentRepo, s.eventRepo, s.voteRepo, s.userRepo, s.fileStorage, cfg)
	return s
}

// buildMultipartUpload builds a multipart/form-data request with a single
// "file" field, and returns a Gin context ready to hand to the handler.
func buildMultipartUpload(t *testing.T, params gin.Params, filename, contentType string, content []byte) (*httptest.ResponseRecorder, *gin.Context) {
	t.Helper()
	return buildMultipartUploadWithFields(t, params, filename, contentType, content, nil)
}

// buildMultipartUploadWithFields is buildMultipartUpload plus extra plain
// form fields (e.g. "description"), for cases that need more than the file.
func buildMultipartUploadWithFields(t *testing.T, params gin.Params, filename, contentType string, content []byte, fields map[string]string) (*httptest.ResponseRecorder, *gin.Context) {
	t.Helper()
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	for key, value := range fields {
		require.NoError(t, writer.WriteField(key, value))
	}

	part, err := writer.CreatePart(map[string][]string{
		"Content-Disposition": {`form-data; name="file"; filename="` + filename + `"`},
		"Content-Type":        {contentType},
	})
	require.NoError(t, err)
	_, err = part.Write(content)
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodPost, "/test", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	c.Request = req
	c.Params = params
	return w, c
}

func newParticipationStageEvent() (*event.Event, uuid.UUID) {
	authorID := uuid.New()
	e := event.NewEvent("Event", "desc", authorID, time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.Stage = event.StageParticipation
	return e, authorID
}

// ---------------------------------------------------------------------------
// UploadAttachment
// ---------------------------------------------------------------------------

func TestUploadAttachment_Success(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, _ := newParticipationStageEvent()
	s.eventRepo.addEvent(e)
	p := participant.NewParticipant("P", "One", "p@example.com")
	s.userRepo.addUser(p)
	s.eventRepo.byParticipant[p.ID.String()] = []*event.Event{e}

	w, c := buildMultipartUpload(t,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}},
		"photo.jpg", "image/jpeg", []byte("fake image bytes"))

	s.handler.UploadAttachment(c)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	attachments, _ := s.attachmentRepo.GetByEventID(e.ID.String())
	require.Len(t, attachments, 1)
	assert.Equal(t, "photo.jpg", attachments[0].OriginalName)
	assert.Equal(t, "", attachments[0].Description, "description is optional and defaults to empty")
}

func TestUploadAttachment_AcceptsOptionalDescription(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, _ := newParticipationStageEvent()
	s.eventRepo.addEvent(e)
	p := participant.NewParticipant("P", "One", "p@example.com")
	s.userRepo.addUser(p)
	s.eventRepo.byParticipant[p.ID.String()] = []*event.Event{e}

	w, c := buildMultipartUploadWithFields(t,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}},
		"photo.jpg", "image/jpeg", []byte("fake image bytes"),
		map[string]string{"description": "  Final draft, high resolution  "})

	s.handler.UploadAttachment(c)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	attachments, _ := s.attachmentRepo.GetByEventID(e.ID.String())
	require.Len(t, attachments, 1)
	assert.Equal(t, "Final draft, high resolution", attachments[0].Description, "description should be trimmed")
	assert.Equal(t, "Final draft, high resolution", jsonBody(t, w)["data"].(map[string]interface{})["description"])
}

func TestUploadAttachment_RejectsDescriptionTooLong(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, _ := newParticipationStageEvent()
	s.eventRepo.addEvent(e)
	p := participant.NewParticipant("P", "One", "p@example.com")
	s.userRepo.addUser(p)
	s.eventRepo.byParticipant[p.ID.String()] = []*event.Event{e}

	tooLong := strings.Repeat("a", 1001)
	w, c := buildMultipartUploadWithFields(t,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}},
		"photo.jpg", "image/jpeg", []byte("fake image bytes"),
		map[string]string{"description": tooLong})

	s.handler.UploadAttachment(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "DESCRIPTION_TOO_LONG", jsonBody(t, w)["code"])
	attachments, _ := s.attachmentRepo.GetByEventID(e.ID.String())
	assert.Empty(t, attachments, "no attachment should be created when the description is rejected")
}

func TestUploadAttachment_RejectsWrongStage(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, _ := newParticipationStageEvent()
	e.Stage = event.StageVoting
	s.eventRepo.addEvent(e)
	p := participant.NewParticipant("P", "One", "p@example.com")
	s.userRepo.addUser(p)

	w, c := buildMultipartUpload(t,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}},
		"photo.jpg", "image/jpeg", []byte("data"))

	s.handler.UploadAttachment(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_EVENT_STAGE", jsonBody(t, w)["code"])
}

func TestUploadAttachment_RejectsPausedEvent(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, _ := newParticipationStageEvent()
	e.IsPaused = true
	s.eventRepo.addEvent(e)
	p := participant.NewParticipant("P", "One", "p@example.com")
	s.userRepo.addUser(p)

	w, c := buildMultipartUpload(t,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}},
		"photo.jpg", "image/jpeg", []byte("data"))

	s.handler.UploadAttachment(c)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Equal(t, "EVENT_PAUSED", jsonBody(t, w)["code"])
}

func TestUploadAttachment_RejectsCreatorUploading(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, authorID := newParticipationStageEvent()
	s.eventRepo.addEvent(e)
	author := &participant.User{ID: authorID, Name: "Author", Email: "author@example.com", Role: participant.RoleOrganizer}
	s.userRepo.addUser(author)

	w, c := buildMultipartUpload(t,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: authorID.String()}},
		"photo.jpg", "image/jpeg", []byte("data"))

	s.handler.UploadAttachment(c)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Equal(t, "CREATOR_CANNOT_UPLOAD", jsonBody(t, w)["code"])
}

func TestUploadAttachment_RejectsUnregisteredParticipant(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, _ := newParticipationStageEvent()
	s.eventRepo.addEvent(e)
	p := participant.NewParticipant("P", "One", "p@example.com")
	s.userRepo.addUser(p) // exists, but never registered for this event

	w, c := buildMultipartUpload(t,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}},
		"photo.jpg", "image/jpeg", []byte("data"))

	s.handler.UploadAttachment(c)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Equal(t, "NOT_REGISTERED", jsonBody(t, w)["code"])
}

func TestUploadAttachment_RejectsDuplicateAttachment(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, _ := newParticipationStageEvent()
	s.eventRepo.addEvent(e)
	p := participant.NewParticipant("P", "One", "p@example.com")
	s.userRepo.addUser(p)
	s.eventRepo.byParticipant[p.ID.String()] = []*event.Event{e}
	existing := attachment.NewAttachment(e.ID, p.ID, "old.jpg", "old.jpg", "old-key", "image/jpeg", 10, "")
	s.attachmentRepo.addAttachment(existing)

	w, c := buildMultipartUpload(t,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}},
		"photo.jpg", "image/jpeg", []byte("data"))

	s.handler.UploadAttachment(c)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Equal(t, "DUPLICATE_ATTACHMENT", jsonBody(t, w)["code"])
}

func TestUploadAttachment_RejectsFileTooLarge(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	s.handler.config.Upload.MaxFileSize = 5 // 5 bytes, smaller than our payload
	e, _ := newParticipationStageEvent()
	s.eventRepo.addEvent(e)
	p := participant.NewParticipant("P", "One", "p@example.com")
	s.userRepo.addUser(p)
	s.eventRepo.byParticipant[p.ID.String()] = []*event.Event{e}

	w, c := buildMultipartUpload(t,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}},
		"photo.jpg", "image/jpeg", []byte("this is definitely more than five bytes"))

	s.handler.UploadAttachment(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "FILE_TOO_LARGE", jsonBody(t, w)["code"])
}

func TestUploadAttachment_RejectsDisallowedFileType(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, _ := newParticipationStageEvent()
	s.eventRepo.addEvent(e)
	p := participant.NewParticipant("P", "One", "p@example.com")
	s.userRepo.addUser(p)
	s.eventRepo.byParticipant[p.ID.String()] = []*event.Event{e}

	w, c := buildMultipartUpload(t,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}},
		"script.exe", "application/x-msdownload", []byte("data"))

	s.handler.UploadAttachment(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_FILE_TYPE", jsonBody(t, w)["code"])
}

func TestUploadAttachment_CleansUpStorageWhenDBSaveFails(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, _ := newParticipationStageEvent()
	s.eventRepo.addEvent(e)
	p := participant.NewParticipant("P", "One", "p@example.com")
	s.userRepo.addUser(p)
	s.eventRepo.byParticipant[p.ID.String()] = []*event.Event{e}
	s.attachmentRepo.createErr = errors.New("simulated db failure")

	w, c := buildMultipartUpload(t,
		gin.Params{{Key: "event_id", Value: e.ID.String()}, {Key: "participant_id", Value: p.ID.String()}},
		"photo.jpg", "image/jpeg", []byte("data"))

	s.handler.UploadAttachment(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Equal(t, "DB_SAVE_ERROR", jsonBody(t, w)["code"])
	assert.NotEmpty(t, s.fileStorage.deletedKeys, "the orphaned file should be cleaned up from storage when the DB save fails")
}

// ---------------------------------------------------------------------------
// GetAttachment / GetEventAttachments
// ---------------------------------------------------------------------------

func TestGetAttachment_RejectsMissing(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	w := performRequest(t, http.MethodGet, s.handler.GetAttachment,
		gin.Params{{Key: "attachment_id", Value: uuid.New().String()}}, "", nil)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestGetEventAttachments_Success(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, _ := newParticipationStageEvent()
	att := attachment.NewAttachment(e.ID, uuid.New(), "f.jpg", "photo.jpg", "key", "image/jpeg", 10, "")
	s.attachmentRepo.addAttachment(att)

	w := performRequest(t, http.MethodGet, s.handler.GetEventAttachments,
		gin.Params{{Key: "event_id", Value: e.ID.String()}}, "", nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Equal(t, float64(1), resp["count"])
}

// ---------------------------------------------------------------------------
// DownloadAttachment
// ---------------------------------------------------------------------------

func TestDownloadAttachment_Success(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, _ := newParticipationStageEvent()
	s.eventRepo.addEvent(e)
	owner := uuid.New()
	att := attachment.NewAttachment(e.ID, owner, "f.jpg", "photo.jpg", "storage-key", "image/jpeg", 5, "")
	s.attachmentRepo.addAttachment(att)
	s.fileStorage.files["storage-key"] = []byte("hello")

	w, c := newDownloadTestContext(gin.Params{{Key: "attachment_id", Value: att.ID.String()}}, owner, participant.RoleParticipant)
	s.handler.DownloadAttachment(c)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "hello", w.Body.String())
	assert.Contains(t, w.Header().Get("Content-Disposition"), "photo.jpg")
}

func TestDownloadAttachment_AllowsEventOwner(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, authorID := newParticipationStageEvent()
	s.eventRepo.addEvent(e)
	att := attachment.NewAttachment(e.ID, uuid.New(), "f.jpg", "photo.jpg", "storage-key", "image/jpeg", 5, "")
	s.attachmentRepo.addAttachment(att)
	s.fileStorage.files["storage-key"] = []byte("hello")

	w, c := newDownloadTestContext(gin.Params{{Key: "attachment_id", Value: att.ID.String()}}, authorID, participant.RoleOrganizer)
	s.handler.DownloadAttachment(c)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
}

func TestDownloadAttachment_AllowsAdmin(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, _ := newParticipationStageEvent()
	s.eventRepo.addEvent(e)
	att := attachment.NewAttachment(e.ID, uuid.New(), "f.jpg", "photo.jpg", "storage-key", "image/jpeg", 5, "")
	s.attachmentRepo.addAttachment(att)
	s.fileStorage.files["storage-key"] = []byte("hello")

	w, c := newDownloadTestContext(gin.Params{{Key: "attachment_id", Value: att.ID.String()}}, uuid.New(), participant.RoleAdmin)
	s.handler.DownloadAttachment(c)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
}

func TestDownloadAttachment_RejectsOtherParticipant(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, _ := newParticipationStageEvent()
	s.eventRepo.addEvent(e)
	att := attachment.NewAttachment(e.ID, uuid.New(), "f.jpg", "photo.jpg", "storage-key", "image/jpeg", 5, "")
	s.attachmentRepo.addAttachment(att)
	s.fileStorage.files["storage-key"] = []byte("hello")

	w, c := newDownloadTestContext(gin.Params{{Key: "attachment_id", Value: att.ID.String()}}, uuid.New(), participant.RoleParticipant)
	s.handler.DownloadAttachment(c)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Equal(t, "FORBIDDEN", jsonBody(t, w)["code"])
}

func TestDownloadAttachment_RejectsMissingFileInStorage(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, _ := newParticipationStageEvent()
	s.eventRepo.addEvent(e)
	owner := uuid.New()
	att := attachment.NewAttachment(e.ID, owner, "f.jpg", "photo.jpg", "missing-key", "image/jpeg", 5, "")
	s.attachmentRepo.addAttachment(att)
	// File never added to mockFileStorage.

	w, c := newDownloadTestContext(gin.Params{{Key: "attachment_id", Value: att.ID.String()}}, owner, participant.RoleParticipant)
	s.handler.DownloadAttachment(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, "FILE_NOT_FOUND", jsonBody(t, w)["code"])
}

// ---------------------------------------------------------------------------
// DownloadAttachment - evaluator access to their Assignment (S-003)
// ---------------------------------------------------------------------------

// evaluatorDownloadFixture builds the common scenario for TS-1 to TS-9: an
// event E authored by Ana, in voting, attC owned by Carla and attD owned by
// Diego, plus Bruno's Assignment covering attC (and one other attachment).
type evaluatorDownloadFixture struct {
	s          *testAttachmentHandlerSet
	e          *event.Event
	ana        uuid.UUID
	bruno      uuid.UUID
	carla      uuid.UUID
	diego      uuid.UUID
	attC       *attachment.Attachment
	attD       *attachment.Attachment
	assignment *vote.Assignment
}

func newEvaluatorDownloadFixture() *evaluatorDownloadFixture {
	s := newTestAttachmentHandlerSet()

	ana := uuid.New()
	e := event.NewEvent("Becas 2026", "desc", ana, time.Now(), time.Now().AddDate(0, 0, 5), "org")
	e.Stage = event.StageVoting
	s.eventRepo.addEvent(e)

	bruno := uuid.New()
	carla := uuid.New()
	diego := uuid.New()

	attC := attachment.NewAttachment(e.ID, carla, "carla.pdf", "carla.pdf", "key-carla", "application/pdf", 5, "")
	s.attachmentRepo.addAttachment(attC)
	s.fileStorage.files["key-carla"] = []byte("hello")

	attD := attachment.NewAttachment(e.ID, diego, "diego.pdf", "diego.pdf", "key-diego", "application/pdf", 5, "")
	s.attachmentRepo.addAttachment(attD)
	s.fileStorage.files["key-diego"] = []byte("diego")

	assignment := &vote.Assignment{
		ID:            uuid.New(),
		EventID:       e.ID,
		ParticipantID: bruno,
		AttachmentIDs: pq.StringArray{attC.ID.String(), uuid.New().String()},
		IsCompleted:   false,
	}
	s.voteRepo.assignments[assignment.ID.String()] = assignment

	return &evaluatorDownloadFixture{
		s: s, e: e, ana: ana, bruno: bruno, carla: carla, diego: diego,
		attC: attC, attD: attD, assignment: assignment,
	}
}

func TestDownloadAttachment_EvaluatorAssignmentRules(t *testing.T) {
	tests := []struct {
		name       string
		setup      func(f *evaluatorDownloadFixture)
		attachment func(f *evaluatorDownloadFixture) *attachment.Attachment
		userID     func(f *evaluatorDownloadFixture) uuid.UUID
		wantStatus int
		wantBody   string
		wantCode   string
	}{
		{
			// TS-1: evaluator downloads an attachment in their Assignment during voting.
			name:       "AllowsAssignedEvaluator",
			attachment: func(f *evaluatorDownloadFixture) *attachment.Attachment { return f.attC },
			userID:     func(f *evaluatorDownloadFixture) uuid.UUID { return f.bruno },
			wantStatus: http.StatusOK,
			wantBody:   "hello",
		},
		{
			// TS-2: a paused event does not block the evaluator's download.
			name: "PauseDoesNotBlock",
			setup: func(f *evaluatorDownloadFixture) {
				f.e.IsPaused = true
			},
			attachment: func(f *evaluatorDownloadFixture) *attachment.Attachment { return f.attC },
			userID:     func(f *evaluatorDownloadFixture) uuid.UUID { return f.bruno },
			wantStatus: http.StatusOK,
			wantBody:   "hello",
		},
		{
			// TS-3: submitting the ranking does not close the download.
			name: "CompletedRankingDoesNotClose",
			setup: func(f *evaluatorDownloadFixture) {
				f.assignment.IsCompleted = true
			},
			attachment: func(f *evaluatorDownloadFixture) *attachment.Attachment { return f.attC },
			userID:     func(f *evaluatorDownloadFixture) uuid.UUID { return f.bruno },
			wantStatus: http.StatusOK,
			wantBody:   "hello",
		},
		{
			// TS-4: attachment outside the evaluator's Assignment.
			name:       "RejectsAttachmentOutsideAssignment",
			attachment: func(f *evaluatorDownloadFixture) *attachment.Attachment { return f.attD },
			userID:     func(f *evaluatorDownloadFixture) uuid.UUID { return f.bruno },
			wantStatus: http.StatusForbidden,
			wantCode:   "FORBIDDEN",
		},
		{
			// TS-5: the results stage closes the evaluator's download.
			name: "ResultsStageCloses",
			setup: func(f *evaluatorDownloadFixture) {
				f.e.Stage = event.StageResult
			},
			attachment: func(f *evaluatorDownloadFixture) *attachment.Attachment { return f.attC },
			userID:     func(f *evaluatorDownloadFixture) uuid.UUID { return f.bruno },
			wantStatus: http.StatusForbidden,
			wantCode:   "FORBIDDEN",
		},
		{
			// TS-6: cancelling the event closes the evaluator's download.
			name: "CancellationCloses",
			setup: func(f *evaluatorDownloadFixture) {
				f.e.IsCancelled = true
			},
			attachment: func(f *evaluatorDownloadFixture) *attachment.Attachment { return f.attC },
			userID:     func(f *evaluatorDownloadFixture) uuid.UUID { return f.bruno },
			wantStatus: http.StatusForbidden,
			wantCode:   "FORBIDDEN",
		},
		{
			// TS-7: a stage prior to voting also closes the download, even with the Assignment loaded.
			name: "PreVotingStageCloses",
			setup: func(f *evaluatorDownloadFixture) {
				f.e.Stage = event.StageParticipation
			},
			attachment: func(f *evaluatorDownloadFixture) *attachment.Attachment { return f.attC },
			userID:     func(f *evaluatorDownloadFixture) uuid.UUID { return f.bruno },
			wantStatus: http.StatusForbidden,
			wantCode:   "FORBIDDEN",
		},
		{
			// TS-8: no Assignment at all in the event.
			name:       "RejectsUserWithoutAssignment",
			attachment: func(f *evaluatorDownloadFixture) *attachment.Attachment { return f.attC },
			userID:     func(f *evaluatorDownloadFixture) uuid.UUID { return f.diego },
			wantStatus: http.StatusForbidden,
			wantCode:   "FORBIDDEN",
		},
		{
			// TS-9: the assignment repository fails closed.
			name: "FailsClosedOnAssignmentRepoError",
			setup: func(f *evaluatorDownloadFixture) {
				f.s.voteRepo.getAssignmentByPartErr = errors.New("db down")
			},
			attachment: func(f *evaluatorDownloadFixture) *attachment.Attachment { return f.attC },
			userID:     func(f *evaluatorDownloadFixture) uuid.UUID { return f.bruno },
			wantStatus: http.StatusForbidden,
			wantCode:   "FORBIDDEN",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newEvaluatorDownloadFixture()
			if tt.setup != nil {
				tt.setup(f)
			}
			att := tt.attachment(f)
			userID := tt.userID(f)

			w, c := newDownloadTestContext(gin.Params{{Key: "attachment_id", Value: att.ID.String()}}, userID, participant.RoleParticipant)
			f.s.handler.DownloadAttachment(c)

			require.Equal(t, tt.wantStatus, w.Code, w.Body.String())
			if tt.wantBody != "" {
				assert.Equal(t, tt.wantBody, w.Body.String())
			}
			if tt.wantCode != "" {
				assert.Equal(t, tt.wantCode, jsonBody(t, w)["code"])
			}
		})
	}
}

func TestDownloadAttachment_OwnerCanDownloadInResultsWithoutAssignmentLookup(t *testing.T) {
	// TS-10: the owner in `results` must succeed without ever consulting the Assignment.
	f := newEvaluatorDownloadFixture()
	f.e.Stage = event.StageResult
	f.s.voteRepo.getAssignmentByPartErr = errors.New("must not be called")

	w, c := newDownloadTestContext(gin.Params{{Key: "attachment_id", Value: f.attC.ID.String()}}, f.carla, participant.RoleParticipant)
	f.s.handler.DownloadAttachment(c)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, "hello", w.Body.String())
}

func TestDownloadAttachment_AuthorCanDownloadInCancelledResults(t *testing.T) {
	// TS-11: the author in a cancelled event in `results` must still succeed.
	f := newEvaluatorDownloadFixture()
	f.e.Stage = event.StageResult
	f.e.IsCancelled = true

	w, c := newDownloadTestContext(gin.Params{{Key: "attachment_id", Value: f.attC.ID.String()}}, f.ana, participant.RoleOrganizer)
	f.s.handler.DownloadAttachment(c)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, "hello", w.Body.String())
}

func TestDownloadAttachment_EvaluatorMissingFileInStorage(t *testing.T) {
	// TS-12: the evaluator's assigned attachment is missing from storage.
	f := newEvaluatorDownloadFixture()
	missing := attachment.NewAttachment(f.e.ID, f.carla, "missing.pdf", "missing.pdf", "missing-key", "application/pdf", 5, "")
	f.s.attachmentRepo.addAttachment(missing)
	f.assignment.AttachmentIDs = pq.StringArray{missing.ID.String()}

	w, c := newDownloadTestContext(gin.Params{{Key: "attachment_id", Value: missing.ID.String()}}, f.bruno, participant.RoleParticipant)
	f.s.handler.DownloadAttachment(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, "FILE_NOT_FOUND", jsonBody(t, w)["code"])
}

func TestDownloadAttachment_NonexistentAttachment(t *testing.T) {
	// TS-13: attachment_id does not exist at all.
	f := newEvaluatorDownloadFixture()

	w, c := newDownloadTestContext(gin.Params{{Key: "attachment_id", Value: "99999999-0000-0000-0000-000000000009"}}, f.bruno, participant.RoleParticipant)
	f.s.handler.DownloadAttachment(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, "ATTACHMENT_NOT_FOUND", jsonBody(t, w)["code"])
}

func TestDownloadAttachment_NoToken(t *testing.T) {
	// TS-14: no Authorization header, real middleware chain.
	f := newEvaluatorDownloadFixture()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/api/v1/attachments/:attachment_id/download", auth.JWTAuthMiddleware(), f.s.handler.DownloadAttachment)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/attachments/"+f.attC.ID.String()+"/download", nil)
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusUnauthorized, w.Code)
	body := jsonBody(t, w)
	assert.Equal(t, "UNAUTHORIZED", body["error"])
	assert.Equal(t, "Missing Authorization header", body["message"])
}

func newDownloadTestContext(params gin.Params, userID uuid.UUID, role participant.Role) (*httptest.ResponseRecorder, *gin.Context) {
	return newAuthedTestContext(http.MethodGet, params, userID, role)
}

// newAuthedTestContext builds a gin.Context as JWTAuthMiddleware would leave it
// for an authenticated request, for handlers that read the user from context.
func newAuthedTestContext(method string, params gin.Params, userID uuid.UUID, role participant.Role) (*httptest.ResponseRecorder, *gin.Context) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(method, "/test", nil)
	c.Params = params
	c.Set("user_id", userID.String())
	c.Set("user_role", role)
	return w, c
}

// ---------------------------------------------------------------------------
// DeleteAttachment
// ---------------------------------------------------------------------------

func TestDeleteAttachment_Success(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, _ := newParticipationStageEvent()
	s.eventRepo.addEvent(e)
	owner := participant.NewParticipant("Owner", "One", "owner@example.com")
	s.userRepo.addUser(owner)
	att := attachment.NewAttachment(e.ID, owner.ID, "f.jpg", "photo.jpg", "storage-key", "image/jpeg", 5, "")
	s.attachmentRepo.addAttachment(att)
	s.fileStorage.files["storage-key"] = []byte("hello")

	w, c := newAuthedTestContext(http.MethodDelete,
		gin.Params{{Key: "attachment_id", Value: att.ID.String()}}, owner.ID, participant.RoleParticipant)
	s.handler.DeleteAttachment(c)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	_, err := s.attachmentRepo.GetByID(att.ID.String())
	assert.Error(t, err, "attachment should be removed from the repository")
	assert.Contains(t, s.fileStorage.deletedKeys, "storage-key")
}

func TestDeleteAttachment_RejectsOtherParticipant(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, _ := newParticipationStageEvent()
	s.eventRepo.addEvent(e)
	owner := uuid.New()
	att := attachment.NewAttachment(e.ID, owner, "f.jpg", "photo.jpg", "storage-key", "image/jpeg", 5, "")
	s.attachmentRepo.addAttachment(att)

	w, c := newAuthedTestContext(http.MethodDelete,
		gin.Params{{Key: "attachment_id", Value: att.ID.String()}}, uuid.New(), participant.RoleParticipant)
	s.handler.DeleteAttachment(c)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Equal(t, "FORBIDDEN", jsonBody(t, w)["code"])
	_, err := s.attachmentRepo.GetByID(att.ID.String())
	assert.NoError(t, err, "attachment must survive an unauthorized delete attempt")
}

func TestDeleteAttachment_RejectsEventOwner(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, authorID := newParticipationStageEvent()
	s.eventRepo.addEvent(e)
	att := attachment.NewAttachment(e.ID, uuid.New(), "f.jpg", "photo.jpg", "storage-key", "image/jpeg", 5, "")
	s.attachmentRepo.addAttachment(att)

	w, c := newAuthedTestContext(http.MethodDelete,
		gin.Params{{Key: "attachment_id", Value: att.ID.String()}}, authorID, participant.RoleOrganizer)
	s.handler.DeleteAttachment(c)

	assert.Equal(t, http.StatusForbidden, w.Code, w.Body.String())
	assert.Equal(t, "FORBIDDEN", jsonBody(t, w)["code"])
}

func TestDeleteAttachment_RejectsWrongStage(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	e, _ := newParticipationStageEvent()
	e.Stage = event.StageVoting
	s.eventRepo.addEvent(e)
	owner := uuid.New()
	att := attachment.NewAttachment(e.ID, owner, "f.jpg", "photo.jpg", "storage-key", "image/jpeg", 5, "")
	s.attachmentRepo.addAttachment(att)

	w, c := newAuthedTestContext(http.MethodDelete,
		gin.Params{{Key: "attachment_id", Value: att.ID.String()}}, owner, participant.RoleParticipant)
	s.handler.DeleteAttachment(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_EVENT_STAGE", jsonBody(t, w)["code"])
}

// TestDeleteAttachment_RejectsWhenParentEventLookupFails is a regression test
// for a bug found while writing this suite: DeleteAttachment used to look up
// the parent event only to validate its stage, with the check written as
// `if err == nil && eventEntity.Stage != event.StageParticipation`. When the
// event lookup itself failed (err != nil) - e.g. the event was deleted, or
// the attachment's event_id was stale/corrupted - the whole condition was
// false, so the stage check was silently skipped entirely and the deletion
// proceeded unconditionally. The same `err == nil` pattern also protected the
// "creator cannot delete" check right below it, so a missing event used to
// skip both safeguards at once.
//
// The handler now treats a failed event lookup as a hard error (500) rather
// than an implicit "skip validation".
func TestDeleteAttachment_RejectsWhenParentEventLookupFails(t *testing.T) {
	s := newTestAttachmentHandlerSet()
	owner := uuid.New()
	// Intentionally do NOT add the parent event to eventRepo, so GetByID fails.
	att := attachment.NewAttachment(uuid.New(), owner, "f.jpg", "photo.jpg", "storage-key", "image/jpeg", 5, "")
	s.attachmentRepo.addAttachment(att)

	w, c := newAuthedTestContext(http.MethodDelete,
		gin.Params{{Key: "attachment_id", Value: att.ID.String()}}, owner, participant.RoleParticipant)
	s.handler.DeleteAttachment(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code, w.Body.String())
	assert.Equal(t, "EVENT_LOOKUP_ERROR", jsonBody(t, w)["code"])
	_, err := s.attachmentRepo.GetByID(att.ID.String())
	assert.NoError(t, err, "the attachment must not have been deleted when its parent event couldn't be verified")
}
