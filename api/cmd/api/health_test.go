package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func getHealth(t *testing.T, h gin.HandlerFunc) (int, map[string]string) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/health", h)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/health", nil))

	var body map[string]string
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	return w.Code, body
}

func TestHealth_ReportsTheVersionTheBinaryWasBuiltWith(t *testing.T) {
	code, body := getHealth(t, healthHandler("0.2.0", func() error { return nil }))

	assert.Equal(t, http.StatusOK, code)
	assert.Equal(t, "ok", body["status"])
	assert.Equal(t, "0.2.0", body["version"], "must not be a hardcoded value")
	assert.Equal(t, "connected", body["database"])
}

func TestHealth_DatabaseDownIs503WithTheReason(t *testing.T) {
	code, body := getHealth(t, healthHandler("0.2.0", func() error {
		return errors.New("database ping failed")
	}))

	assert.Equal(t, http.StatusServiceUnavailable, code)
	assert.Equal(t, "error", body["status"])
	assert.Equal(t, "database ping failed", body["error"])
	assert.Equal(t, "0.2.0", body["version"], "the version helps diagnose a failing deploy too")
}
