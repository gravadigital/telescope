package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gravadigital/telescopio-api/internal/domain/event"
	"github.com/gravadigital/telescopio-api/internal/domain/participant"
	"github.com/gravadigital/telescopio-api/internal/middleware/auth"
)

// eventVisibleTo reports whether the caller may see evt. An event in creation is
// visible only to its author and to admins; to anyone else it must look like a
// nonexistent event, so callers answer 404 EVENT_NOT_FOUND.
func eventVisibleTo(c *gin.Context, evt *event.Event) bool {
	if evt.Stage != event.StageCreation {
		return true
	}
	if role, err := auth.GetUserRoleFromContext(c); err == nil && role == participant.RoleAdmin {
		return true
	}
	userID, err := auth.GetUserIDFromContext(c)
	return err == nil && userID == evt.AuthorID
}

// respondEventNotFound writes the 404 shared by a missing event and a hidden one.
func respondEventNotFound(c *gin.Context) {
	c.JSON(http.StatusNotFound, gin.H{
		"error": "Event not found",
		"code":  "EVENT_NOT_FOUND",
	})
}
