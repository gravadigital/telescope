package handlers

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gravadigital/telescopio-api/internal/domain/notification"
	"github.com/gravadigital/telescopio-api/internal/middleware/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newNotificationHandlerForTest() (*NotificationHandler, *mockNotificationRepository) {
	repo := newMockNotificationRepository()
	return NewNotificationHandler(repo), repo
}

// callNotifications invokes handlerFunc with an optional authenticated user, params and raw query.
func callNotifications(handlerFunc gin.HandlerFunc, method string, userID string, params gin.Params, query string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	url := "/test"
	if query != "" {
		url += "?" + query
	}
	c.Request = httptest.NewRequest(method, url, nil)
	c.Params = params
	if userID != "" {
		c.Set("user_id", userID)
	}
	handlerFunc(c)
	return w
}

func notificationItem(id uuid.UUID, typ notification.Type, data notification.Data, eventID uuid.UUID, readAt *time.Time, createdAt time.Time) *notification.Item {
	return &notification.Item{
		Notification: notification.Notification{ID: id, EventID: eventID, Type: typ, Data: data, ReadAt: readAt, CreatedAt: createdAt},
		EventName:    "Semana de la Ciencia",
		EventStage:   "participation",
	}
}

func TestListNotifications_Success(t *testing.T) { // TS-24
	h, repo := newNotificationHandlerForTest()
	p1, evID, n1, n2 := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	read := time.Date(2026, 10, 3, 10, 0, 0, 0, time.UTC)
	repo.items = []*notification.Item{
		notificationItem(n2, notification.TypeDeadlineChanged, notification.Data{"stage": "participation", "new_date": "2026-11-20"}, evID, nil,
			time.Date(2026, 10, 4, 12, 0, 0, 123456000, time.UTC)),
		notificationItem(n1, notification.TypeRegistrationConfirmed, nil, evID, &read, time.Date(2026, 10, 3, 9, 0, 0, 0, time.UTC)),
	}
	repo.unreadCount = 1

	w := callNotifications(h.ListNotifications, http.MethodGet, p1.String(), nil, "limit=10")

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	body := jsonBody(t, w)
	assert.Equal(t, float64(1), body["unread_count"])
	assert.Nil(t, body["next_cursor"])
	data := body["data"].([]interface{})
	require.Len(t, data, 2)
	first := data[0].(map[string]interface{})
	assert.Equal(t, n2.String(), first["id"])
	assert.Equal(t, "deadline_changed", first["type"])
	assert.Equal(t, map[string]interface{}{"stage": "participation", "new_date": "2026-11-20"}, first["data"])
	assert.Equal(t, map[string]interface{}{"id": evID.String(), "name": "Semana de la Ciencia", "stage": "participation"}, first["event"])
	assert.Nil(t, first["read_at"])
	assert.Equal(t, "2026-10-04T12:00:00.123456Z", first["created_at"])
	second := data[1].(map[string]interface{})
	assert.Equal(t, map[string]interface{}{}, second["data"])
	assert.Equal(t, "2026-10-03T10:00:00Z", second["read_at"])
	assert.Equal(t, p1.String(), repo.listRecipient)
	assert.Equal(t, 11, repo.listLimit)
	assert.Nil(t, repo.listBefore)
}

func TestListNotifications_DefaultLimit(t *testing.T) { // TS-25
	h, repo := newNotificationHandlerForTest()
	w := callNotifications(h.ListNotifications, http.MethodGet, uuid.NewString(), nil, "")
	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, 21, repo.listLimit)
	assert.Equal(t, []interface{}{}, jsonBody(t, w)["data"], "empty list must be [] not null")
}

func TestListNotifications_NextCursor(t *testing.T) { // TS-26
	h, repo := newNotificationHandlerForTest()
	ev := uuid.New()
	for i := 0; i < 21; i++ {
		ts := time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC).Add(-time.Duration(i) * time.Hour)
		if i == 19 {
			ts = time.Date(2026, 9, 30, 8, 15, 30, 123000, time.UTC)
		}
		repo.items = append(repo.items, notificationItem(uuid.New(), notification.TypeEventPaused, nil, ev, nil, ts))
	}

	w := callNotifications(h.ListNotifications, http.MethodGet, uuid.NewString(), nil, "")

	body := jsonBody(t, w)
	assert.Len(t, body["data"], 20)
	assert.Equal(t, "2026-09-30T08:15:30.000123Z", body["next_cursor"])
}

func TestListNotifications_PassesBefore(t *testing.T) { // TS-27
	h, repo := newNotificationHandlerForTest()
	w := callNotifications(h.ListNotifications, http.MethodGet, uuid.NewString(), nil, "limit=20&before=2026-09-30T08:15:30.000123Z")
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	require.NotNil(t, repo.listBefore)
	assert.True(t, repo.listBefore.Equal(time.Date(2026, 9, 30, 8, 15, 30, 123000, time.UTC)))
}

func TestListNotifications_InvalidQuery(t *testing.T) { // TS-28
	for _, q := range []string{"limit=0", "limit=51", "limit=diez", "before=ayer"} {
		t.Run(q, func(t *testing.T) {
			h, repo := newNotificationHandlerForTest()
			w := callNotifications(h.ListNotifications, http.MethodGet, uuid.NewString(), nil, q)
			assert.Equal(t, http.StatusBadRequest, w.Code)
			body := jsonBody(t, w)
			assert.Equal(t, "INVALID_PAYLOAD", body["code"])
			assert.NotEmpty(t, body["details"])
			assert.Zero(t, repo.listCalls)
		})
	}
}

func TestListNotifications_DeletesExpiredBeforeListing(t *testing.T) { // TS-29
	h, repo := newNotificationHandlerForTest()
	callNotifications(h.ListNotifications, http.MethodGet, uuid.NewString(), nil, "")
	assert.Equal(t, []string{"delete", "list"}, repo.calls)
}

func TestListNotifications_DeleteFailureDoesNotBreakListing(t *testing.T) { // TS-30
	h, repo := newNotificationHandlerForTest()
	repo.deleteErr = errors.New("boom")
	w := callNotifications(h.ListNotifications, http.MethodGet, uuid.NewString(), nil, "")
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestListNotifications_ListFailure(t *testing.T) { // TS-31
	h, repo := newNotificationHandlerForTest()
	repo.listErr = errors.New("secret db detail")
	w := callNotifications(h.ListNotifications, http.MethodGet, uuid.NewString(), nil, "")
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Equal(t, "RETRIEVAL_ERROR", jsonBody(t, w)["code"])
	assert.NotContains(t, w.Body.String(), "secret db detail")
}

func TestGetUnreadCount(t *testing.T) { // TS-32
	h, repo := newNotificationHandlerForTest()
	repo.unreadCount = 2
	user := uuid.New()
	w := callNotifications(h.GetUnreadCount, http.MethodGet, user.String(), nil, "")
	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, map[string]interface{}{"unread_count": float64(2)}, jsonBody(t, w)["data"])
	assert.Equal(t, user.String(), repo.countRecipent)

	repo.countErr = errors.New("boom")
	w = callNotifications(h.GetUnreadCount, http.MethodGet, user.String(), nil, "")
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Equal(t, "RETRIEVAL_ERROR", jsonBody(t, w)["code"])
}

func TestMarkAsRead_Success(t *testing.T) { // TS-33
	h, repo := newNotificationHandlerForTest()
	n1, user := uuid.New(), uuid.New()
	readAt := time.Date(2026, 10, 4, 12, 30, 0, 0, time.UTC)
	repo.markResult = &notification.Notification{ID: n1, ReadAt: &readAt}

	w := callNotifications(h.MarkAsRead, http.MethodPatch, user.String(), gin.Params{{Key: "notification_id", Value: n1.String()}}, "")

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	body := jsonBody(t, w)
	assert.Equal(t, "NOTIFICATION_READ", body["code"])
	assert.Equal(t, map[string]interface{}{"id": n1.String(), "read_at": "2026-10-04T12:30:00Z"}, body["data"])
	assert.Equal(t, n1.String(), repo.markID)
	assert.Equal(t, user.String(), repo.markRecipient)
}

func TestMarkAsRead_NotFound(t *testing.T) { // TS-34
	h, repo := newNotificationHandlerForTest()
	repo.markErr = notification.ErrNotFound
	w := callNotifications(h.MarkAsRead, http.MethodPatch, uuid.NewString(), gin.Params{{Key: "notification_id", Value: uuid.NewString()}}, "")
	assert.Equal(t, http.StatusNotFound, w.Code)
	body := jsonBody(t, w)
	assert.Equal(t, "NOTIFICATION_NOT_FOUND", body["code"])
	assert.Equal(t, "Notification not found", body["error"])
}

func TestMarkAsRead_MalformedIDIsNotFound(t *testing.T) { // TS-35
	h, repo := newNotificationHandlerForTest()
	w := callNotifications(h.MarkAsRead, http.MethodPatch, uuid.NewString(), gin.Params{{Key: "notification_id", Value: "not-a-uuid"}}, "")
	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, "NOTIFICATION_NOT_FOUND", jsonBody(t, w)["code"])
	assert.Zero(t, repo.markCalls)
}

func TestMarkAllAsRead(t *testing.T) { // TS-36
	h, repo := newNotificationHandlerForTest()
	repo.markAll = 2
	user := uuid.New()
	w := callNotifications(h.MarkAllAsRead, http.MethodPost, user.String(), nil, "")
	require.Equal(t, http.StatusOK, w.Code)
	body := jsonBody(t, w)
	assert.Equal(t, "NOTIFICATIONS_READ", body["code"])
	assert.Equal(t, map[string]interface{}{"updated": float64(2)}, body["data"])
	assert.Equal(t, user.String(), repo.markRecipient)
}

func TestMarkFailures(t *testing.T) { // TS-37
	h, repo := newNotificationHandlerForTest()
	repo.markErr = errors.New("boom")
	repo.markAllErr = errors.New("boom")

	w := callNotifications(h.MarkAsRead, http.MethodPatch, uuid.NewString(), gin.Params{{Key: "notification_id", Value: uuid.NewString()}}, "")
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Equal(t, "DB_UPDATE_ERROR", jsonBody(t, w)["code"])

	w = callNotifications(h.MarkAllAsRead, http.MethodPost, uuid.NewString(), nil, "")
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Equal(t, "DB_UPDATE_ERROR", jsonBody(t, w)["code"])
}

func TestNotificationEndpoints_RequireUserInContext(t *testing.T) { // TS-38
	h, _ := newNotificationHandlerForTest()
	params := gin.Params{{Key: "notification_id", Value: uuid.NewString()}}
	for name, fn := range map[string]gin.HandlerFunc{
		"list": h.ListNotifications, "count": h.GetUnreadCount, "read": h.MarkAsRead, "read-all": h.MarkAllAsRead,
	} {
		t.Run(name, func(t *testing.T) {
			w := callNotifications(fn, http.MethodGet, "", params, "")
			assert.Equal(t, http.StatusUnauthorized, w.Code)
			assert.Equal(t, "NO_AUTH_TOKEN", jsonBody(t, w)["code"])
		})
	}
}

func TestNotificationRoutes_RequireJWT(t *testing.T) { // TS-39
	h, _ := newNotificationHandlerForTest()
	r := gin.New()
	g := r.Group("/api/v1/notifications")
	g.Use(auth.JWTAuthMiddleware())
	g.GET("", h.ListNotifications)
	g.GET("/unread-count", h.GetUnreadCount)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/notifications/unread-count", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	body := jsonBody(t, w)
	assert.Equal(t, "UNAUTHORIZED", body["error"])
	assert.Equal(t, "Missing Authorization header", body["message"])
}
