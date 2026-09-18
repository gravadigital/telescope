package handlers

import (
	"net/http"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/config"
	"github.com/gravadigital/telescopio-api/internal/domain/event"
	"github.com/gravadigital/telescopio-api/internal/domain/participant"
	"github.com/gravadigital/telescopio-api/internal/email"
	"github.com/gravadigital/telescopio-api/internal/middleware/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testUserHandlerSet bundles the mock dependencies a UserHandler needs.
type testUserHandlerSet struct {
	userRepo  *mockUserRepository
	eventRepo *mockEventRepository
	handler   *UserHandler
}

func newTestUserHandlerSet() *testUserHandlerSet {
	s := &testUserHandlerSet{
		userRepo:  newMockUserRepository(),
		eventRepo: newMockEventRepository(),
	}
	cfg := &config.Config{}
	s.handler = NewUserHandler(s.userRepo, s.eventRepo, email.NewEmailService(cfg), cfg)
	return s
}

// ---------------------------------------------------------------------------
// CreateUser
// ---------------------------------------------------------------------------

func TestCreateUser_Success(t *testing.T) {
	s := newTestUserHandlerSet()
	body := map[string]interface{}{"name": "Ana", "email": "ana@example.com", "password": "supersecret"}
	w := performRequest(t, http.MethodPost, s.handler.CreateUser, nil, "", body)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.NotEmpty(t, resp["token"])

	created, err := s.userRepo.GetByEmail("ana@example.com")
	require.NoError(t, err)
	assert.True(t, created.CheckPassword("supersecret"), "stored password hash must verify against the original password")
	assert.False(t, created.CheckPassword("wrongpassword"))
}

func TestCreateUser_RejectsDuplicateEmail(t *testing.T) {
	s := newTestUserHandlerSet()
	existing := participant.NewParticipant("Existing", "User", "ana@example.com")
	s.userRepo.addUser(existing)

	body := map[string]interface{}{"name": "Ana", "email": "ana@example.com", "password": "supersecret"}
	w := performRequest(t, http.MethodPost, s.handler.CreateUser, nil, "", body)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Equal(t, "EMAIL_ALREADY_EXISTS", jsonBody(t, w)["code"])
}

func TestCreateUser_RejectsShortPassword(t *testing.T) {
	s := newTestUserHandlerSet()
	body := map[string]interface{}{"name": "Ana", "email": "ana@example.com", "password": "short"}
	w := performRequest(t, http.MethodPost, s.handler.CreateUser, nil, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateUser_RejectsInvalidEmail(t *testing.T) {
	s := newTestUserHandlerSet()
	body := map[string]interface{}{"name": "Ana", "email": "not-an-email", "password": "supersecret"}
	w := performRequest(t, http.MethodPost, s.handler.CreateUser, nil, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestCreateUser_IssuesTokenWithNonNilUserID guards against a subtle real
// gotcha: CreateUser builds `&participant.User{...}` without setting ID, and
// relies on GORM's BeforeCreate hook (participant.User.BeforeCreate) to
// assign a UUID during h.userRepo.Create(user) before the handler reads
// user.ID to mint the JWT. If that hook is ever skipped (a different
// UserRepository implementation, a refactor that calls Create differently),
// the token would silently embed a nil UUID. This test decodes the issued
// token and checks the claim directly rather than trusting the response body.
func TestCreateUser_IssuesTokenWithNonNilUserID(t *testing.T) {
	s := newTestUserHandlerSet()
	body := map[string]interface{}{"name": "Ana", "email": "ana@example.com", "password": "supersecret"}
	w := performRequest(t, http.MethodPost, s.handler.CreateUser, nil, "", body)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	token := jsonBody(t, w)["token"].(string)

	claims, err := auth.ValidateToken(token)
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil.String(), claims.UserID)
}

// ---------------------------------------------------------------------------
// AuthenticateUser
// ---------------------------------------------------------------------------

func TestAuthenticateUser_Success(t *testing.T) {
	s := newTestUserHandlerSet()
	u := participant.NewParticipant("Ana", "User", "ana@example.com")
	require.NoError(t, u.SetPassword("supersecret"))
	s.userRepo.addUser(u)

	body := map[string]interface{}{"email": "ana@example.com", "password": "supersecret"}
	w := performRequest(t, http.MethodPost, s.handler.AuthenticateUser, nil, "", body)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.NotEmpty(t, jsonBody(t, w)["token"])
}

func TestAuthenticateUser_RejectsUnknownEmail(t *testing.T) {
	s := newTestUserHandlerSet()
	body := map[string]interface{}{"email": "ghost@example.com", "password": "whatever1"}
	w := performRequest(t, http.MethodPost, s.handler.AuthenticateUser, nil, "", body)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Equal(t, "INVALID_CREDENTIALS", jsonBody(t, w)["code"])
}

func TestAuthenticateUser_RejectsWrongPassword(t *testing.T) {
	s := newTestUserHandlerSet()
	u := participant.NewParticipant("Ana", "User", "ana@example.com")
	require.NoError(t, u.SetPassword("supersecret"))
	s.userRepo.addUser(u)

	body := map[string]interface{}{"email": "ana@example.com", "password": "wrongpassword"}
	w := performRequest(t, http.MethodPost, s.handler.AuthenticateUser, nil, "", body)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Equal(t, "INVALID_CREDENTIALS", jsonBody(t, w)["code"])
}

func TestAuthenticateUser_RejectsOAuthAccountWithoutPassword(t *testing.T) {
	s := newTestUserHandlerSet()
	googleID := "google-123"
	u := &participant.User{ID: uuid.New(), Name: "Ana", Email: "ana@example.com", Role: participant.RoleParticipant, GoogleID: &googleID}
	// PasswordHash intentionally left nil, as a real Google-only account would have.
	s.userRepo.addUser(u)

	body := map[string]interface{}{"email": "ana@example.com", "password": "anything1"}
	w := performRequest(t, http.MethodPost, s.handler.AuthenticateUser, nil, "", body)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Equal(t, "OAUTH_ACCOUNT_NO_PASSWORD", jsonBody(t, w)["code"])
}

// ---------------------------------------------------------------------------
// GetUser
// ---------------------------------------------------------------------------

func TestGetUser_RejectsMissing(t *testing.T) {
	s := newTestUserHandlerSet()
	w := performRequest(t, http.MethodGet, s.handler.GetUser,
		gin.Params{{Key: "user_id", Value: uuid.New().String()}}, "", nil)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestGetUser_Success(t *testing.T) {
	s := newTestUserHandlerSet()
	u := participant.NewParticipant("Ana", "User", "ana@example.com")
	s.userRepo.addUser(u)

	w := performRequest(t, http.MethodGet, s.handler.GetUser,
		gin.Params{{Key: "user_id", Value: u.ID.String()}}, "", nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	data := jsonBody(t, w)["user"].(map[string]interface{})
	assert.Equal(t, "ana@example.com", data["email"])
}

// ---------------------------------------------------------------------------
// GetUserEvents — must only allow a user to view their own events.
// ---------------------------------------------------------------------------

func TestGetUserEvents_RejectsUnauthenticated(t *testing.T) {
	s := newTestUserHandlerSet()
	w := performRequest(t, http.MethodGet, s.handler.GetUserEvents,
		gin.Params{{Key: "user_id", Value: uuid.New().String()}}, "", nil)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Equal(t, "NO_AUTH_TOKEN", jsonBody(t, w)["code"])
}

func TestGetUserEvents_RejectsAccessingAnotherUsersEvents(t *testing.T) {
	s := newTestUserHandlerSet()
	authenticatedUserID := uuid.New().String()
	otherUserID := uuid.New().String()

	w := performAuthedRequest(t, http.MethodGet, s.handler.GetUserEvents,
		gin.Params{{Key: "user_id", Value: otherUserID}}, authenticatedUserID, nil)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Equal(t, "UNAUTHORIZED_ACCESS", jsonBody(t, w)["code"])
}

func TestGetUserEvents_Success(t *testing.T) {
	s := newTestUserHandlerSet()
	userID := uuid.New().String()
	userUUID, _ := uuid.Parse(userID)
	e := event.NewEvent("Star Party", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")
	s.eventRepo.byParticipant[userID] = []*event.Event{e}
	_ = userUUID

	w := performAuthedRequest(t, http.MethodGet, s.handler.GetUserEvents,
		gin.Params{{Key: "user_id", Value: userID}}, userID, nil)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	data := jsonBody(t, w)["data"].([]interface{})
	require.Len(t, data, 1)
	assert.Equal(t, "Star Party", data[0].(map[string]interface{})["name"])
}

// ---------------------------------------------------------------------------
// ForgotPassword — must never reveal whether an email is registered.
// ---------------------------------------------------------------------------

func TestForgotPassword_ReturnsOKForUnknownEmail(t *testing.T) {
	s := newTestUserHandlerSet()
	body := map[string]interface{}{"email": "ghost@example.com"}
	w := performRequest(t, http.MethodPost, s.handler.ForgotPassword, nil, "", body)

	assert.Equal(t, http.StatusOK, w.Code, "must not leak whether the email is registered via a different status code")
}

func TestForgotPassword_GeneratesAndSavesTokenForKnownEmail(t *testing.T) {
	s := newTestUserHandlerSet()
	u := participant.NewParticipant("Ana", "User", "ana@example.com")
	s.userRepo.addUser(u)

	body := map[string]interface{}{"email": "ana@example.com"}
	w := performRequest(t, http.MethodPost, s.handler.ForgotPassword, nil, "", body)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	updated, err := s.userRepo.GetByEmail("ana@example.com")
	require.NoError(t, err)
	assert.NotNil(t, updated.PasswordResetToken, "a reset token should have been generated and saved")
	assert.True(t, updated.IsPasswordResetTokenValid())
}

func TestForgotPassword_ResponseIsIdenticalForKnownAndUnknownEmail(t *testing.T) {
	s := newTestUserHandlerSet()
	u := participant.NewParticipant("Ana", "User", "ana@example.com")
	s.userRepo.addUser(u)

	knownBody := map[string]interface{}{"email": "ana@example.com"}
	wKnown := performRequest(t, http.MethodPost, s.handler.ForgotPassword, nil, "", knownBody)

	unknownBody := map[string]interface{}{"email": "ghost@example.com"}
	wUnknown := performRequest(t, http.MethodPost, s.handler.ForgotPassword, nil, "", unknownBody)

	assert.Equal(t, wKnown.Code, wUnknown.Code)
	assert.Equal(t, jsonBody(t, wKnown)["message"], jsonBody(t, wUnknown)["message"],
		"the response body must be indistinguishable regardless of whether the email exists")
}

// ---------------------------------------------------------------------------
// ResetPassword
// ---------------------------------------------------------------------------

func TestResetPassword_Success(t *testing.T) {
	s := newTestUserHandlerSet()
	u := participant.NewParticipant("Ana", "User", "ana@example.com")
	require.NoError(t, u.SetPassword("oldpassword"))
	token, err := u.GeneratePasswordResetToken()
	require.NoError(t, err)
	s.userRepo.addUser(u)
	s.userRepo.resetTokenIndex[token] = u

	body := map[string]interface{}{"token": token, "password": "newpassword123"}
	w := performRequest(t, http.MethodPost, s.handler.ResetPassword, nil, "", body)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	updated, err := s.userRepo.GetByEmail("ana@example.com")
	require.NoError(t, err)
	assert.True(t, updated.CheckPassword("newpassword123"), "the new password must actually be persisted")
	assert.False(t, updated.CheckPassword("oldpassword"), "the old password must no longer work")
	assert.Nil(t, updated.PasswordResetToken, "the reset token must be cleared after use")
}

func TestResetPassword_RejectsInvalidToken(t *testing.T) {
	s := newTestUserHandlerSet()
	body := map[string]interface{}{"token": "does-not-exist", "password": "newpassword123"}
	w := performRequest(t, http.MethodPost, s.handler.ResetPassword, nil, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "INVALID_RESET_TOKEN", jsonBody(t, w)["code"])
}

func TestResetPassword_RejectsExpiredToken(t *testing.T) {
	s := newTestUserHandlerSet()
	u := participant.NewParticipant("Ana", "User", "ana@example.com")
	token, err := u.GeneratePasswordResetToken()
	require.NoError(t, err)
	expired := time.Now().Add(-1 * time.Hour)
	u.PasswordResetExpiresAt = &expired
	s.userRepo.addUser(u)
	s.userRepo.resetTokenIndex[token] = u

	body := map[string]interface{}{"token": token, "password": "newpassword123"}
	w := performRequest(t, http.MethodPost, s.handler.ResetPassword, nil, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "EXPIRED_RESET_TOKEN", jsonBody(t, w)["code"])
}

func TestResetPassword_RejectsShortNewPassword(t *testing.T) {
	s := newTestUserHandlerSet()
	u := participant.NewParticipant("Ana", "User", "ana@example.com")
	token, err := u.GeneratePasswordResetToken()
	require.NoError(t, err)
	s.userRepo.addUser(u)
	s.userRepo.resetTokenIndex[token] = u

	body := map[string]interface{}{"token": token, "password": "short"}
	w := performRequest(t, http.MethodPost, s.handler.ResetPassword, nil, "", body)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}
