package handlers

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testGoogleClientID = "our-app.apps.googleusercontent.com"

// fakeGoogle stands in for Google's tokeninfo and userinfo endpoints.
type fakeGoogle struct {
	tokenInfoStatus int
	tokenInfoBody   string
	userInfoStatus  int
	userInfoBody    string

	userInfoCalled bool
	receivedToken  string
}

func (f *fakeGoogle) server(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/tokeninfo", func(w http.ResponseWriter, r *http.Request) {
		f.receivedToken = r.URL.Query().Get("access_token")
		w.WriteHeader(f.tokenInfoStatus)
		_, _ = w.Write([]byte(f.tokenInfoBody))
	})
	mux.HandleFunc("/userinfo", func(w http.ResponseWriter, r *http.Request) {
		f.userInfoCalled = true
		w.WriteHeader(f.userInfoStatus)
		_, _ = w.Write([]byte(f.userInfoBody))
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

func newTestVerifier(srv *httptest.Server, clientID string) *googleAccessTokenVerifier {
	v := newGoogleAccessTokenVerifier(clientID)
	v.tokenInfoURL = srv.URL + "/tokeninfo"
	v.userInfoURL = srv.URL + "/userinfo"
	return v
}

func validFakeGoogle() *fakeGoogle {
	return &fakeGoogle{
		tokenInfoStatus: http.StatusOK,
		tokenInfoBody:   `{"aud":"` + testGoogleClientID + `","azp":"` + testGoogleClientID + `","sub":"g-1","email":"ana@example.com","email_verified":"true","expires_in":"3500"}`,
		userInfoStatus:  http.StatusOK,
		userInfoBody:    `{"sub":"g-1","email":"ana@example.com","name":"Ana Pérez","email_verified":true}`,
	}
}

func TestGoogleAccessTokenVerifier_AcceptsTokenIssuedForOurClient(t *testing.T) {
	g := validFakeGoogle()
	v := newTestVerifier(g.server(t), testGoogleClientID)

	profile, err := v.verify("good-token")
	require.NoError(t, err)
	assert.Equal(t, "good-token", g.receivedToken)
	assert.Equal(t, &GoogleProfile{GoogleID: "g-1", Email: "ana@example.com", Name: "Ana Pérez"}, profile)
}

func TestGoogleAccessTokenVerifier_RejectsTokenIssuedForAnotherClient(t *testing.T) {
	g := validFakeGoogle()
	g.tokenInfoBody = `{"aud":"other-app.apps.googleusercontent.com","azp":"other-app.apps.googleusercontent.com","sub":"g-1","email":"ana@example.com","email_verified":"true"}`
	v := newTestVerifier(g.server(t), testGoogleClientID)

	_, err := v.verify("stolen-token")
	assert.ErrorIs(t, err, ErrInvalidGoogleToken)
	assert.False(t, g.userInfoCalled, "a token for another client must be rejected before fetching the profile")
}

func TestGoogleAccessTokenVerifier_RejectsInvalidOrExpiredToken(t *testing.T) {
	g := validFakeGoogle()
	g.tokenInfoStatus = http.StatusBadRequest
	g.tokenInfoBody = `{"error":"invalid_token","error_description":"Invalid Value"}`
	v := newTestVerifier(g.server(t), testGoogleClientID)

	_, err := v.verify("expired-token")
	assert.ErrorIs(t, err, ErrInvalidGoogleToken)
}

func TestGoogleAccessTokenVerifier_RejectsUnverifiedEmail(t *testing.T) {
	// resolveUser links Google accounts to existing users by email, so an
	// unverified email would let someone take over an account they don't own.
	g := validFakeGoogle()
	g.tokenInfoBody = `{"aud":"` + testGoogleClientID + `","sub":"g-1","email":"ana@example.com","email_verified":"false"}`
	v := newTestVerifier(g.server(t), testGoogleClientID)

	_, err := v.verify("token")
	assert.ErrorIs(t, err, ErrInvalidGoogleToken)
}

func TestGoogleAccessTokenVerifier_RejectsProfileOfADifferentSubject(t *testing.T) {
	g := validFakeGoogle()
	g.userInfoBody = `{"sub":"g-other","email":"ana@example.com","name":"Ana","email_verified":true}`
	v := newTestVerifier(g.server(t), testGoogleClientID)

	_, err := v.verify("token")
	assert.ErrorIs(t, err, ErrInvalidGoogleToken)
}

func TestGoogleAccessTokenVerifier_FailsClosedWithoutClientID(t *testing.T) {
	g := validFakeGoogle()
	v := newTestVerifier(g.server(t), "")

	_, err := v.verify("token")
	assert.ErrorIs(t, err, ErrGoogleAuthNotConfigured)
	assert.False(t, errors.Is(err, ErrInvalidGoogleToken))
	assert.Empty(t, g.receivedToken, "without a client ID the token must not even be sent to Google")
}

func TestGoogleAccessTokenVerifier_ReportsGoogleUnavailable(t *testing.T) {
	g := validFakeGoogle()
	srv := g.server(t)
	v := newTestVerifier(srv, testGoogleClientID)
	srv.Close()

	_, err := v.verify("token")
	assert.ErrorIs(t, err, ErrGoogleAPIUnavailable)
}
