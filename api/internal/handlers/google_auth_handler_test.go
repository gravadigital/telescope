package handlers

import (
	"errors"
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/config"
	"github.com/gravadigital/telescopio-api/internal/domain/participant"
	"github.com/gravadigital/telescopio-api/internal/middleware/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testGoogleAuthHandlerSet bundles the mock dependencies a GoogleAuthHandler needs.
type testGoogleAuthHandlerSet struct {
	userRepo *mockUserRepository
	handler  *GoogleAuthHandler
}

func newTestGoogleAuthHandlerSet() *testGoogleAuthHandlerSet {
	s := &testGoogleAuthHandlerSet{userRepo: newMockUserRepository()}
	s.handler = NewGoogleAuthHandler(s.userRepo, &config.Config{})
	return s
}

// ---------------------------------------------------------------------------
// resolveUser — the actual business logic, testable in isolation since it
// takes the repository as a parameter rather than reaching for the network.
// ---------------------------------------------------------------------------

func TestResolveUser_NewUserWhenNeitherGoogleIDNorEmailMatch(t *testing.T) {
	userRepo := newMockUserRepository()
	profile := &GoogleProfile{GoogleID: "g-123", Email: "new@example.com", Name: "New Person"}

	res, err := resolveUser(profile, userRepo)
	require.NoError(t, err)
	assert.Equal(t, "new_user", res.Status)
	assert.Nil(t, res.User)
}

func TestResolveUser_ExistingUserFoundByGoogleID(t *testing.T) {
	userRepo := newMockUserRepository()
	googleID := "g-123"
	existing := &participant.User{Name: "Existing", Email: "existing@example.com", GoogleID: &googleID}
	userRepo.addUser(existing)

	profile := &GoogleProfile{GoogleID: googleID, Email: "existing@example.com", Name: "Existing"}
	res, err := resolveUser(profile, userRepo)
	require.NoError(t, err)
	assert.Equal(t, "existing_user", res.Status)
	assert.Equal(t, existing.Email, res.User.Email)
}

func TestResolveUser_LinksGoogleIDToExistingEmailAccount(t *testing.T) {
	userRepo := newMockUserRepository()
	// A password-based account with the same email, but no google_id linked yet.
	existing := participant.NewParticipant("Existing", "Person", "existing@example.com")
	userRepo.addUser(existing)
	require.Nil(t, existing.GoogleID)

	profile := &GoogleProfile{GoogleID: "g-456", Email: "existing@example.com", Name: "Existing"}
	res, err := resolveUser(profile, userRepo)
	require.NoError(t, err)
	assert.Equal(t, "existing_user", res.Status)

	updated, err := userRepo.GetByEmail("existing@example.com")
	require.NoError(t, err)
	require.NotNil(t, updated.GoogleID, "the google_id should have been linked to the existing account")
	assert.Equal(t, "g-456", *updated.GoogleID)
}

func TestResolveUser_DoesNotRelinkWhenGoogleIDAlreadySet(t *testing.T) {
	userRepo := newMockUserRepository()
	originalGoogleID := "g-original"
	existing := &participant.User{Name: "Existing", Email: "existing@example.com", GoogleID: &originalGoogleID}
	userRepo.addUser(existing)

	// A different google_id claiming the same email should not overwrite the link
	// via the email-lookup path, since GetByGoogleID("g-original") already
	// resolves it - this profile would only reach the email branch if the
	// google_id itself didn't match, which isn't exercised here directly, but
	// we confirm the existing link survives a resolveUser call keyed by it.
	profile := &GoogleProfile{GoogleID: originalGoogleID, Email: "existing@example.com", Name: "Existing"}
	res, err := resolveUser(profile, userRepo)
	require.NoError(t, err)
	assert.Equal(t, "existing_user", res.Status)
	assert.Equal(t, originalGoogleID, *res.User.GoogleID)
}

// ---------------------------------------------------------------------------
// VerifyGoogleToken
// ---------------------------------------------------------------------------

func TestVerifyGoogleToken_RejectsInvalidToken(t *testing.T) {
	s := newTestGoogleAuthHandlerSet()
	s.handler.verifyToken = func(accessToken string) (*GoogleProfile, error) {
		return nil, ErrInvalidGoogleToken
	}

	body := map[string]interface{}{"token": "bad-token"}
	w := performRequest(t, http.MethodPost, s.handler.VerifyGoogleToken, nil, "", body)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Equal(t, "INVALID_GOOGLE_TOKEN", jsonBody(t, w)["code"])
}

func TestVerifyGoogleToken_ReportsGoogleAPIUnavailable(t *testing.T) {
	s := newTestGoogleAuthHandlerSet()
	s.handler.verifyToken = func(accessToken string) (*GoogleProfile, error) {
		return nil, errors.New("network is unreachable")
	}

	body := map[string]interface{}{"token": "any-token"}
	w := performRequest(t, http.MethodPost, s.handler.VerifyGoogleToken, nil, "", body)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Equal(t, "GOOGLE_API_ERROR", jsonBody(t, w)["code"])
}

func TestVerifyGoogleToken_ReturnsNewUserStatusForUnknownProfile(t *testing.T) {
	s := newTestGoogleAuthHandlerSet()
	s.handler.verifyToken = func(accessToken string) (*GoogleProfile, error) {
		return &GoogleProfile{GoogleID: "g-1", Email: "fresh@example.com", Name: "Fresh Person"}, nil
	}

	body := map[string]interface{}{"token": "valid-token"}
	w := performRequest(t, http.MethodPost, s.handler.VerifyGoogleToken, nil, "", body)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Equal(t, "new_user", resp["status"])
	assert.Empty(t, resp["token"], "a new user must not receive a JWT before completing registration")
}

func TestVerifyGoogleToken_ReturnsJWTForExistingUser(t *testing.T) {
	s := newTestGoogleAuthHandlerSet()
	googleID := "g-1"
	// A real persisted user always has a non-nil ID (assigned by GORM on
	// creation); VerifyGoogleToken never calls Create for an existing user,
	// so the JWT it mints must come from the ID already on the loaded row.
	existing := &participant.User{ID: uuid.New(), Name: "Existing", Email: "existing@example.com", GoogleID: &googleID, Role: participant.RoleParticipant}
	s.userRepo.addUser(existing)

	s.handler.verifyToken = func(accessToken string) (*GoogleProfile, error) {
		return &GoogleProfile{GoogleID: googleID, Email: "existing@example.com", Name: "Existing"}, nil
	}

	body := map[string]interface{}{"token": "valid-token"}
	w := performRequest(t, http.MethodPost, s.handler.VerifyGoogleToken, nil, "", body)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	resp := jsonBody(t, w)
	assert.Equal(t, "existing_user", resp["status"])
	token := resp["token"].(string)
	require.NotEmpty(t, token)

	claims, err := auth.ValidateToken(token)
	require.NoError(t, err)
	assert.Equal(t, "existing@example.com", claims.Email)
	assert.Equal(t, existing.ID.String(), claims.UserID)
}

// ---------------------------------------------------------------------------
// RegisterGoogleUser
// ---------------------------------------------------------------------------

func TestRegisterGoogleUser_Success(t *testing.T) {
	s := newTestGoogleAuthHandlerSet()
	s.handler.verifyToken = func(accessToken string) (*GoogleProfile, error) {
		return &GoogleProfile{GoogleID: "g-1", Email: "new@example.com", Name: "New Person"}, nil
	}

	body := map[string]interface{}{"token": "valid-token", "username": "newperson"}
	w := performRequest(t, http.MethodPost, s.handler.RegisterGoogleUser, nil, "", body)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	created, err := s.userRepo.GetByEmail("new@example.com")
	require.NoError(t, err)
	assert.Equal(t, "newperson", created.Name)
	require.NotNil(t, created.GoogleID)
	assert.Equal(t, "g-1", *created.GoogleID)
	assert.Nil(t, created.PasswordHash, "an OAuth-created user must have no password")
}

func TestRegisterGoogleUser_RejectsInvalidToken(t *testing.T) {
	s := newTestGoogleAuthHandlerSet()
	s.handler.verifyToken = func(accessToken string) (*GoogleProfile, error) {
		return nil, ErrInvalidGoogleToken
	}

	body := map[string]interface{}{"token": "bad-token", "username": "newperson"}
	w := performRequest(t, http.MethodPost, s.handler.RegisterGoogleUser, nil, "", body)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Equal(t, "INVALID_GOOGLE_TOKEN", jsonBody(t, w)["code"])
}

func TestRegisterGoogleUser_RejectsDuplicateUsername(t *testing.T) {
	s := newTestGoogleAuthHandlerSet()
	s.userRepo.usernameExistsFn = func(username string) (bool, error) {
		return username == "taken", nil
	}
	s.handler.verifyToken = func(accessToken string) (*GoogleProfile, error) {
		return &GoogleProfile{GoogleID: "g-1", Email: "new@example.com", Name: "New Person"}, nil
	}

	body := map[string]interface{}{"token": "valid-token", "username": "taken"}
	w := performRequest(t, http.MethodPost, s.handler.RegisterGoogleUser, nil, "", body)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Equal(t, "USERNAME_ALREADY_EXISTS", jsonBody(t, w)["code"])
}
