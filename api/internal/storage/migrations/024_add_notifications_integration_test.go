//go:build integration
// +build integration

package migrations

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMigration024_CreatesTableEnumAndIndexes(t *testing.T) {
	tx := migratedTx(t)

	var values []string
	require.NoError(t, tx.Raw(`SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
		WHERE t.typname = 'notification_type' ORDER BY e.enumsortorder`).Scan(&values).Error)
	assert.Len(t, values, 9)

	type idx struct{ Indexname, Indexdef string }
	var idxs []idx
	require.NoError(t, tx.Raw(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'notifications'`).Scan(&idxs).Error)
	defs := map[string]string{}
	for _, i := range idxs {
		defs[i.Indexname] = i.Indexdef
	}
	assert.Contains(t, defs, "idx_notifications_recipient_created")
	assert.Contains(t, defs["idx_notifications_unread"], "read_at IS NULL")
	assert.Contains(t, defs["uq_notifications_registered_unread"], "UNIQUE")
	assert.Contains(t, defs["uq_notifications_registered_unread"], "participant_registered")
}

func TestMigration024_DownThenUp(t *testing.T) {
	tx := migratedTx(t)
	require.NoError(t, migration024Down(tx))
	var n int64
	require.NoError(t, tx.Raw(`SELECT count(*) FROM pg_type WHERE typname = 'notification_type'`).Scan(&n).Error)
	assert.Zero(t, n)
	require.NoError(t, migration024Up(tx))
}
