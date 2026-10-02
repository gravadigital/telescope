package postgres

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/gravadigital/telescopio-api/internal/domain/event"
	"github.com/gravadigital/telescopio-api/internal/domain/vote"
)

// PostgresVotingSetupRepository implements VotingSetupRepository using GORM
type PostgresVotingSetupRepository struct {
	db *gorm.DB
}

// NewPostgresVotingSetupRepository creates a new PostgreSQL voting setup repository
func NewPostgresVotingSetupRepository(db *gorm.DB) VotingSetupRepository {
	return &PostgresVotingSetupRepository{db: db}
}

// OpenVoting moves the event to voting, stores the configuration (replacing one
// created earlier through the deprecated endpoint) and inserts the assignments.
// The configuration goes before the assignments because the assignment trigger
// reads it.
func (r *PostgresVotingSetupRepository) OpenVoting(eventID string, estimatedDate *time.Time, config *vote.VotingConfiguration, assignments []*vote.Assignment) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		txc := NewTransactionContainer(tx)

		if err := txc.Events().UpdateStageWithEstimatedDate(eventID, event.StageVoting, estimatedDate); err != nil {
			return fmt.Errorf("open voting: update stage: %w", err)
		}

		existing, err := txc.VotingConfigurations().GetByEventID(eventID)
		switch {
		case err == nil:
			config.ID = existing.ID
			config.CreatedAt = existing.CreatedAt
			if err := txc.VotingConfigurations().Update(config); err != nil {
				return fmt.Errorf("open voting: replace configuration: %w", err)
			}
		case errors.Is(err, ErrVotingConfigurationNotFound):
			if err := txc.VotingConfigurations().Create(config); err != nil {
				return fmt.Errorf("open voting: create configuration: %w", err)
			}
		default:
			return fmt.Errorf("open voting: load configuration: %w", err)
		}

		for _, a := range assignments {
			if err := txc.Votes().CreateAssignment(a); err != nil {
				return fmt.Errorf("open voting: create assignment: %w", err)
			}
		}
		return nil
	})
}
