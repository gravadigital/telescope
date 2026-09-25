# Middlewares - api

### RequireSelfOrEventCreator

**Location:** `internal/middleware/auth/permissions.go`

**Description:** Gin middleware that allows a request only when the authenticated user (from
context, set by `JWTAuthMiddleware`) is the target user identified by the `:user_id` route
param, or the author of at least one event in which the target user has an
`event_participants` row (any stage, including cancelled). It has **no `admin` bypass** — added
in S-003 to close data-access requests to `GET /users/{user_id}`.

**Signature:**
```go
func RequireSelfOrEventCreator(eventRepo postgres.EventRepository) gin.HandlerFunc
```

**Errors (form B, `{"error": "CODE", "message": "..."}`):**
- `401 UNAUTHORIZED` - no `user_id` in context
- `400 BAD_REQUEST` - `:user_id` is not a valid UUID
- `403 FORBIDDEN` - authenticated user is neither the target nor an event creator with the target as participant
- `500 INTERNAL_ERROR` - the permission query failed (raw error not exposed)

**Usage:**
```go
usersProtected.GET("/:user_id", auth.RequireSelfOrEventCreator(eventRepo), userHandler.GetUser)
```
