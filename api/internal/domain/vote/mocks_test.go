package vote

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/domain/common"
)

// fakeAttachment implements common.AttachmentInterface for tests.
type fakeAttachment struct {
	id            uuid.UUID
	originalName  string
	participantID uuid.UUID
}

func (a *fakeAttachment) GetID() uuid.UUID              { return a.id }
func (a *fakeAttachment) GetOriginalName() string        { return a.originalName }
func (a *fakeAttachment) GetParticipantID() uuid.UUID    { return a.participantID }

// fakeUser implements common.UserInterface for tests.
type fakeUser struct {
	id   uuid.UUID
	name string
}

func (u *fakeUser) GetID() uuid.UUID   { return u.id }
func (u *fakeUser) GetName() string    { return u.name }

// fakeVoteRepository is an in-memory implementation of VoteRepository.
type fakeVoteRepository struct {
	votes             []*Vote
	assignments       []*Assignment
	createVoteErr     error
	getByEventIDErr   error
	getAssignmentsErr error
	getByVoterIDErr   error
	updateAssignErr   error
}

func newFakeVoteRepository() *fakeVoteRepository {
	return &fakeVoteRepository{}
}

func (r *fakeVoteRepository) Create(v *Vote) error {
	if r.createVoteErr != nil {
		return r.createVoteErr
	}
	r.votes = append(r.votes, v)
	return nil
}

func (r *fakeVoteRepository) GetByID(id string) (*Vote, error) {
	for _, v := range r.votes {
		if v.ID.String() == id {
			return v, nil
		}
	}
	return nil, fmt.Errorf("vote not found: %s", id)
}

func (r *fakeVoteRepository) GetByEventID(eventID string) ([]*Vote, error) {
	if r.getByEventIDErr != nil {
		return nil, r.getByEventIDErr
	}
	var out []*Vote
	for _, v := range r.votes {
		if v.EventID.String() == eventID {
			out = append(out, v)
		}
	}
	return out, nil
}

func (r *fakeVoteRepository) GetByVoterID(voterID string) ([]*Vote, error) {
	if r.getByVoterIDErr != nil {
		return nil, r.getByVoterIDErr
	}
	var out []*Vote
	for _, v := range r.votes {
		if v.VoterID.String() == voterID {
			out = append(out, v)
		}
	}
	return out, nil
}

func (r *fakeVoteRepository) GetAssignmentsByEventID(eventID string) ([]*Assignment, error) {
	if r.getAssignmentsErr != nil {
		return nil, r.getAssignmentsErr
	}
	var out []*Assignment
	for _, a := range r.assignments {
		if a.EventID.String() == eventID {
			out = append(out, a)
		}
	}
	return out, nil
}

func (r *fakeVoteRepository) CreateAssignment(a *Assignment) error {
	r.assignments = append(r.assignments, a)
	return nil
}

func (r *fakeVoteRepository) GetAssignmentByParticipant(eventID, participantID string) (*Assignment, error) {
	for _, a := range r.assignments {
		if a.EventID.String() == eventID && a.ParticipantID.String() == participantID {
			return a, nil
		}
	}
	return nil, fmt.Errorf("assignment not found")
}

func (r *fakeVoteRepository) UpdateAssignment(a *Assignment) error {
	if r.updateAssignErr != nil {
		return r.updateAssignErr
	}
	for i, existing := range r.assignments {
		if existing.ID == a.ID {
			r.assignments[i] = a
			return nil
		}
	}
	return fmt.Errorf("assignment not found")
}

// fakeAttachmentRepository is an in-memory implementation of AttachmentRepository.
type fakeAttachmentRepository struct {
	attachments map[uuid.UUID]*fakeAttachment
	byEvent     map[uuid.UUID][]uuid.UUID
	getByIDErr  error
}

func newFakeAttachmentRepository() *fakeAttachmentRepository {
	return &fakeAttachmentRepository{
		attachments: make(map[uuid.UUID]*fakeAttachment),
		byEvent:     make(map[uuid.UUID][]uuid.UUID),
	}
}

func (r *fakeAttachmentRepository) add(eventID uuid.UUID, a *fakeAttachment) {
	r.attachments[a.id] = a
	r.byEvent[eventID] = append(r.byEvent[eventID], a.id)
}

func (r *fakeAttachmentRepository) GetByID(id string) (common.AttachmentInterface, error) {
	if r.getByIDErr != nil {
		return nil, r.getByIDErr
	}
	parsed, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	a, ok := r.attachments[parsed]
	if !ok {
		return nil, fmt.Errorf("attachment not found: %s", id)
	}
	return a, nil
}

func (r *fakeAttachmentRepository) GetByEventID(eventID string) ([]common.AttachmentInterface, error) {
	parsed, err := uuid.Parse(eventID)
	if err != nil {
		return nil, err
	}
	var out []common.AttachmentInterface
	for _, id := range r.byEvent[parsed] {
		out = append(out, r.attachments[id])
	}
	return out, nil
}

// fakeUserRepository is an in-memory implementation of UserRepository.
type fakeUserRepository struct {
	users map[uuid.UUID]*fakeUser
}

func newFakeUserRepository() *fakeUserRepository {
	return &fakeUserRepository{users: make(map[uuid.UUID]*fakeUser)}
}

func (r *fakeUserRepository) GetByID(id string) (common.UserInterface, error) {
	parsed, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	u, ok := r.users[parsed]
	if !ok {
		return nil, fmt.Errorf("user not found: %s", id)
	}
	return u, nil
}
