package notification

import (
	"fmt"

	"github.com/google/uuid"
)

// Writer is the persistence the service needs; postgres.NotificationRepository satisfies it.
type Writer interface {
	CreateBatch(notifications []*Notification) error
	UpsertParticipantRegistered(recipientID, eventID string) error
}

// Service emits notifications. Callers treat its errors as best effort (ADR-009).
type Service struct {
	writer Writer
}

// NewService creates a notification service.
func NewService(writer Writer) *Service {
	return &Service{writer: writer}
}

// Send creates one notification per recipient; dataFor may be nil (empty data).
func (s *Service) Send(eventID uuid.UUID, t Type, recipients []uuid.UUID, dataFor func(recipient uuid.UUID) Data) error {
	if len(recipients) == 0 {
		return nil
	}
	batch := make([]*Notification, 0, len(recipients))
	for _, r := range recipients {
		data := Data{}
		if dataFor != nil {
			if d := dataFor(r); d != nil {
				data = d
			}
		}
		batch = append(batch, &Notification{RecipientID: r, EventID: eventID, Type: t, Data: data})
	}
	if err := s.writer.CreateBatch(batch); err != nil {
		return fmt.Errorf("failed to send %s notifications: %w", t, err)
	}
	return nil
}

// ParticipantRegistered adds one registration to the author's unread aggregate.
func (s *Service) ParticipantRegistered(authorID, eventID uuid.UUID) error {
	if err := s.writer.UpsertParticipantRegistered(authorID.String(), eventID.String()); err != nil {
		return fmt.Errorf("failed to aggregate participant_registered: %w", err)
	}
	return nil
}
