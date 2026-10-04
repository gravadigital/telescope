package notification

import (
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fakeWriter struct {
	batches [][]*Notification
	upserts [][2]string
	err     error
}

func (f *fakeWriter) CreateBatch(n []*Notification) error {
	f.batches = append(f.batches, n)
	return f.err
}

func (f *fakeWriter) UpsertParticipantRegistered(r, e string) error {
	f.upserts = append(f.upserts, [2]string{r, e})
	return f.err
}

func TestSend_BatchWithPerRecipientData(t *testing.T) { // TS-19
	w := &fakeWriter{}
	svc := NewService(w)
	ev, p1, p2 := uuid.New(), uuid.New(), uuid.New()

	err := svc.Send(ev, TypeStageChanged, []uuid.UUID{p1, p2}, func(r uuid.UUID) Data {
		return Data{"stage": "voting", "can_vote": r == p1}
	})

	require.NoError(t, err)
	require.Len(t, w.batches, 1)
	got := w.batches[0]
	require.Len(t, got, 2)
	assert.Equal(t, p1, got[0].RecipientID)
	assert.Equal(t, ev, got[0].EventID)
	assert.Equal(t, TypeStageChanged, got[0].Type)
	assert.Equal(t, Data{"stage": "voting", "can_vote": true}, got[0].Data)
	assert.Equal(t, Data{"stage": "voting", "can_vote": false}, got[1].Data)
	assert.Nil(t, got[0].ReadAt)
}

func TestSend_NoRecipients(t *testing.T) { // TS-20
	w := &fakeWriter{}
	require.NoError(t, NewService(w).Send(uuid.New(), TypeEventCancelled, nil, nil))
	assert.Empty(t, w.batches)
}

func TestSend_NilDataStoredAsEmptyObject(t *testing.T) { // TS-21
	w := &fakeWriter{}
	require.NoError(t, NewService(w).Send(uuid.New(), TypeEventCancelled, []uuid.UUID{uuid.New()}, nil))
	v, err := w.batches[0][0].Data.Value()
	require.NoError(t, err)
	assert.Equal(t, "{}", v)
}

func TestSend_WrapsWriterError(t *testing.T) { // TS-22
	boom := errors.New("boom")
	w := &fakeWriter{err: boom}
	err := NewService(w).Send(uuid.New(), TypeEventCancelled, []uuid.UUID{uuid.New()}, nil)
	assert.ErrorIs(t, err, boom)
}

func TestParticipantRegistered(t *testing.T) {
	w := &fakeWriter{}
	a, e := uuid.New(), uuid.New()
	require.NoError(t, NewService(w).ParticipantRegistered(a, e))
	assert.Equal(t, [][2]string{{a.String(), e.String()}}, w.upserts)

	boom := errors.New("boom")
	assert.ErrorIs(t, NewService(&fakeWriter{err: boom}).ParticipantRegistered(a, e), boom)
}
