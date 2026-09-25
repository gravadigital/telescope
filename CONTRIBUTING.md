# Contributing to Telescope

This document covers how to get the project running, what the codebase expects from a change,
and the rules that are not obvious from reading the code.

## Getting set up

You need **Docker**, **Go 1.26** (see [`api/go.mod`](api/go.mod)), **Node.js 22** (see
[`web/.nvmrc`](web/.nvmrc)) and `make`.

```sh
git clone https://github.com/gravadigital/telescope.git
cd telescope
make infra    # database + MinIO in Docker
make api      # in another terminal
make web      # in a third
```

No configuration file is needed. Everything is in
[documentation/installation.md](documentation/installation.md).

## How the pieces fit

Read [documentation/README.md](documentation/README.md) first. The short version:

- **`api`** is the only service with state. Gin for HTTP, GORM for the database. All routes
  are declared in [`api/cmd/api/main.go`](api/cmd/api/main.go).
- **`web`** is a React single-page app built with Create React App. It has no business logic:
  everything it shows comes from the api, through the services in `web/src/services/api.ts`.

The per-service conventions — how a handler is written, how errors are shaped, how state is
managed in the web — are in [`docs/architectures/`](docs/architectures/), in Spanish. Follow
them: the api diverges from the usual Go stack on purpose, and a change written for another
stack will not fit.

## Before touching voting or assignments

**Read [`api/internal/storage/migrations/004_constraints_and_triggers.go`](api/internal/storage/migrations/004_constraints_and_triggers.go)
first.** Part of the rules are PostgreSQL triggers, not Go code: that an assignment has exactly
`m` proposals, that nobody evaluates their own, that only assigned proposals can be voted.

- If a rule exists in both places — conflict of interest does — **change both in the same
  change**.
- A trigger violation reaches the client as a generic `500`. If a user can trigger it, validate
  it in Go first and return a `400` with a useful `code`.
- Test fixtures that insert directly have to respect the triggers, or the insert fails with an
  unhelpful plpgsql error.

The tests in `api/internal/domain/vote/voting_service_test.go` are the product's main safety
net. They must keep passing.

## Adding an endpoint

1. Declare it in `api/cmd/api/main.go`, **in the right group**. A route outside a group with
   `JWTAuthMiddleware` is public.
2. If the resource belongs to someone, add the permission middleware too. Authenticated is not
   authorised.
3. Answer errors as `{"error", "code"}`, and success wrapped in `data`.
4. Update [`docs/apis/api.yaml`](docs/apis/api.yaml) and
   [documentation/api-reference.md](documentation/api-reference.md).

## Changing the database

Migrations are Go, in `api/internal/storage/migrations/`, numbered in sequence and registered in
`migrations.go`. They run when the api starts.

**Adding a field to an entity is not enough**: the tables were created once by `AutoMigrate`,
so an existing database needs a migration with the `ALTER`. Implement `Down` as well.

## Tests

Every change that touches behaviour needs tests.

```sh
make test               # api and web unit tests — what CI runs
make test-integration   # api integration tests, against the local stack's PostgreSQL
```

| Project | Runner | Needs Docker |
| ------- | ------ | ------------ |
| `api` unit | `go test`, testify, hand-written mocks | no |
| `api` integration | `go test -tags=integration` | yes |
| `web` | Jest + Testing Library | no |

In the api, the mocks live in `mocks_*_test.go` next to the tests. **Adding a method to a
repository interface means adding it to the mock**, or the package stops compiling. Check the
error `code` in handler tests, not only the status.

In the web, query by what the user sees (`getByRole`, `getByText`), not by CSS class.

## Style

- **Go:** `gofmt`. `go vet` runs in CI.
- **Comments explain why**, not what the code does.
- **Comments and documentation in English.** The internal docs in `docs/` are in Spanish, and
  the interface currently mixes both languages.
- No `console.log` left in the web.

## Pull requests

- Branch off `dev` and keep the change focused on one thing.
- Say what problem it solves. If it fixes a bug, say how it reproduced.
- Update `CHANGELOG.md` under `[Unreleased]` for anything a user would notice.
- Make sure `make test` passes. CI runs the same suites.

If you are planning something large, open an issue first so we can agree on the approach.

## Releases

One version for the whole repository. `scripts/set-version.sh` sets it everywhere, and pushing
a `v1.2.3` tag publishes the images. See the policy in [CHANGELOG.md](CHANGELOG.md).
