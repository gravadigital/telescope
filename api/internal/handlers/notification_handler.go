package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/charmbracelet/log"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/domain/notification"
	"github.com/gravadigital/telescopio-api/internal/logger"
	"github.com/gravadigital/telescopio-api/internal/middleware/auth"
	"github.com/gravadigital/telescopio-api/internal/storage/postgres"
)

const (
	defaultNotificationsLimit = 20
	maxNotificationsLimit     = 50
)

// NotificationHandler serves the in-app notifications of the authenticated user.
type NotificationHandler struct {
	repo postgres.NotificationRepository
	log  *log.Logger
}

// NewNotificationHandler creates a notification handler.
func NewNotificationHandler(repo postgres.NotificationRepository) *NotificationHandler {
	return &NotificationHandler{repo: repo, log: logger.Handler("notification")}
}

// currentUser returns the JWT user id or responds 401 and returns false.
func (h *NotificationHandler) currentUser(c *gin.Context) (string, bool) {
	userID, err := auth.GetUserIDFromContext(c)
	if err != nil {
		h.log.Warn("no user_id in context (missing authentication)")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized: No valid authentication token",
			"code":  "NO_AUTH_TOKEN",
		})
		return "", false
	}
	return userID.String(), true
}

func formatTimestamp(t time.Time) string {
	return t.UTC().Format(time.RFC3339Nano)
}

func notificationPayload(it *notification.Item) gin.H {
	var readAt interface{}
	if it.ReadAt != nil {
		readAt = formatTimestamp(*it.ReadAt)
	}
	data := it.Data
	if data == nil {
		data = notification.Data{}
	}
	return gin.H{
		"id":   it.ID.String(),
		"type": string(it.Type),
		"data": data,
		"event": gin.H{
			"id":    it.EventID.String(),
			"name":  it.EventName,
			"stage": it.EventStage,
		},
		"read_at":    readAt,
		"created_at": formatTimestamp(it.CreatedAt),
	}
}

// ListNotifications handles GET /api/v1/notifications.
func (h *NotificationHandler) ListNotifications(c *gin.Context) {
	userID, ok := h.currentUser(c)
	if !ok {
		return
	}

	limit := defaultNotificationsLimit
	if raw := c.Query("limit"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 || n > maxNotificationsLimit {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid request payload",
				"code":    "INVALID_PAYLOAD",
				"details": "limit must be an integer between 1 and 50",
			})
			return
		}
		limit = n
	}

	var before *time.Time
	if raw := c.Query("before"); raw != "" {
		t, err := time.Parse(time.RFC3339Nano, raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid request payload",
				"code":    "INVALID_PAYLOAD",
				"details": "before must be an RFC3339 date-time",
			})
			return
		}
		before = &t
	}

	// Retention without a scheduler (ADR-009): purge the user's expired rows on read.
	if _, err := h.repo.DeleteExpired(userID); err != nil {
		h.log.Warn("failed to delete expired notifications", "user_id", userID, "error", err)
	}

	items, err := h.repo.ListByRecipient(userID, before, limit+1)
	if err != nil {
		h.log.Error("failed to list notifications", "user_id", userID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve notifications", "code": "RETRIEVAL_ERROR"})
		return
	}
	unread, err := h.repo.CountUnread(userID)
	if err != nil {
		h.log.Error("failed to count unread notifications", "user_id", userID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve notifications", "code": "RETRIEVAL_ERROR"})
		return
	}

	var nextCursor interface{}
	if len(items) > limit {
		items = items[:limit]
		nextCursor = formatTimestamp(items[limit-1].CreatedAt)
	}
	data := make([]gin.H, 0, len(items))
	for _, it := range items {
		data = append(data, notificationPayload(it))
	}

	c.JSON(http.StatusOK, gin.H{
		"data":         data,
		"unread_count": unread,
		"next_cursor":  nextCursor,
	})
}

// GetUnreadCount handles GET /api/v1/notifications/unread-count (the polling endpoint).
func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	userID, ok := h.currentUser(c)
	if !ok {
		return
	}
	unread, err := h.repo.CountUnread(userID)
	if err != nil {
		h.log.Error("failed to count unread notifications", "user_id", userID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve notifications", "code": "RETRIEVAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"unread_count": unread}})
}

// MarkAsRead handles PATCH /api/v1/notifications/:notification_id/read (idempotent).
func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	userID, ok := h.currentUser(c)
	if !ok {
		return
	}
	notFound := func() {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found", "code": "NOTIFICATION_NOT_FOUND"})
	}

	// A malformed id cannot exist, so it is a 404 as the contract documents (no 400).
	id, err := uuid.Parse(c.Param("notification_id"))
	if err != nil {
		notFound()
		return
	}

	n, err := h.repo.MarkRead(id.String(), userID)
	if errors.Is(err, notification.ErrNotFound) {
		notFound()
		return
	}
	if err != nil {
		h.log.Error("failed to mark notification as read", "user_id", userID, "notification_id", id, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification", "code": "DB_UPDATE_ERROR"})
		return
	}

	var readAt interface{}
	if n.ReadAt != nil {
		readAt = formatTimestamp(*n.ReadAt)
	}
	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{"id": n.ID.String(), "read_at": readAt},
		"code": "NOTIFICATION_READ",
	})
}

// MarkAllAsRead handles POST /api/v1/notifications/read-all.
func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	userID, ok := h.currentUser(c)
	if !ok {
		return
	}
	updated, err := h.repo.MarkAllRead(userID)
	if err != nil {
		h.log.Error("failed to mark notifications as read", "user_id", userID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notifications", "code": "DB_UPDATE_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{"updated": updated},
		"code": "NOTIFICATIONS_READ",
	})
}
