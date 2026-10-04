package migrations

import "gorm.io/gorm"

func migration024Up(db *gorm.DB) error {
	stmts := []string{
		`CREATE TYPE notification_type AS ENUM (
			'stage_changed', 'event_cancelled', 'event_paused', 'deadline_changed',
			'participant_registered', 'registration_confirmed', 'ranking_submitted',
			'file_reminder', 'vote_reminder')`,
		`CREATE TABLE notifications (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
			type notification_type NOT NULL,
			data JSONB NOT NULL DEFAULT '{}',
			read_at TIMESTAMPTZ,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
		`CREATE INDEX idx_notifications_recipient_created ON notifications (recipient_id, created_at DESC)`,
		`CREATE INDEX idx_notifications_unread ON notifications (recipient_id) WHERE read_at IS NULL`,
		`CREATE UNIQUE INDEX uq_notifications_registered_unread ON notifications (recipient_id, event_id, type)
			WHERE read_at IS NULL AND type = 'participant_registered'`,
	}
	for _, s := range stmts {
		if err := db.Exec(s).Error; err != nil {
			return err
		}
	}
	return nil
}

func migration024Down(db *gorm.DB) error {
	stmts := []string{
		`DROP INDEX IF EXISTS uq_notifications_registered_unread`,
		`DROP INDEX IF EXISTS idx_notifications_unread`,
		`DROP INDEX IF EXISTS idx_notifications_recipient_created`,
		`DROP TABLE IF EXISTS notifications`,
		`DROP TYPE IF EXISTS notification_type`,
	}
	for _, s := range stmts {
		if err := db.Exec(s).Error; err != nil {
			return err
		}
	}
	return nil
}
