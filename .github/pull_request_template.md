## What and why

What problem this solves. If it fixes a bug, how it reproduced.

## How it was tested

- [ ] `make test` passes
- [ ] Tried it on the local stack (`make up`), if it changes behaviour

## Checklist

- [ ] `CHANGELOG.md` updated under `[Unreleased]`, if a user would notice
- [ ] If it touches voting or assignment rules: checked the Postgres triggers too
      (`api/internal/storage/migrations/004_constraints_and_triggers.go`)
- [ ] If it changes the HTTP contract: `docs/apis/api.yaml` updated
