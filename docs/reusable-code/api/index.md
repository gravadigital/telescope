# Código Reutilizable - api

This document lists the reusable code documented so far for this service (incremental: only elements added by implemented stories; it is not a full scan). Each category has its own file with details.

## Components

N/A (Backend service)

## Services

**Total: 6**

- **VotingBounds** (`internal/domain/vote/configuration.go`) - Single source of the accepted range of `m` (min, max, recommended) for `k` proposals; used by the stage opening, the preview and the deprecated endpoints
- **BuildVotingConfiguration** (`internal/domain/vote/configuration.go`) - Applies defaults to a `ConfigInput` and validates thresholds, bounds and coverage, returning the sentinel errors `ErrInvalidThresholds`, `ErrMExceedsEvaluable`, `ErrMathConstraint`
- **VotingSetupRepository.OpenVoting** (`internal/storage/postgres/voting_setup_repository.go`) - Writes stage change, voting configuration (create or replace) and assignments in one transaction
- **VoteRepository.ReplaceAssignmentVotes** (`internal/storage/postgres/vote_repository.go`) - Deletes the assignment's votes and inserts the new ones in one transaction, returning `replaced`; triggers maintain `is_completed` and `vote_count`. Also exports `ErrAssignmentNotFound`
- **Batch lookups** (`internal/storage/postgres/{event,attachment,vote,voting_results}_repository.go`) - `CountParticipantsByEventIDs` (author excluded), `GetByParticipantAndEventIDs`, `GetAssignmentsByParticipantAndEventIDs` and `GetByEventIDs`: one `IN` query each, empty list returns empty without querying
- **Assignment.PositionOf** (`internal/domain/vote/vote.go`) - 1-based position of an attachment in the assignment; source of the `Propuesta n` label and the neutral download name

See full details in [services.md](./services.md)

## Handlers helpers

**Total: 8**

- **neutralFilename** (`internal/handlers/attachment_handler.go`) - `propuesta-{n}.{ext}` name served to evaluators; extension from `neutralExtensions` by MIME type (`bin` fallback), never from the original name
- **VotingConfigRequest** (`internal/handlers/distributed_vote_handler.go`) - Request body for the voting configuration shared by `PATCH /stage` and the deprecated `POST /voting-config`; optional fields are pointers
- **respondVotingConfigError** (`internal/handlers/event_handler.go`) - Maps the `BuildVotingConfiguration` sentinel errors to `400` responses with `code`
- **respondInsufficientProposals** (`internal/handlers/distributed_vote_handler.go`) - `400 INSUFFICIENT_ATTACHMENTS` with `current_count` and `required_minimum`
- **OptionalJWTAuthMiddleware** (`internal/middleware/auth/jwt.go`) - Identifies the caller from a valid Bearer token and otherwise continues as anonymous; never rejects. Used by the `eventsPublic` group
- **eventVisibleTo / respondEventNotFound** (`internal/handlers/event_visibility.go`) - Whether the caller may see an event (events in `creation` only for their author and admins) and the shared `404 EVENT_NOT_FOUND` response
- **buildEventDetail** (`internal/handlers/event_handler.go`) - Builds the `EventDetail` payload (with `participants_count` and the organizer fallback) shared by `GetEvent` and `UpdateEvent`
- **buildMyStatus** (`internal/handlers/user_handler.go`) - `my_status` of a participant in `GET /users/:user_id/events?scope=all`

See full details in [services.md](./services.md)

## Test helpers

**Total: 1**

- **mockVotingSetupRepository** (`internal/handlers/mocks_repository_test.go`) - Hand-written mock of `VotingSetupRepository` that records the `OpenVoting` arguments and can move the event to voting
