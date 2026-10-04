package vote

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestAssignment_PositionOf(t *testing.T) {
	a1, a2, a3 := uuid.New(), uuid.New(), uuid.New()
	a := NewAssignment(uuid.New(), uuid.New(), []uuid.UUID{a2, a3})

	pos, ok := a.PositionOf(a3)
	assert.True(t, ok)
	assert.Equal(t, 2, pos)

	pos, ok = a.PositionOf(a2)
	assert.True(t, ok)
	assert.Equal(t, 1, pos)

	pos, ok = a.PositionOf(a1)
	assert.False(t, ok)
	assert.Equal(t, 0, pos)
}
