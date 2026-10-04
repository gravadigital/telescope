# Services - api

## VotingBounds

**Location:** `internal/domain/vote/configuration.go`
**Description:** Accepted range of `m` (attachments per evaluator) for `k` proposals, where evaluators are the participants who own one of them. `max = max(k-1, 0)`, `recommended = min(ceil(2·log2 k), max)`, `min = recommended` relaxed to `ceil(0.6·max)` when `k <= 10`. Returns zeros for `k <= 1`.

**Signature:**
```go
func VotingBounds(k int) (minM, maxM, recommendedM int)
```

**Usage:**
```go
minM, maxM, recommendedM := vote.VotingBounds(len(attachments))
```

---

## BuildVotingConfiguration

**Location:** `internal/domain/vote/configuration.go`
**Description:** Builds a `*VotingConfiguration` from the organizer's input. `nil` fields take the defaults (`DefaultQualityGoodThreshold` 0.6, `DefaultQualityBadThreshold` 0.3, `DefaultAdjustmentMagnitude` 3, `min(DefaultMinEvaluationsPerFile, m)`); an explicit zero is respected. Thresholds are compared in hundredths. Check order: thresholds, `m > maxM`, `m < minM`, coverage.

**Signature:**
```go
type ConfigInput struct {
	AttachmentsPerEvaluator int
	QualityGoodThreshold    *float64
	QualityBadThreshold     *float64
	AdjustmentMagnitude     *int
	MinEvaluationsPerFile   *int
}

func BuildVotingConfiguration(eventID uuid.UUID, in ConfigInput, k int) (*VotingConfiguration, error)
```

**Errors:** `ErrInvalidThresholds`, `ErrMExceedsEvaluable`, `ErrMathConstraint` (wrapped with `%w`; use `errors.Is`).

**Usage:**
```go
cfg, err := vote.BuildVotingConfiguration(eventUUID, req.input(), k)
if err != nil {
	respondVotingConfigError(c, err)
	return
}
```

---

## VotingSetupRepository.OpenVoting

**Location:** `internal/storage/postgres/voting_setup_repository.go`
**Description:** In one `db.Transaction`: updates the event stage, creates the configuration or replaces the existing one (reusing its `id` and `created_at`), and inserts the assignments. Any error rolls everything back. The configuration goes before the assignments because the assignment trigger reads it.

**Signature:**
```go
type VotingSetupRepository interface {
	OpenVoting(eventID string, estimatedDate *time.Time, config *vote.VotingConfiguration, assignments []*vote.Assignment) error
}

func NewPostgresVotingSetupRepository(db *gorm.DB) VotingSetupRepository
```

**Usage:**
```go
if err := h.votingSetupRepo.OpenVoting(eventID, estimatedDate, config, assignments); err != nil {
	// 500 VOTING_SETUP_ERROR; the event stays in participation
}
```

---

## VotingConfigRequest and response helpers

**Location:** `internal/handlers/distributed_vote_handler.go`, `internal/handlers/event_handler.go`
**Description:** `VotingConfigRequest` is the shared binding struct (`required,min=1,max=50` on `m`; pointers with `omitempty` for the rest) with an `input()` method that returns a `vote.ConfigInput`. `respondVotingConfigError` maps the domain errors to `INVALID_THRESHOLDS`, `M_EXCEEDS_EVALUABLE` and `MATH_CONSTRAINT_VIOLATION`. `respondInsufficientProposals` answers `INSUFFICIENT_ATTACHMENTS` with the `minProposalsToVote` constant.

---

## VoteRepository.ReplaceAssignmentVotes

**Location:** `internal/storage/postgres/vote_repository.go`
**Description:** In one `db.Transaction`: `DELETE FROM votes WHERE assignment_id`, then validates and inserts each vote. Returns `replaced = true` if at least one row was deleted. It does not write `assignments`: `update_assignment_completion` and `update_attachment_vote_count` run on DELETE and INSERT. A trigger rejection rolls back and keeps the previous votes. `GetAssignmentByParticipant` returns the sentinel `ErrAssignmentNotFound` (same file) when there is no assignment.

**Signature:**
```go
ReplaceAssignmentVotes(assignmentID string, votes []*vote.Vote) (replaced bool, err error)
var ErrAssignmentNotFound = errors.New("assignment not found")
```

**Usage:**
```go
replaced, err := h.voteRepo.ReplaceAssignmentVotes(assignment.ID.String(), votes)
```

---

## Assignment.PositionOf

**Location:** `internal/domain/vote/vote.go`
**Description:** Returns the 1-based position of an attachment in `AttachmentIDs`, or `(0, false)`. Used for the `Propuesta n` label and for `propuesta-{n}.{ext}` so both always match.

**Signature:**
```go
func (a *Assignment) PositionOf(attachmentID uuid.UUID) (int, bool)
```

**Usage:**
```go
n, ok := assignment.PositionOf(att.ID)
```

---

## Batch lookups

**Location:** `internal/storage/postgres/event_repository.go`, `attachment_repository.go`, `vote_repository.go`, `voting_results_repository.go`
**Description:** Read many events at once with a single `IN` query per table, to avoid N+1. All return an empty result without querying when the list is empty and fail on malformed UUIDs. `CountParticipantsByEventIDs` excludes the event author, like `UserRepository.GetEventParticipants`; events without participants may be absent from the map.

**Signature:**
```go
CountParticipantsByEventIDs(eventIDs []string) (map[string]int, error)
GetByParticipantAndEventIDs(participantID string, eventIDs []string) ([]*attachment.Attachment, error)
GetAssignmentsByParticipantAndEventIDs(participantID string, eventIDs []string) ([]*vote.Assignment, error)
GetByEventIDs(eventIDs []string) ([]*vote.VotingResults, error) // VotingResultsRepository
```

**Usage:**
```go
counts, err := h.eventRepo.CountParticipantsByEventIDs(ids)
n := counts[evt.ID.String()] // 0 when absent
```

---

## OptionalJWTAuthMiddleware

**Location:** `internal/middleware/auth/jwt.go`
**Description:** Gin middleware for public endpoints that behave differently for known users. A valid Bearer token sets `user_id`, `user_email` and `user_role`; anything else leaves the context untouched and continues. It never answers 401 and never calls `Abort`.

**Signature:**
```go
func OptionalJWTAuthMiddleware() gin.HandlerFunc
```

**Usage:**
```go
eventsPublic := api.Group("/events")
eventsPublic.Use(auth.OptionalJWTAuthMiddleware())
```

---

## eventVisibleTo and buildEventDetail

**Location:** `internal/handlers/event_visibility.go`, `internal/handlers/event_handler.go`
**Description:** `eventVisibleTo` is the single visibility rule: an event outside `creation` is visible to everyone; in `creation` only to its author and admins (anonymous callers never see it). Callers answer `respondEventNotFound(c)`, the same `404 EVENT_NOT_FOUND` as a missing id. `buildEventDetail` builds the `EventDetail` payload and returns the participant count it reports.

**Signature:**
```go
func eventVisibleTo(c *gin.Context, evt *event.Event) bool
func respondEventNotFound(c *gin.Context)
func (h *EventHandler) buildEventDetail(evt *event.Event) (gin.H, int)
```

**Usage:**
```go
if !eventVisibleTo(c, evt) {
    respondEventNotFound(c)
    return
}
```
