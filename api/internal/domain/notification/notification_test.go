package notification

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDataValue(t *testing.T) {
	v, err := Data{"count": 3}.Value()
	require.NoError(t, err)
	assert.Equal(t, `{"count":3}`, v)

	v, err = Data(nil).Value()
	require.NoError(t, err)
	assert.Equal(t, "{}", v)
}

func TestDataScan(t *testing.T) {
	var d Data
	require.NoError(t, d.Scan([]byte(`{"count":3}`)))
	assert.Equal(t, Data{"count": float64(3)}, d)

	require.NoError(t, d.Scan(`{"a":"b"}`))
	assert.Equal(t, Data{"a": "b"}, d)

	require.NoError(t, d.Scan(nil))
	assert.Equal(t, Data{}, d)

	assert.Error(t, d.Scan(42))
}

func TestTypeScanValue(t *testing.T) {
	var ty Type
	require.NoError(t, ty.Scan("stage_changed"))
	assert.Equal(t, TypeStageChanged, ty)
	require.NoError(t, ty.Scan([]byte("event_paused")))
	assert.Equal(t, TypeEventPaused, ty)
	assert.Error(t, ty.Scan(1))

	v, err := TypeVoteReminder.Value()
	require.NoError(t, err)
	assert.Equal(t, "vote_reminder", v)
}
