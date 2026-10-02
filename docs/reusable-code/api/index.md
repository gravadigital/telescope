# Código Reutilizable - api

This document lists the reusable code documented so far for this service (incremental: only elements added by implemented stories; it is not a full scan). Each category has its own file with details.

## Components

N/A (Backend service)

## Services

**Total: 3**

- **VotingBounds** (`internal/domain/vote/configuration.go`) - Single source of the accepted range of `m` (min, max, recommended) for `k` proposals; used by the stage opening, the preview and the deprecated endpoints
- **BuildVotingConfiguration** (`internal/domain/vote/configuration.go`) - Applies defaults to a `ConfigInput` and validates thresholds, bounds and coverage, returning the sentinel errors `ErrInvalidThresholds`, `ErrMExceedsEvaluable`, `ErrMathConstraint`
- **VotingSetupRepository.OpenVoting** (`internal/storage/postgres/voting_setup_repository.go`) - Writes stage change, voting configuration (create or replace) and assignments in one transaction

See full details in [services.md](./services.md)

## Handlers helpers

**Total: 3**

- **VotingConfigRequest** (`internal/handlers/distributed_vote_handler.go`) - Request body for the voting configuration shared by `PATCH /stage` and the deprecated `POST /voting-config`; optional fields are pointers
- **respondVotingConfigError** (`internal/handlers/event_handler.go`) - Maps the `BuildVotingConfiguration` sentinel errors to `400` responses with `code`
- **respondInsufficientProposals** (`internal/handlers/distributed_vote_handler.go`) - `400 INSUFFICIENT_ATTACHMENTS` with `current_count` and `required_minimum`

See full details in [services.md](./services.md)

## Test helpers

**Total: 1**

- **mockVotingSetupRepository** (`internal/handlers/mocks_repository_test.go`) - Hand-written mock of `VotingSetupRepository` that records the `OpenVoting` arguments and can move the event to voting
