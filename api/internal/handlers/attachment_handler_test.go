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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testAttachmentHandlerSet bundles the mock dependencies an AttachmentHandler needs.
type testAttachmentHandlerSet struct {
	attachmentRepo *mockAttachmentRepository
	eventRepo      *mockEventRepository
	userRepo       *mockUserRepository
	fileStorage    *mockFileStorage
	handler        *AttachmentHandler
}

func newTestAttachmentHandlerSet() *testAttachmentHandlerSet {
	s := &testAttachmentHandlerSet{
		attachmentRepo: newMockAttachmentRepository(),
		eventRepo:      newMockEventRepository(),
		userRepo:       newMockUserRepository(),
		fileStorage:    newMockFileStorage(),
	}
	cfg := &config.Config{}
	cfg.Upload.MaxFileSize = 10 * 1024 * 1024
	s.handler = NewAttachmentHandler(s.attachmentRepo, s.eventRepo, s.userRepo, s.fileStorage, cfg)
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
