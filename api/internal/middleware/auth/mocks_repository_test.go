package auth

import "github.com/gravadigital/telescopio-api/internal/storage/postgres"

// fakeEventRepository embeds the EventRepository interface so tests only need
// to override the method(s) the middleware under test actually calls. Any
// other method call panics on the nil embedded interface, which surfaces an
// unexpected call instead of silently returning a zero value.
type fakeEventRepository struct {
	postgres.EventRepository
	isCreatorOfEventWithParticipantFunc func(creatorID, userID string) (bool, error)
}

func (f *fakeEventRepository) IsCreatorOfEventWithParticipant(creatorID, userID string) (bool, error) {
	return f.isCreatorOfEventWithParticipantFunc(creatorID, userID)
}
