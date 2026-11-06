package event

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCoverColors_CanonicalOrder(t *testing.T) {
	want := []CoverColor{
		"lavender", "periwinkle", "sky", "ice", "aqua", "mint", "pistachio", "lemon",
		"butter", "peach", "coral", "rose", "pink", "lilac", "sand", "mist",
	}
	assert.Equal(t, want, CoverColors())
}

func TestCoverColors_ReturnsACopy(t *testing.T) {
	first := CoverColors()
	require.Len(t, first, 16)
	first[0] = "tampered"

	assert.Equal(t, CoverColor("lavender"), CoverColors()[0])
}

func TestCoverColor_IsValid(t *testing.T) {
	tests := []struct {
		name  string
		color CoverColor
		want  bool
	}{
		{"palette color", "mint", true},
		{"default", DefaultCoverColor, true},
		{"last of the palette", "mist", true},
		{"outside the palette", "red", false},
		{"empty", "", false},
		{"hex", "#ff0000", false},
		{"wrong case", "Mint", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, tt.color.IsValid())
		})
	}
}

func TestEveryPaletteColorIsValid(t *testing.T) {
	for _, c := range CoverColors() {
		assert.True(t, c.IsValid(), string(c))
	}
}

func TestNewEvent_UsesTheDefaultCoverColor(t *testing.T) {
	e := NewEvent("Event", "desc", uuid.New(), time.Now(), time.Now().AddDate(0, 0, 5), "org")

	assert.Equal(t, DefaultCoverColor, e.CoverColor)
	assert.Equal(t, CoverColor("lavender"), e.CoverColor)
}
