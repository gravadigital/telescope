package migrations

import "gorm.io/gorm"

// coverColors is the closed palette of events.cover_color. It repeats
// event.CoverColors(): the CHECK is the second barrier behind the validation in Go.
const coverColors = `'lavender','periwinkle','sky','ice','aqua','mint','pistachio','lemon',` +
	`'butter','peach','coral','rose','pink','lilac','sand','mist'`

// migration025Up adds events.cover_color and replaces the future_start_date CHECK.
//
// A NOT VALID CHECK skips the existing rows when it is created, but PostgreSQL evaluates it on
// every INSERT and UPDATE, so any update of an event whose start_date is older than a day (edit,
// stage change, pause, cancel) failed. The trigger applies the same rule only when the event is
// created or its start_date changes. IS DISTINCT FROM matters: a GORM Save sends every column,
// start_date included, on each update.
func migration025Up(db *gorm.DB) error {
	stmts := []string{
		`ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_color VARCHAR(32) NOT NULL DEFAULT 'lavender'`,
		`ALTER TABLE events ADD CONSTRAINT valid_cover_color CHECK (cover_color IN (` + coverColors + `))`,
		`ALTER TABLE events DROP CONSTRAINT IF EXISTS future_start_date`,
		`CREATE OR REPLACE FUNCTION enforce_future_start_date() RETURNS trigger LANGUAGE plpgsql AS $$
		BEGIN
			IF TG_OP = 'INSERT' OR NEW.start_date IS DISTINCT FROM OLD.start_date THEN
				IF NEW.start_date < CURRENT_TIMESTAMP - INTERVAL '1 day' THEN
					RAISE EXCEPTION 'start_date cannot be in the past';
				END IF;
			END IF;
			RETURN NEW;
		END;
		$$`,
		`CREATE TRIGGER enforce_future_start_date BEFORE INSERT OR UPDATE OF start_date ON events
			FOR EACH ROW EXECUTE FUNCTION enforce_future_start_date()`,
	}
	for _, s := range stmts {
		if err := db.Exec(s).Error; err != nil {
			return err
		}
	}
	return nil
}

func migration025Down(db *gorm.DB) error {
	stmts := []string{
		`DROP TRIGGER IF EXISTS enforce_future_start_date ON events`,
		`DROP FUNCTION IF EXISTS enforce_future_start_date()`,
		`ALTER TABLE events ADD CONSTRAINT future_start_date
			CHECK (start_date >= CURRENT_TIMESTAMP - INTERVAL '1 day') NOT VALID`,
		`ALTER TABLE events DROP CONSTRAINT IF EXISTS valid_cover_color`,
		`ALTER TABLE events DROP COLUMN IF EXISTS cover_color`,
	}
	for _, s := range stmts {
		if err := db.Exec(s).Error; err != nil {
			return err
		}
	}
	return nil
}
