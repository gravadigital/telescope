package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/domain/participant"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func jsonBody(t *testing.T, w *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var body map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	return body
}

// newSelfOrEventCreatorRouter builds a router with a fake context-setting
// handler (as JWTAuthMiddleware would leave it), RequireSelfOrEventCreator,
// and a stub handler that answers 200 {"ok":true} when it runs.
func newSelfOrEventCreatorRouter(requester uuid.UUID, fake *fakeEventRepository) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/api/v1/users/:user_id",
		func(c *gin.Context) {
			c.Set("user_id", requester.String())
			c.Set("user_role", participant.RoleParticipant)
		},
		RequireSelfOrEventCreator(fake),
		func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })
	return router
}

func TestRequireSelfOrEventCreator_AllowsSelf(t *testing.T) {
	// TS-15: the requester consults their own data; the repo must not be called.
	bruno := uuid.MustParse("bbbbbbbb-0000-0000-0000-000000000002")
	fake := &fakeEventRepository{
		isCreatorOfEventWithParticipantFunc: func(creatorID, userID string) (bool, error) {
			t.Fatal("unexpected call")
			return false, nil
		},
	}
	router := newSelfOrEventCreatorRouter(bruno, fake)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/"+bruno.String(), nil)
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, true, jsonBody(t, w)["ok"])
}

func TestRequireSelfOrEventCreator_AllowsEventCreator(t *testing.T) {
	// TS-16: Ana (creator) consults Bruno, a participant of her event.
	ana := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001")
	bruno := uuid.MustParse("bbbbbbbb-0000-0000-0000-000000000002")

	var gotCreatorID, gotUserID string
	fake := &fakeEventRepository{
		isCreatorOfEventWithParticipantFunc: func(creatorID, userID string) (bool, error) {
			gotCreatorID, gotUserID = creatorID, userID
			return true, nil
		},
	}
	router := newSelfOrEventCreatorRouter(ana, fake)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/"+bruno.String(), nil)
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, true, jsonBody(t, w)["ok"])
	assert.Equal(t, ana.String(), gotCreatorID)
	assert.Equal(t, bruno.String(), gotUserID)
}

func TestRequireSelfOrEventCreator_RejectsFellowParticipant(t *testing.T) {
	// TS-17: Bruno, a mere participant, consults Carla's data.
	bruno := uuid.MustParse("bbbbbbbb-0000-0000-0000-000000000002")
	carla := uuid.MustParse("cccccccc-0000-0000-0000-000000000003")

	fake := &fakeEventRepository{
		isCreatorOfEventWithParticipantFunc: func(creatorID, userID string) (bool, error) {
			return false, nil
		},
	}
	router := newSelfOrEventCreatorRouter(bruno, fake)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/"+carla.String(), nil)
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusForbidden, w.Code)
	body := jsonBody(t, w)
	assert.Equal(t, "FORBIDDEN", body["error"])
	assert.NotEmpty(t, body["message"])
	_, hasCode := body["code"]
	assert.False(t, hasCode, "form B never carries a code")
}

func TestRequireSelfOrEventCreator_RejectsCreatorWithoutSharedEvent(t *testing.T) {
	// TS-18: Ana (creator) consults Diego, who does not participate in her events.
	ana := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001")
	diego := uuid.MustParse("dddddddd-0000-0000-0000-000000000004")

	fake := &fakeEventRepository{
		isCreatorOfEventWithParticipantFunc: func(creatorID, userID string) (bool, error) {
			return false, nil
		},
	}
	router := newSelfOrEventCreatorRouter(ana, fake)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/"+diego.String(), nil)
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusForbidden, w.Code)
	assert.Equal(t, "FORBIDDEN", jsonBody(t, w)["error"])
}

func TestRequireSelfOrEventCreator_NonexistentUserAlsoForbidden(t *testing.T) {
	// TS-19: a third party queries a well-formed but nonexistent user_id -> 403, not 404.
	bruno := uuid.MustParse("bbbbbbbb-0000-0000-0000-000000000002")

	fake := &fakeEventRepository{
		isCreatorOfEventWithParticipantFunc: func(creatorID, userID string) (bool, error) {
			return false, nil
		},
	}
	router := newSelfOrEventCreatorRouter(bruno, fake)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/12345678-1234-1234-1234-123456789abc", nil)
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusForbidden, w.Code)
	assert.Equal(t, "FORBIDDEN", jsonBody(t, w)["error"])
}

func TestRequireSelfOrEventCreator_InvalidUserIDFormat(t *testing.T) {
	// TS-20: user_id is not a UUID -> 400, repo must not be called.
	bruno := uuid.MustParse("bbbbbbbb-0000-0000-0000-000000000002")

	fake := &fakeEventRepository{
		isCreatorOfEventWithParticipantFunc: func(creatorID, userID string) (bool, error) {
			t.Fatal("unexpected call")
			return false, nil
		},
	}
	router := newSelfOrEventCreatorRouter(bruno, fake)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/no-es-un-uuid", nil)
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusBadRequest, w.Code)
	body := jsonBody(t, w)
	assert.Equal(t, "BAD_REQUEST", body["error"])
	assert.NotEmpty(t, body["message"])
}

func TestRequireSelfOrEventCreator_PermissionCheckFails(t *testing.T) {
	// TS-21: the permission query itself fails -> 500, raw error not exposed.
	ana := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001")
	bruno := uuid.MustParse("bbbbbbbb-0000-0000-0000-000000000002")

	fake := &fakeEventRepository{
		isCreatorOfEventWithParticipantFunc: func(creatorID, userID string) (bool, error) {
			return false, errors.New("db down")
		},
	}
	router := newSelfOrEventCreatorRouter(ana, fake)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/"+bruno.String(), nil)
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	body := jsonBody(t, w)
	assert.Equal(t, "INTERNAL_ERROR", body["error"])
	message, _ := body["message"].(string)
	assert.NotContains(t, message, "db down")
}

func TestRequireSelfOrEventCreator_NoUserIDInContext(t *testing.T) {
	// TS-22: no prior middleware set user_id -> 401.
	fake := &fakeEventRepository{
		isCreatorOfEventWithParticipantFunc: func(creatorID, userID string) (bool, error) {
			t.Fatal("unexpected call")
			return false, nil
		},
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/api/v1/users/:user_id",
		RequireSelfOrEventCreator(fake),
		func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/bbbbbbbb-0000-0000-0000-000000000002", nil)
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Equal(t, "UNAUTHORIZED", jsonBody(t, w)["error"])
}

func TestRequireSelfOrEventCreator_NoToken_RealChain(t *testing.T) {
	// TS-23: real JWTAuthMiddleware chain, no Authorization header -> 401.
	fake := &fakeEventRepository{
		isCreatorOfEventWithParticipantFunc: func(creatorID, userID string) (bool, error) {
			t.Fatal("unexpected call")
			return false, nil
		},
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/api/v1/users/:user_id",
		JWTAuthMiddleware(),
		RequireSelfOrEventCreator(fake),
		func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/bbbbbbbb-0000-0000-0000-000000000002", nil)
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusUnauthorized, w.Code)
	body := jsonBody(t, w)
	assert.Equal(t, "UNAUTHORIZED", body["error"])
	assert.Equal(t, "Missing Authorization header", body["message"])
}

func TestRequireSelfOrEventCreator_ValidTokenOfThirdParty_RealChain(t *testing.T) {
	// TS-24: real JWTAuthMiddleware chain, valid token of an unrelated user -> 403.
	bruno := uuid.MustParse("bbbbbbbb-0000-0000-0000-000000000002")
	carla := uuid.MustParse("cccccccc-0000-0000-0000-000000000003")

	fake := &fakeEventRepository{
		isCreatorOfEventWithParticipantFunc: func(creatorID, userID string) (bool, error) {
			return false, nil
		},
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/api/v1/users/:user_id",
		JWTAuthMiddleware(),
		RequireSelfOrEventCreator(fake),
		func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })

	token, err := GenerateToken(bruno, "bruno@test.com", participant.RoleParticipant)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/"+carla.String(), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusForbidden, w.Code)
	assert.Equal(t, "FORBIDDEN", jsonBody(t, w)["error"])
}
