package handlers

import (
	"os"
	"testing"

	"github.com/gravadigital/telescopio-api/internal/middleware/auth"
)

// TestMain sets the JWT secret that main sets in production: the auth package has no default.
func TestMain(m *testing.M) {
	if err := auth.SetSecret("handlers-test-secret"); err != nil {
		panic(err)
	}
	os.Exit(m.Run())
}
