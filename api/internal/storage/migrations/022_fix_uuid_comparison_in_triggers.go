package migrations

import (
	"fmt"

	"gorm.io/gorm"
)

// Migration 004 compared attachment IDs as text against assignments.attachment_ids,
// which is uuid[] since migration 002. Postgres has no text = uuid operator, so every
// insert into assignments and votes failed. The functions are recreated here comparing
// uuid against uuid; their logic is otherwise the same as in 004.

func migration022Up(db *gorm.DB) error {
	return replaceValidationFunctions(db, "")
}

func migration022Down(db *gorm.DB) error {
	return replaceValidationFunctions(db, "::text")
}

// replaceValidationFunctions recreates validate_assignment_constraints and
// validate_vote_constraints, casting the attachment ID with idCast before
// comparing it against attachment_ids.
func replaceValidationFunctions(db *gorm.DB, idCast string) error {
	functions := []string{
		fmt.Sprintf(`CREATE OR REPLACE FUNCTION validate_assignment_constraints()
        RETURNS TRIGGER AS $$
        DECLARE
            config_record RECORD;
            attachment_count INTEGER;
            valid_attachments INTEGER;
            self_assignments INTEGER;
        BEGIN
            -- Get voting configuration for this event
            SELECT * INTO config_record
            FROM voting_configurations
            WHERE event_id = NEW.event_id;

            IF FOUND THEN
                -- Check that assignment has correct number of attachments
                attachment_count := array_length(NEW.attachment_ids, 1);
                IF attachment_count != config_record.attachments_per_evaluator THEN
                    RAISE EXCEPTION 'Assignment must have exactly %% attachments, got %%',
                        config_record.attachments_per_evaluator, attachment_count;
                END IF;

                -- Validate all attachment IDs exist and belong to this event
                SELECT COUNT(*) INTO valid_attachments
                FROM attachments
                WHERE id%[1]s = ANY(NEW.attachment_ids) AND event_id = NEW.event_id;

                IF valid_attachments != attachment_count THEN
                    RAISE EXCEPTION 'Some attachment IDs are invalid or do not belong to this event';
                END IF;

                -- Check for self-assignment (conflict of interest)
                SELECT COUNT(*) INTO self_assignments
                FROM attachments
                WHERE id%[1]s = ANY(NEW.attachment_ids)
                  AND event_id = NEW.event_id
                  AND participant_id = NEW.participant_id;

                IF self_assignments > 0 THEN
                    RAISE EXCEPTION 'Participant cannot be assigned to evaluate their own proposals (conflict of interest)';
                END IF;
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql`, idCast),

		fmt.Sprintf(`CREATE OR REPLACE FUNCTION validate_vote_constraints()
        RETURNS TRIGGER AS $$
        DECLARE
            assignment_record RECORD;
            attachment_in_assignment BOOLEAN := FALSE;
            config_record RECORD;
            max_rank INTEGER;
        BEGIN
            -- Get assignment for this voter in this event
            SELECT * INTO assignment_record
            FROM assignments
            WHERE event_id = NEW.event_id AND participant_id = NEW.voter_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Voter %% has no assignment for event %%', NEW.voter_id, NEW.event_id;
            END IF;

            -- Check if attachment is in the voter's assignment
            IF NEW.attachment_id%[1]s = ANY(assignment_record.attachment_ids) THEN
                attachment_in_assignment := TRUE;
            END IF;

            IF NOT attachment_in_assignment THEN
                RAISE EXCEPTION 'Attachment %% is not assigned to voter %% for evaluation',
                    NEW.attachment_id, NEW.voter_id;
            END IF;

            -- Validate rank bounds and calculate Borda score
            SELECT * INTO config_record
            FROM voting_configurations
            WHERE event_id = NEW.event_id;

            IF FOUND THEN
                max_rank := config_record.attachments_per_evaluator;
                IF NEW.rank_position > max_rank THEN
                    RAISE EXCEPTION 'Rank position %% exceeds maximum allowed rank %% for this event',
                        NEW.rank_position, max_rank;
                END IF;

                -- Calculate Borda score if not provided
                IF NEW.score IS NULL THEN
                    NEW.score := (config_record.attachments_per_evaluator - NEW.rank_position + 1.0) * 100.0 / config_record.attachments_per_evaluator;
                END IF;
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql`, idCast),
	}

	for _, functionSQL := range functions {
		if err := db.Exec(functionSQL).Error; err != nil {
			return err
		}
	}

	return nil
}
