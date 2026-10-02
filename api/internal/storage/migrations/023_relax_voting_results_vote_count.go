package migrations

import "gorm.io/gorm"

// A result can be published while some evaluators have not submitted their
// ranking, so total_votes may be lower than total_participants.

func migration023Up(db *gorm.DB) error {
	return replaceParticipantCountsCheck(db, "total_participants > 0 AND total_votes >= 0")
}

func migration023Down(db *gorm.DB) error {
	return replaceParticipantCountsCheck(db, "total_participants > 0 AND total_votes >= total_participants")
}

func replaceParticipantCountsCheck(db *gorm.DB, condition string) error {
	if err := db.Exec("ALTER TABLE voting_results DROP CONSTRAINT IF EXISTS valid_participant_counts").Error; err != nil {
		return err
	}
	return db.Exec("ALTER TABLE voting_results ADD CONSTRAINT valid_participant_counts CHECK (" + condition + ")").Error
}
