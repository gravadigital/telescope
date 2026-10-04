package email

import (
	"testing"

	"github.com/gravadigital/telescopio-api/internal/config"
	"github.com/stretchr/testify/assert"
)

func TestReminderTemplates(t *testing.T) { // TS-65
	name := "Semana de la Ciencia"
	assert.Contains(t, fileReminderSubject(name), "«Semana de la Ciencia»")
	assert.Contains(t, voteReminderSubject(name), "«Semana de la Ciencia»")
	assert.Contains(t, fileReminderBody(name, "2026-11-15"), "2026-11-15")
	assert.Contains(t, voteReminderBody(name, "2026-12-01"), "2026-12-01")
	assert.NotContains(t, fileReminderBody(name, ""), "Fecha estimada")
	assert.NotContains(t, voteReminderBody(name, ""), "Fecha estimada")

	for _, text := range []string{
		fileReminderSubject(name), fileReminderBody(name, "2026-11-15"),
		voteReminderSubject(name), voteReminderBody(name, "2026-12-01"),
	} {
		for _, voseo := range []string{"Ingresá", "tenés", "podés", "Hacé"} {
			assert.NotContains(t, text, voseo)
		}
	}
}

func TestReminderEmailsAreNoOpWhenDisabledOrEmpty(t *testing.T) { // TS-65
	disabled := NewEmailService(&config.Config{})
	assert.NoError(t, disabled.SendFileReminder("E", "2026-11-15", []string{"p3@example.com"}))
	assert.NoError(t, disabled.SendVoteReminder("E", "2026-12-01", []string{"p3@example.com"}))
	assert.NoError(t, disabled.SendFileReminder("E", "", nil))

	cfg := &config.Config{}
	cfg.Email.Enabled = true
	enabled := NewEmailService(cfg)
	assert.NoError(t, enabled.SendFileReminder("E", "", nil))
	assert.NoError(t, enabled.SendVoteReminder("E", "", []string{}))
}
