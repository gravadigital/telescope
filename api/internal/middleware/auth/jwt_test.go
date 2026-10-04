package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/gravadigital/telescopio-api/internal/domain/participant"
)

func probeRouter(mw gin.HandlerFunc) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/probe", mw, func(c *gin.Context) {
		_, hasID := c.Get("user_id")
		_, hasRole := c.Get("user_role")
		id, _ := c.Get("user_id")
		email, _ := c.Get("user_email")
		role, _ := c.Get("user_role")
		c.JSON(http.StatusOK, gin.H{"has_user": hasID, "has_role": hasRole, "user_id": id, "email": email, "role": role})
	})
	return r
}

func doProbe(r *gin.Engine, header string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/probe", nil)
	if header != "" {
		req.Header.Set("Authorization", header)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func signed(t *testing.T, method jwt.SigningMethod, key interface{}, exp time.Time) string {
	t.Helper()
	claims := &Claims{
		UserID: uuid.New().String(),
		Email:  "ana@example.com",
		Role:   participant.RoleOrganizer,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(exp),
		},
	}
	s, err := jwt.NewWithClaims(method, claims).SignedString(key)
	require.NoError(t, err)
	return s
}

func TestOptionalJWTAuthMiddleware_NoHeaderIsAnonymous(t *testing.T) {
	w := doProbe(probeRouter(OptionalJWTAuthMiddleware()), "")
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"has_user":false`)
}

func TestOptionalJWTAuthMiddleware_ValidTokenIdentifies(t *testing.T) {
	uid := uuid.New()
	tok, err := GenerateToken(uid, "ana@example.com", participant.RoleOrganizer)
	require.NoError(t, err)

	w := doProbe(probeRouter(OptionalJWTAuthMiddleware()), "Bearer "+tok)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"has_user":true`)
	assert.Contains(t, w.Body.String(), uid.String())
	assert.Contains(t, w.Body.String(), `"email":"ana@example.com"`)
	assert.Contains(t, w.Body.String(), `"role":"organizer"`)
}

func TestOptionalJWTAuthMiddleware_InvalidCredentialsAreAnonymous(t *testing.T) {
	valid, err := GenerateToken(uuid.New(), "ana@example.com", participant.RoleOrganizer)
	require.NoError(t, err)

	cases := map[string]string{
		"wrong signature": "Bearer " + signed(t, jwt.SigningMethodHS256, []byte("otro-secreto"), time.Now().Add(time.Hour)),
		"expired":         "Bearer " + signed(t, jwt.SigningMethodHS256, jwtSecret, time.Now().Add(-time.Hour)),
		"alg none":        "Bearer " + signed(t, jwt.SigningMethodNone, jwt.UnsafeAllowNoneSignatureType, time.Now().Add(time.Hour)),
		"wrong scheme":    "Token abc",
		"empty token":     "Bearer ",
		"not a jwt":       "Bearer not-a-jwt",
		"lowercase":       "bearer " + valid,
	}
	for name, header := range cases {
		t.Run(name, func(t *testing.T) {
			w := doProbe(probeRouter(OptionalJWTAuthMiddleware()), header)
			assert.Equal(t, http.StatusOK, w.Code)
			assert.Contains(t, w.Body.String(), `"has_user":false`)
			assert.Contains(t, w.Body.String(), `"has_role":false`)
		})
	}
}

func TestJWTAuthMiddleware_StillRejects(t *testing.T) {
	r := probeRouter(JWTAuthMiddleware())

	w := doProbe(r, "")
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.JSONEq(t, `{"error":"UNAUTHORIZED","message":"Missing Authorization header"}`, w.Body.String())

	w = doProbe(r, "Token abc")
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid Authorization header format")
}
