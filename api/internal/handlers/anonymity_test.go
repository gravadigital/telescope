package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/config"
	"github.com/gravadigital/telescopio-api/internal/domain/attachment"
	"github.com/gravadigital/telescopio-api/internal/domain/event"
	"github.com/gravadigital/telescopio-api/internal/domain/participant"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const docxMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

// attachmentHandlerOver builds an AttachmentHandler that shares the mocks of an existing set,
// so both handlers see the same event, attachments and assignments.
func attachmentHandlerOver(s *testHandlerSet) (*AttachmentHandler, *mockFileStorage) {
	fs := newMockFileStorage()
	fs.files["key-a2"] = []byte("png-bytes")
	fs.files["key-a3"] = []byte("docx-bytes")
	return NewAttachmentHandler(s.attachmentRepo, s.eventRepo, s.userRepo, s.voteRepo, fs, &config.Config{}), fs
}

func download(h *AttachmentHandler, att *attachment.Attachment, userID uuid.UUID, role participant.Role) *httptest.ResponseRecorder {
	w, c := newDownloadTestContext(gin.Params{{Key: "attachment_id", Value: att.ID.String()}}, userID, role)
	h.DownloadAttachment(c)
	return w
}

func listAttachments(h *AttachmentHandler, eventID, userID uuid.UUID, role participant.Role) *httptest.ResponseRecorder {
	w, c := newAuthedTestContext(http.MethodGet, gin.Params{{Key: "event_id", Value: eventID.String()}}, userID, role)
	h.GetEventAttachments(c)
	return w
}

func TestDownloadAttachment_EvaluatorGetsNeutralName(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newVotingEvent())
	h, _ := attachmentHandlerOver(s)

	w := download(h, sc.a[2], sc.p[0].ID, participant.RoleParticipant)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, "docx-bytes", w.Body.String())
	assert.Equal(t, `attachment; filename="propuesta-2.docx"`, w.Header().Get("Content-Disposition"))
	assert.Equal(t, docxMime, w.Header().Get("Content-Type"))
	assert.Equal(t, "8192", w.Header().Get("Content-Length"))
	assert.NotContains(t, w.Header().Get("Content-Disposition"), "notas.docx")
}

func TestDownloadAttachment_EvaluatorInResults(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newResultsEvent())
	h, _ := attachmentHandlerOver(s)

	w := download(h, sc.a[1], sc.p[0].ID, participant.RoleParticipant)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, `attachment; filename="propuesta-1.png"`, w.Header().Get("Content-Disposition"))
}

func TestDownloadAttachment_EvaluatorDeniedOutsideVotingAndResults(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newParticipationEvent())
	h, _ := attachmentHandlerOver(s)

	w := download(h, sc.a[2], sc.p[0].ID, participant.RoleParticipant)

	require.Equal(t, http.StatusForbidden, w.Code)
	assert.Equal(t, "FORBIDDEN", jsonBody(t, w)["code"])
}

func TestDownloadAttachment_DeniedWithoutThatAssignment(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newVotingEvent())
	h, _ := attachmentHandlerOver(s)

	// P4 has no assignment; P1 does, but A1 (their own) is not in it.
	for _, tc := range []struct {
		name string
		user uuid.UUID
		att  *attachment.Attachment
	}{
		{"no assignment", sc.p[3].ID, sc.a[1]},
		{"attachment not assigned", sc.p[0].ID, sc.a[0]},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if tc.att == sc.a[0] {
				// A1 belongs to P1: use another evaluator with an assignment that does not include it.
				tc.user = sc.p[2].ID
			}
			w := download(h, tc.att, tc.user, participant.RoleParticipant)
			require.Equal(t, http.StatusForbidden, w.Code)
			assert.Equal(t, "FORBIDDEN", jsonBody(t, w)["code"])
		})
	}
}

func TestDownloadAttachment_DeniedWhenAssignmentLookupFails(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newVotingEvent())
	h, _ := attachmentHandlerOver(s)
	s.voteRepo.getAssignmentByPartErr = assert.AnError

	w := download(h, sc.a[2], sc.p[0].ID, participant.RoleParticipant)

	require.Equal(t, http.StatusForbidden, w.Code)
	assert.Equal(t, "FORBIDDEN", jsonBody(t, w)["code"])
}

func TestDownloadAttachment_PrivilegedUsersGetOriginalName(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newVotingEvent())
	h, _ := attachmentHandlerOver(s)

	for name, tc := range map[string]struct {
		user uuid.UUID
		role participant.Role
		att  *attachment.Attachment
		want string
	}{
		"owner":     {sc.p[1].ID, participant.RoleParticipant, sc.a[1], "juan-perez.png"},
		"organizer": {sc.e.AuthorID, participant.RoleOrganizer, sc.a[2], "notas.docx"},
		"admin":     {uuid.New(), participant.RoleAdmin, sc.a[2], "notas.docx"},
	} {
		t.Run(name, func(t *testing.T) {
			w := download(h, tc.att, tc.user, tc.role)
			require.Equal(t, http.StatusOK, w.Code, w.Body.String())
			assert.Equal(t, `attachment; filename="`+tc.want+`"`, w.Header().Get("Content-Disposition"))
		})
	}
}

func TestDownloadAttachment_UnknownMimeUsesBinExtension(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newVotingEvent())
	h, fs := attachmentHandlerOver(s)
	odd := attachment.NewAttachment(sc.e.ID, sc.p[1].ID, "f", "x.dat", "key-a5", "application/octet-stream", 3, "")
	s.attachmentRepo.addAttachment(odd)
	fs.files["key-a5"] = []byte("abc")
	sc.assignment.AttachmentIDs = []string{odd.ID.String(), sc.a[2].ID.String()}

	w := download(h, odd, sc.p[0].ID, participant.RoleParticipant)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, `attachment; filename="propuesta-1.bin"`, w.Header().Get("Content-Disposition"))
}

func TestNeutralFilename(t *testing.T) {
	for _, tc := range []struct {
		n    int
		mime string
		want string
	}{
		{1, "image/jpeg", "propuesta-1.jpg"},
		{2, "image/png", "propuesta-2.png"},
		{3, "image/gif", "propuesta-3.gif"},
		{1, "image/webp", "propuesta-1.webp"},
		{1, "application/pdf", "propuesta-1.pdf"},
		{1, "text/plain", "propuesta-1.txt"},
		{1, "application/msword", "propuesta-1.doc"},
		{2, docxMime, "propuesta-2.docx"},
		{4, "image/bmp", "propuesta-4.bin"},
	} {
		assert.Equal(t, tc.want, neutralFilename(tc.n, tc.mime))
	}
}

func TestGetEventAttachments_FiltersByRole(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newVotingEvent())
	h, _ := attachmentHandlerOver(s)
	stranger := uuid.New()

	for name, tc := range map[string]struct {
		user  uuid.UUID
		role  participant.Role
		count float64
	}{
		"participant with proposal":    {sc.p[0].ID, participant.RoleParticipant, 1},
		"participant without proposal": {sc.p[3].ID, participant.RoleParticipant, 0},
		"event author":                 {sc.e.AuthorID, participant.RoleOrganizer, 3},
		"admin":                        {stranger, participant.RoleAdmin, 3},
		"global organizer, not author": {stranger, participant.RoleOrganizer, 0},
	} {
		t.Run(name, func(t *testing.T) {
			w := listAttachments(h, sc.e.ID, tc.user, tc.role)
			require.Equal(t, http.StatusOK, w.Code, w.Body.String())
			resp := jsonBody(t, w)
			assert.Equal(t, tc.count, resp["count"])
			assert.Len(t, resp["data"], int(tc.count))
		})
	}

	w := listAttachments(h, sc.e.ID, sc.p[0].ID, participant.RoleParticipant)
	item := jsonBody(t, w)["data"].([]interface{})[0].(map[string]interface{})
	assert.Equal(t, sc.a[0].ID.String(), item["id"])
	assert.Equal(t, sc.p[0].ID.String(), item["participant_id"])
	assert.Equal(t, "informe-garcia.pdf", item["original_name"])
	assert.Equal(t, "/api/v1/attachments/"+sc.a[0].ID.String()+"/download", item["url"])
}

func TestGetEventAttachments_RequiresUserInContext(t *testing.T) {
	s := newTestHandlerSet()
	h, _ := attachmentHandlerOver(s)

	w := performRequest(t, http.MethodGet, h.GetEventAttachments,
		gin.Params{{Key: "event_id", Value: uuid.NewString()}}, "", nil)

	require.Equal(t, http.StatusUnauthorized, w.Code)
	resp := jsonBody(t, w)
	assert.Equal(t, "Unauthorized", resp["error"])
	assert.Equal(t, "UNAUTHORIZED", resp["code"])
}

func TestGetEventAttachments_UnknownEventReturnsEmptyList(t *testing.T) {
	s := newTestHandlerSet()
	h, _ := attachmentHandlerOver(s)

	w := listAttachments(h, uuid.New(), uuid.New(), participant.RoleParticipant)

	require.Equal(t, http.StatusOK, w.Code)
	resp := jsonBody(t, w)
	assert.Equal(t, float64(0), resp["count"])
	assert.Empty(t, resp["data"])
}

// TestAnonymity_EvaluatorNeverSeesAuthorship walks the three endpoints an evaluator uses and
// checks that none of them reveals who wrote the proposals assigned to them.
func TestAnonymity_EvaluatorNeverSeesAuthorship(t *testing.T) {
	s := newTestHandlerSet()
	sc := setupAnonymityScenario(s, newVotingEvent())
	h, _ := attachmentHandlerOver(s)
	evaluator := sc.p[0]

	var seen strings.Builder
	seen.WriteString(listAttachments(h, sc.e.ID, evaluator.ID, participant.RoleParticipant).Body.String())
	seen.WriteString(performRequest(t, http.MethodGet, s.handler.GetParticipantAssignment,
		assignmentParams(sc.e, evaluator), "", nil).Body.String())
	for _, att := range []*attachment.Attachment{sc.a[1], sc.a[2]} {
		w := download(h, att, evaluator.ID, participant.RoleParticipant)
		require.Equal(t, http.StatusOK, w.Code)
		seen.WriteString(w.Header().Get("Content-Disposition"))
	}

	out := seen.String()
	for _, leaked := range []string{"juan-perez.png", "notas.docx", sc.p[1].ID.String(), sc.p[2].ID.String()} {
		assert.NotContains(t, out, leaked)
	}
}

var _ = event.StageVoting
