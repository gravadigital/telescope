package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/gravadigital/telescopio-api/internal/domain/participant"
	"github.com/gravadigital/telescopio-api/internal/storage/postgres"
)

// ErrInvalidGoogleToken is returned when the Google token is invalid or expired.
var ErrInvalidGoogleToken = errors.New("invalid or expired Google token")

// ErrGoogleAPIUnavailable is returned when the Google API cannot be reached.
var ErrGoogleAPIUnavailable = errors.New("Google API unavailable")

// GoogleProfile holds the user profile extracted from a validated Google token.
type GoogleProfile struct {
	GoogleID string
	Email    string
	Name     string
}

// UserResolution holds the result of resolving a Google profile against the local user store.
type UserResolution struct {
	Status string // "new_user" or "existing_user"
	User   *participant.User
}

// ErrGoogleAuthNotConfigured is returned when GOOGLE_CLIENT_ID is not set, so
// there is no client to check tokens against.
var ErrGoogleAuthNotConfigured = errors.New("Google login is not configured")

// googleTokenInfoResponse maps the relevant fields from the Google tokeninfo endpoint.
type googleTokenInfoResponse struct {
	Aud           string `json:"aud"`
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Error         string `json:"error"`
}

// googleUserInfoResponse maps the relevant fields from the Google userinfo endpoint.
type googleUserInfoResponse struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Error string `json:"error"`
}

// googleAccessTokenVerifier validates Google access tokens obtained by the web
// through the implicit flow. The URLs are fields so tests can point them to a
// fake server.
type googleAccessTokenVerifier struct {
	clientID     string
	tokenInfoURL string
	userInfoURL  string
	client       *http.Client
}

func newGoogleAccessTokenVerifier(clientID string) *googleAccessTokenVerifier {
	return &googleAccessTokenVerifier{
		clientID:     clientID,
		tokenInfoURL: "https://oauth2.googleapis.com/tokeninfo",
		userInfoURL:  "https://www.googleapis.com/oauth2/v3/userinfo",
		client:       &http.Client{Timeout: 10 * time.Second},
	}
}

// verify checks with tokeninfo that the token was issued for our client ID and
// that the email is verified, then fetches the profile from userinfo.
//
// The audience check is what stops a token issued to any other Google app from
// being replayed here to log in as its owner. The email check matters because
// resolveUser links Google accounts to existing users by email.
//
// Returns ErrInvalidGoogleToken for bad, expired or foreign tokens,
// ErrGoogleAPIUnavailable for network errors and ErrGoogleAuthNotConfigured
// when there is no client ID.
func (v *googleAccessTokenVerifier) verify(accessToken string) (*GoogleProfile, error) {
	if v.clientID == "" {
		return nil, ErrGoogleAuthNotConfigured
	}

	var info googleTokenInfoResponse
	status, err := v.getJSON(v.tokenInfoURL+"?access_token="+url.QueryEscape(accessToken), "", &info)
	if err != nil {
		return nil, err
	}
	if status != http.StatusOK || info.Error != "" {
		return nil, ErrInvalidGoogleToken
	}
	if info.Aud != v.clientID {
		return nil, fmt.Errorf("%w: token issued for another client", ErrInvalidGoogleToken)
	}
	if info.EmailVerified != "true" {
		return nil, fmt.Errorf("%w: email not verified", ErrInvalidGoogleToken)
	}

	var profile googleUserInfoResponse
	status, err = v.getJSON(v.userInfoURL, accessToken, &profile)
	if err != nil {
		return nil, err
	}
	if status != http.StatusOK || profile.Error != "" {
		return nil, ErrInvalidGoogleToken
	}
	if profile.Sub == "" || profile.Email == "" || profile.Sub != info.Sub {
		return nil, ErrInvalidGoogleToken
	}

	return &GoogleProfile{
		GoogleID: profile.Sub,
		Email:    profile.Email,
		Name:     profile.Name,
	}, nil
}

// getJSON performs a GET, optionally with a bearer token, and decodes the body
// into out. Transport and decoding failures are wrapped in ErrGoogleAPIUnavailable.
func (v *googleAccessTokenVerifier) getJSON(endpoint, bearer string, out interface{}) (int, error) {
	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return 0, fmt.Errorf("%w: %v", ErrGoogleAPIUnavailable, err)
	}
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}

	resp, err := v.client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("%w: %v", ErrGoogleAPIUnavailable, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("%w: failed to read response body: %v", ErrGoogleAPIUnavailable, err)
	}
	if err := json.Unmarshal(body, out); err != nil {
		return 0, fmt.Errorf("%w: failed to parse response: %v", ErrGoogleAPIUnavailable, err)
	}
	return resp.StatusCode, nil
}

// resolveUser looks up a user by google_id then by email.
// If found by email without google_id, it links the google_id automatically.
// Returns UserResolution with Status "existing_user" or "new_user".
func resolveUser(profile *GoogleProfile, userRepo postgres.UserRepository) (*UserResolution, error) {
	// 1. Search by google_id
	user, err := userRepo.GetByGoogleID(profile.GoogleID)
	if err == nil {
		return &UserResolution{Status: "existing_user", User: user}, nil
	}
	if err.Error() != "user not found" {
		return nil, fmt.Errorf("failed to look up user by google_id: %w", err)
	}

	// 2. Search by email
	user, err = userRepo.GetByEmail(profile.Email)
	if err != nil {
		if err.Error() == "user not found" || err.Error() == "email cannot be empty" {
			return &UserResolution{Status: "new_user"}, nil
		}
		return nil, fmt.Errorf("failed to look up user by email: %w", err)
	}

	// Found by email without google_id — link automatically
	if user.GoogleID == nil {
		googleID := profile.GoogleID
		user.GoogleID = &googleID
		if err := userRepo.Update(user); err != nil {
			return nil, fmt.Errorf("failed to link google_id to existing user: %w", err)
		}
	}

	return &UserResolution{Status: "existing_user", User: user}, nil
}
