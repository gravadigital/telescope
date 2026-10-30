package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLoad_ReadsJWTSecretWithoutDefault(t *testing.T) {
	t.Setenv("JWT_SECRET", "")
	assert.Empty(t, Load().Auth.JWTSecret, "JWT_SECRET must have no default")

	t.Setenv("JWT_SECRET", "s3cret")
	assert.Equal(t, "s3cret", Load().Auth.JWTSecret)
}

func TestValidate_RequiresJWTSecret(t *testing.T) {
	cfg := &Config{}
	err := cfg.Validate()
	if assert.Error(t, err) {
		assert.Contains(t, err.Error(), "JWT_SECRET")
	}

	cfg.Auth.JWTSecret = "s3cret"
	assert.NoError(t, cfg.Validate())
}
