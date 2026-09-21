package migrations

import "gorm.io/gorm"

func migration021Up(db *gorm.DB) error {
	return db.Exec(`ALTER TABLE attachments ADD COLUMN IF NOT EXISTS description TEXT`).Error
}

func migration021Down(db *gorm.DB) error {
	return db.Exec(`ALTER TABLE attachments DROP COLUMN IF EXISTS description`).Error
}
