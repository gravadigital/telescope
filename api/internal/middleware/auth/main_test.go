package auth

import (
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"github.com/gravadigital/telescopio-api/internal/domain/participant"
)

const testSecret = "auth-test-secret"

// TestMain sets the JWT secret that main sets in production: the package has no default.
func TestMain(m *testing.M) {
	if err := SetSecret(testSecret); err != nil {
		panic(err)
	}
	os.Exit(m.Run())
}

func TestSetSecret_RejectsEmpty(t *testing.T) {
	assert.ErrorIs(t, SetSecret(""), errNoSecret)
	assert.Equal(t, []byte(testSecret), jwtSecret, "a rejected secret must not replace the current one")
}

func TestTokens_FailWithoutSecret(t *testing.T) {
	jwtSecret = nil
	t.Cleanup(func() { jwtSecret = []byte(testSecret) })

	_, err := GenerateToken(uuid.New(), "ana@example.com", participant.RoleParticipant)
	assert.ErrorIs(t, err, errNoSecret, "no token may be signed without a configured secret")

	token := signed(t, jwt.SigningMethodHS256, []byte("any-key"), time.Now().Add(time.Hour))
	_, err = ValidateToken(token)
	assert.ErrorIs(t, err, errNoSecret, "no token may be accepted without a configured secret")
}
