package handlers

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/domain/attachment"
	"github.com/gravadigital/telescopio-api/internal/domain/event"
	"github.com/gravadigital/telescopio-api/internal/domain/participant"
	"github.com/gravadigital/telescopio-api/internal/domain/vote"
	"github.com/gravadigital/telescopio-api/internal/storage/postgres"
	"gorm.io/gorm"
)

// Compile-time interface assertions: fail the build, not a test, if a mock
// drifts from the repository interfaces it stands in for.
var (
	_ postgres.EventRepository               = (*mockEventRepository)(nil)
	_ postgres.UserRepository                = (*mockUserRepository)(nil)
	_ postgres.AttachmentRepository          = (*mockAttachmentRepository)(nil)
	_ postgres.VoteRepository                = (*mockVoteRepository)(nil)
	_ postgres.VotingConfigurationRepository = (*mockVotingConfigurationRepository)(nil)
	_ postgres.VotingResultsRepository       = (*mockVotingResultsRepository)(nil)
	_ postgres.VoteDraftRepository           = (*mockVoteDraftRepository)(nil)
)

// ---------------------------------------------------------------------------
// mockEventRepository
// ---------------------------------------------------------------------------

type mockEventRepository struct {
	events            map[string]*event.Event
	byParticipant     map[string][]*event.Event
	getByIDErr        error
	updateStageErr    error
	addParticipantErr error
	removeErr         error
	cancelErr         error
	pauseErr          error
}

func newMockEventRepository() *mockEventRepository {
	return &mockEventRepository{
		events:        make(map[string]*event.Event),
		byParticipant: make(map[string][]*event.Event),
	}
}

func (m *mockEventRepository) addEvent(e *event.Event) {
	m.events[e.ID.String()] = e
}

func (m *mockEventRepository) Create(e *event.Event) error {
	m.events[e.ID.String()] = e
	return nil
}

func (m *mockEventRepository) GetByID(id string) (*event.Event, error) {
	if m.getByIDErr != nil {
		return nil, m.getByIDErr
	}
	e, ok := m.events[id]
	if !ok {
		return nil, fmt.Errorf("event not found: %s", id)
	}
	return e, nil
}

func (m *mockEventRepository) GetAll() ([]*event.Event, error) {
	var out []*event.Event
	for _, e := range m.events {
		out = append(out, e)
	}
	return out, nil
}

func (m *mockEventRepository) GetAllPaginated(params postgres.PaginationParams) (*postgres.PaginatedResult, error) {
	return &postgres.PaginatedResult{}, nil
}

func (m *mockEventRepository) GetByAuthor(authorID string) ([]*event.Event, error) {
	var out []*event.Event
	for _, e := range m.events {
		if e.AuthorID.String() == authorID {
			out = append(out, e)
		}
	}
	return out, nil
}

func (m *mockEventRepository) GetByParticipant(participantID string) ([]*event.Event, error) {
	return m.byParticipant[participantID], nil
}

func (m *mockEventRepository) GetUserParticipatingEvents(userID string) ([]*event.Event, error) {
	return m.byParticipant[userID], nil
}

func (m *mockEventRepository) Update(e *event.Event) error {
	m.events[e.ID.String()] = e
	return nil
}

func (m *mockEventRepository) Delete(id string) error {
	delete(m.events, id)
	return nil
}

func (m *mockEventRepository) UpdateStage(eventID string, stage event.Stage) error {
	if m.updateStageErr != nil {
		return m.updateStageErr
	}
	if e, ok := m.events[eventID]; ok {
		e.Stage = stage
	}
	return nil
}

func (m *mockEventRepository) UpdateStageWithEstimatedDate(eventID string, stage event.Stage, estimatedDate *time.Time) error {
	if e, ok := m.events[eventID]; ok {
		e.Stage = stage
	}
	return nil
}

func (m *mockEventRepository) UpdateEstimatedEndDate(eventID string, stage event.Stage, newDate time.Time) error {
	return nil
}

func (m *mockEventRepository) AddParticipant(eventID, userID string) error {
	return m.addParticipantErr
}

func (m *mockEventRepository) AddParticipantWithRole(eventID, userID string, role event.EventParticipantRole) error {
	return m.addParticipantErr
}

func (m *mockEventRepository) RemoveParticipant(eventID, userID string) error {
	return m.removeErr
}

func (m *mockEventRepository) GetParticipantRole(eventID, userID string) (*event.EventParticipantRole, error) {
	return nil, fmt.Errorf("not implemented")
}

func (m *mockEventRepository) IsEventCreator(eventID, userID string) (bool, error) {
	e, ok := m.events[eventID]
	if !ok {
		return false, fmt.Errorf("event not found")
	}
	return e.AuthorID.String() == userID, nil
}

func (m *mockEventRepository) IsEventParticipant(eventID, userID string) (bool, error) {
	for _, e := range m.byParticipant[userID] {
		if e.ID.String() == eventID {
			return true, nil
		}
	}
	return false, nil
}

func (m *mockEventRepository) CancelEvent(eventID string) error {
	if m.cancelErr != nil {
		return m.cancelErr
	}
	if e, ok := m.events[eventID]; ok {
		e.IsCancelled = true
	}
	return nil
}

func (m *mockEventRepository) PauseEvent(eventID string, paused bool) error {
	if m.pauseErr != nil {
		return m.pauseErr
	}
	if e, ok := m.events[eventID]; ok {
		e.IsPaused = paused
	}
	return nil
}

// ---------------------------------------------------------------------------
// mockUserRepository
// ---------------------------------------------------------------------------

type mockUserRepository struct {
	users              map[string]*participant.User
	byEmail            map[string]*participant.User
	eventParticipants  map[string][]*participant.UserWithEventRole
	resetTokenIndex    map[string]*participant.User
	getParticipantsErr error
	getByIDErr         error
	usernameExistsFn   func(username string) (bool, error)
}

func newMockUserRepository() *mockUserRepository {
	return &mockUserRepository{
		users:             make(map[string]*participant.User),
		byEmail:           make(map[string]*participant.User),
		eventParticipants: make(map[string][]*participant.UserWithEventRole),
		resetTokenIndex:   make(map[string]*participant.User),
	}
}

func (m *mockUserRepository) addUser(u *participant.User) {
	m.users[u.ID.String()] = u
	m.byEmail[u.Email] = u
}

func (m *mockUserRepository) setEventParticipants(eventID string, users []*participant.UserWithEventRole) {
	m.eventParticipants[eventID] = users
}

// Create mimics GORM's BeforeCreate hook (participant.User.BeforeCreate),
// which assigns a UUID when one hasn't been set. The real handler relies on
// that hook rather than generating the ID itself.
func (m *mockUserRepository) Create(u *participant.User) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	m.addUser(u)
	return nil
}

func (m *mockUserRepository) GetByID(id string) (*participant.User, error) {
	if m.getByIDErr != nil {
		return nil, m.getByIDErr
	}
	u, ok := m.users[id]
	if !ok {
		return nil, fmt.Errorf("user not found: %s", id)
	}
	return u, nil
}

// GetByEmail returns the exact error string "user not found" (no email
// suffix) to match PostgresUserRepository.GetByEmail's real behavior code
// like google_auth_service.go's resolveUser depends on via err.Error()
// string comparison rather than errors.Is - a mismatched mock message here
// would silently hide that fragility instead of exercising it.
func (m *mockUserRepository) GetByEmail(email string) (*participant.User, error) {
	u, ok := m.byEmail[email]
	if !ok {
		return nil, errors.New("user not found")
	}
	return u, nil
}

func (m *mockUserRepository) GetByGoogleID(googleID string) (*participant.User, error) {
	for _, u := range m.users {
		if u.GoogleID != nil && *u.GoogleID == googleID {
			return u, nil
		}
	}
	return nil, fmt.Errorf("user not found")
}

func (m *mockUserRepository) GetAll() ([]*participant.User, error) {
	var out []*participant.User
	for _, u := range m.users {
		out = append(out, u)
	}
	return out, nil
}

func (m *mockUserRepository) GetAllPaginated(params postgres.PaginationParams) (*postgres.PaginatedResult, error) {
	return &postgres.PaginatedResult{}, nil
}

func (m *mockUserRepository) Update(u *participant.User) error {
	m.addUser(u)
	return nil
}

func (m *mockUserRepository) Delete(id string) error {
	delete(m.users, id)
	return nil
}

func (m *mockUserRepository) GetEventParticipants(eventID string) ([]*participant.UserWithEventRole, error) {
	if m.getParticipantsErr != nil {
		return nil, m.getParticipantsErr
	}
	return m.eventParticipants[eventID], nil
}

func (m *mockUserRepository) GetEventParticipantsPaginated(eventID string, params postgres.PaginationParams) (*postgres.PaginatedResult, error) {
	return &postgres.PaginatedResult{}, nil
}

func (m *mockUserRepository) UsernameExists(username string) (bool, error) {
	if m.usernameExistsFn != nil {
		return m.usernameExistsFn(username)
	}
	return false, nil
}

func (m *mockUserRepository) GetByResetToken(token string) (*participant.User, error) {
	u, ok := m.resetTokenIndex[token]
	if !ok {
		return nil, fmt.Errorf("no user with reset token: %s", token)
	}
	return u, nil
}

func (m *mockUserRepository) SavePasswordResetToken(u *participant.User) error {
	m.addUser(u)
	if u.PasswordResetToken != nil {
		m.resetTokenIndex[*u.PasswordResetToken] = u
	}
	return nil
}

// ClearPasswordResetToken mirrors the real repository: despite the name, it
// also persists whatever PasswordHash is currently set on the user (that's
// how a password reset is actually saved - see
// PostgresUserRepository.ClearPasswordResetToken).
func (m *mockUserRepository) ClearPasswordResetToken(u *participant.User) error {
	if u.PasswordResetToken != nil {
		delete(m.resetTokenIndex, *u.PasswordResetToken)
	}
	m.addUser(u)
	return nil
}

// ---------------------------------------------------------------------------
// mockAttachmentRepository
// ---------------------------------------------------------------------------

type mockAttachmentRepository struct {
	attachments   map[string]*attachment.Attachment
	byEvent       map[string][]*attachment.Attachment
	getByEventErr error
	createErr     error
}

func newMockAttachmentRepository() *mockAttachmentRepository {
	return &mockAttachmentRepository{
		attachments: make(map[string]*attachment.Attachment),
		byEvent:     make(map[string][]*attachment.Attachment),
	}
}

func (m *mockAttachmentRepository) addAttachment(a *attachment.Attachment) {
	m.attachments[a.ID.String()] = a
	m.byEvent[a.EventID.String()] = append(m.byEvent[a.EventID.String()], a)
}

func (m *mockAttachmentRepository) Create(a *attachment.Attachment) error {
	if m.createErr != nil {
		return m.createErr
	}
	m.addAttachment(a)
	return nil
}

func (m *mockAttachmentRepository) GetByID(id string) (*attachment.Attachment, error) {
	a, ok := m.attachments[id]
	if !ok {
		return nil, fmt.Errorf("attachment not found: %s", id)
	}
	return a, nil
}

func (m *mockAttachmentRepository) GetByEventID(eventID string) ([]*attachment.Attachment, error) {
	if m.getByEventErr != nil {
		return nil, m.getByEventErr
	}
	return m.byEvent[eventID], nil
}

func (m *mockAttachmentRepository) GetByEventIDPaginated(eventID string, params postgres.PaginationParams) (*postgres.PaginatedResult, error) {
	return &postgres.PaginatedResult{}, nil
}

func (m *mockAttachmentRepository) GetByParticipantID(participantID string) ([]*attachment.Attachment, error) {
	var out []*attachment.Attachment
	for _, a := range m.attachments {
		if a.ParticipantID.String() == participantID {
			out = append(out, a)
		}
	}
	return out, nil
}

func (m *mockAttachmentRepository) Update(a *attachment.Attachment) error {
	m.addAttachment(a)
	return nil
}

func (m *mockAttachmentRepository) UpdatePartial(id string, updates map[string]interface{}) error {
	return nil
}

func (m *mockAttachmentRepository) Delete(id string) error {
	delete(m.attachments, id)
	return nil
}

func (m *mockAttachmentRepository) UpdateVoteCount(id string, count int) error {
	if a, ok := m.attachments[id]; ok {
		a.VoteCount = count
	}
	return nil
}

// ---------------------------------------------------------------------------
// mockVoteRepository
// ---------------------------------------------------------------------------

type mockVoteRepository struct {
	votes                  []*vote.Vote
	assignments            map[string]*vote.Assignment // keyed by ID string
	getByEventIDErr        error
	getAssignmentsErr      error
	createAssignmentErr    error
	updateAssignmentErr    error
	getAssignmentByPartErr error
}

func newMockVoteRepository() *mockVoteRepository {
	return &mockVoteRepository{
		assignments: make(map[string]*vote.Assignment),
	}
}

func (m *mockVoteRepository) Create(v *vote.Vote) error {
	m.votes = append(m.votes, v)
	return nil
}

func (m *mockVoteRepository) GetByID(id string) (*vote.Vote, error) {
	for _, v := range m.votes {
		if v.ID.String() == id {
			return v, nil
		}
	}
	return nil, fmt.Errorf("vote not found")
}

func (m *mockVoteRepository) GetByEventID(eventID string) ([]*vote.Vote, error) {
	if m.getByEventIDErr != nil {
		return nil, m.getByEventIDErr
	}
	var out []*vote.Vote
	for _, v := range m.votes {
		if v.EventID.String() == eventID {
			out = append(out, v)
		}
	}
	return out, nil
}

func (m *mockVoteRepository) GetByEventIDPaginated(eventID string, params postgres.PaginationParams) (*postgres.PaginatedResult, error) {
	return &postgres.PaginatedResult{}, nil
}

func (m *mockVoteRepository) GetByVoterID(voterID string) ([]*vote.Vote, error) {
	var out []*vote.Vote
	for _, v := range m.votes {
		if v.VoterID.String() == voterID {
			out = append(out, v)
		}
	}
	return out, nil
}

func (m *mockVoteRepository) GetByVoterIDPaginated(voterID string, params postgres.PaginationParams) (*postgres.PaginatedResult, error) {
	return &postgres.PaginatedResult{}, nil
}

func (m *mockVoteRepository) GetByAttachmentID(attachmentID string) ([]*vote.Vote, error) {
	var out []*vote.Vote
	for _, v := range m.votes {
		if v.AttachmentID.String() == attachmentID {
			out = append(out, v)
		}
	}
	return out, nil
}

func (m *mockVoteRepository) Update(v *vote.Vote) error {
	for i, existing := range m.votes {
		if existing.ID == v.ID {
			m.votes[i] = v
			return nil
		}
	}
	return fmt.Errorf("vote not found")
}

func (m *mockVoteRepository) Delete(id string) error {
	for i, v := range m.votes {
		if v.ID.String() == id {
			m.votes = append(m.votes[:i], m.votes[i+1:]...)
			return nil
		}
	}
	return nil
}

func (m *mockVoteRepository) HasVoted(eventID, voterID string) (bool, error) {
	for _, v := range m.votes {
		if v.EventID.String() == eventID && v.VoterID.String() == voterID {
			return true, nil
		}
	}
	return false, nil
}

func (m *mockVoteRepository) CreateAssignment(a *vote.Assignment) error {
	if m.createAssignmentErr != nil {
		return m.createAssignmentErr
	}
	m.assignments[a.ID.String()] = a
	return nil
}

func (m *mockVoteRepository) GetAssignmentsByEventID(eventID string) ([]*vote.Assignment, error) {
	if m.getAssignmentsErr != nil {
		return nil, m.getAssignmentsErr
	}
	var out []*vote.Assignment
	for _, a := range m.assignments {
		if a.EventID.String() == eventID {
			out = append(out, a)
		}
	}
	return out, nil
}

func (m *mockVoteRepository) GetAssignmentsByEventIDPaginated(eventID string, params postgres.PaginationParams) (*postgres.PaginatedResult, error) {
	return &postgres.PaginatedResult{}, nil
}

func (m *mockVoteRepository) GetAssignmentByParticipant(eventID, participantID string) (*vote.Assignment, error) {
	if m.getAssignmentByPartErr != nil {
		return nil, m.getAssignmentByPartErr
	}
	for _, a := range m.assignments {
		if a.EventID.String() == eventID && a.ParticipantID.String() == participantID {
			return a, nil
		}
	}
	return nil, fmt.Errorf("assignment not found")
}

func (m *mockVoteRepository) UpdateAssignment(a *vote.Assignment) error {
	if m.updateAssignmentErr != nil {
		return m.updateAssignmentErr
	}
	m.assignments[a.ID.String()] = a
	return nil
}

func (m *mockVoteRepository) DeleteAssignment(id string) error {
	delete(m.assignments, id)
	return nil
}

// ---------------------------------------------------------------------------
// mockVotingConfigurationRepository
// ---------------------------------------------------------------------------

type mockVotingConfigurationRepository struct {
	byEvent   map[string]*vote.VotingConfiguration
	getErr    error
	createErr error
	updateErr error
	deleteErr error
}

func newMockVotingConfigurationRepository() *mockVotingConfigurationRepository {
	return &mockVotingConfigurationRepository{byEvent: make(map[string]*vote.VotingConfiguration)}
}

func (m *mockVotingConfigurationRepository) Create(config *vote.VotingConfiguration) error {
	if m.createErr != nil {
		return m.createErr
	}
	m.byEvent[config.EventID.String()] = config
	return nil
}

func (m *mockVotingConfigurationRepository) GetByID(id string) (*vote.VotingConfiguration, error) {
	for _, c := range m.byEvent {
		if c.ID.String() == id {
			return c, nil
		}
	}
	return nil, fmt.Errorf("config not found")
}

func (m *mockVotingConfigurationRepository) GetByEventID(eventID string) (*vote.VotingConfiguration, error) {
	if m.getErr != nil {
		return nil, m.getErr
	}
	c, ok := m.byEvent[eventID]
	if !ok {
		return nil, fmt.Errorf("config not found for event: %s", eventID)
	}
	return c, nil
}

func (m *mockVotingConfigurationRepository) Update(config *vote.VotingConfiguration) error {
	if m.updateErr != nil {
		return m.updateErr
	}
	m.byEvent[config.EventID.String()] = config
	return nil
}

func (m *mockVotingConfigurationRepository) Delete(eventID string) error {
	if m.deleteErr != nil {
		return m.deleteErr
	}
	delete(m.byEvent, eventID)
	return nil
}

func (m *mockVotingConfigurationRepository) ValidateConfiguration(config *vote.VotingConfiguration) error {
	return config.Validate()
}

// ---------------------------------------------------------------------------
// mockVotingResultsRepository
// ---------------------------------------------------------------------------

type mockVotingResultsRepository struct {
	byEvent   map[string]*vote.VotingResults
	getErr    error
	createErr error
	updateErr error
}

func newMockVotingResultsRepository() *mockVotingResultsRepository {
	return &mockVotingResultsRepository{byEvent: make(map[string]*vote.VotingResults)}
}

func (m *mockVotingResultsRepository) Create(results *vote.VotingResults) error {
	if m.createErr != nil {
		return m.createErr
	}
	m.byEvent[results.EventID.String()] = results
	return nil
}

func (m *mockVotingResultsRepository) GetByID(id string) (*vote.VotingResults, error) {
	for _, r := range m.byEvent {
		if r.ID.String() == id {
			return r, nil
		}
	}
	return nil, fmt.Errorf("results not found")
}

func (m *mockVotingResultsRepository) GetByEventID(eventID string) (*vote.VotingResults, error) {
	if m.getErr != nil {
		return nil, m.getErr
	}
	r, ok := m.byEvent[eventID]
	if !ok {
		return nil, fmt.Errorf("results not found for event: %s", eventID)
	}
	return r, nil
}

func (m *mockVotingResultsRepository) Update(results *vote.VotingResults) error {
	if m.updateErr != nil {
		return m.updateErr
	}
	m.byEvent[results.EventID.String()] = results
	return nil
}

func (m *mockVotingResultsRepository) Delete(eventID string) error {
	delete(m.byEvent, eventID)
	return nil
}

func (m *mockVotingResultsRepository) CalculateResults(eventID string) (*vote.VotingResults, error) {
	return nil, fmt.Errorf("not implemented")
}

func (m *mockVotingResultsRepository) GetRankingByEvent(eventID string) ([]vote.AttachmentResult, error) {
	r, ok := m.byEvent[eventID]
	if !ok {
		return nil, fmt.Errorf("not found")
	}
	return r.GlobalRanking, nil
}

// ---------------------------------------------------------------------------
// mockVoteDraftRepository
// ---------------------------------------------------------------------------

type mockVoteDraftRepository struct {
	// keyed by assignmentID.String()+"|"+participantID.String()
	drafts    map[string]*vote.VoteDraft
	upsertErr error
	// getErr, when set, is returned by GetByAssignmentAndParticipant instead
	// of the usual gorm.ErrRecordNotFound - lets tests exercise the generic
	// 500 path distinctly from the "no draft yet" 404 path.
	getErr error
}

func newMockVoteDraftRepository() *mockVoteDraftRepository {
	return &mockVoteDraftRepository{drafts: make(map[string]*vote.VoteDraft)}
}

func draftKey(assignmentID, participantID uuid.UUID) string {
	return assignmentID.String() + "|" + participantID.String()
}

func (m *mockVoteDraftRepository) Upsert(draft *vote.VoteDraft) error {
	if m.upsertErr != nil {
		return m.upsertErr
	}
	if draft.ID == uuid.Nil {
		draft.ID = uuid.New()
	}
	draft.UpdatedAt = time.Now()
	m.drafts[draftKey(draft.AssignmentID, draft.ParticipantID)] = draft
	return nil
}

func (m *mockVoteDraftRepository) GetByAssignmentAndParticipant(assignmentID, participantID uuid.UUID) (*vote.VoteDraft, error) {
	if m.getErr != nil {
		return nil, m.getErr
	}
	d, ok := m.drafts[draftKey(assignmentID, participantID)]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}
	return d, nil
}
