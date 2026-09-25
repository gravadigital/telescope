# Services/Repositories - api

### EventRepository.IsCreatorOfEventWithParticipant

**Location:** `internal/storage/postgres/event_repository.go`

**Description:** Reports whether `creatorID` authored at least one event in which `userID` has
an `event_participants` row, in any stage and regardless of `is_cancelled`. Backs
`RequireSelfOrEventCreator` for CA-9/CA-10/CA-11 of S-003, but is generic enough for any future
feature that needs to check "does this user manage an event this other user participates in".

**Signature:**
```go
// Part of postgres.EventRepository
IsCreatorOfEventWithParticipant(creatorID, userID string) (bool, error)
```

Query:
```sql
SELECT EXISTS (
  SELECT 1 FROM events e
  JOIN event_participants ep ON ep.event_id = e.id
  WHERE e.author_id = $1 AND ep.user_id = $2
)
```

**Usage:**
```go
isCreator, err := eventRepo.IsCreatorOfEventWithParticipant(requesterID.String(), targetID.String())
if err != nil {
    // 500, do not expose the raw error
}
if !isCreator {
    // 403
}
```
