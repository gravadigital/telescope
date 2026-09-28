# HTTP API reference

The endpoints the api serves, taken from the route definitions in
[`api/cmd/api/main.go`](../api/cmd/api/main.go). Request and response schemas are in
[`docs/apis/api.yaml`](../docs/apis/api.yaml) (OpenAPI 3.0).

Everything is under `/api/v1`, except `/health`.

## How authentication works

**Authentication is declared per route group, not globally.** A route is public unless it is
registered in a group that applies `JWTAuthMiddleware`. When adding an endpoint, check which
group it goes into: that is the whole difference between protected and open.

The token is a JWT issued by the api itself — on registering, logging in or logging in with
Google — valid for **24 hours**, with no refresh. Send it as:

```
Authorization: Bearer <token>
```

**Authorization is a second layer**, declared on the route after authentication:

| In the table | Who passes |
|---|---|
| **public** | anyone, no token |
| **any user** | any authenticated user |
| **owner** | the event's creator, or an `admin` |
| **owner or organizer** | the above, or anyone with the global `organizer` role |
| **self or owner** | the participant named in the path, the event's creator, or an `admin` |
| **in handler** | authenticated; the handler decides from the resource — noted per endpoint |

## Health

| Method | Path | Access | What it does |
|---|---|---|---|
| `GET` | `/health` | public | Service status, database reachability and the running version (`0.2.0`, `dev-<sha>`, or `dev` for a local build). `503` if the database is down |

## Users and authentication

| Method | Path | Access | What it does |
|---|---|---|---|
| `POST` | `/users` | public | Register with email and password. Returns a JWT |
| `POST` | `/users/authenticate` | public | Log in. Returns a JWT |
| `POST` | `/users/forgot-password` | public | Email a reset link. Answers `200` whether or not the email exists |
| `POST` | `/users/reset-password` | public | Set a new password with the emailed token, valid for one hour and single-use |
| `POST` | `/auth/google/verify` | public | Check a Google access token. Returns a JWT if the user exists, or the profile to complete registration |
| `POST` | `/auth/google/register` | public | Create the account for a new Google user, with a chosen username |
| `GET` | `/users/{user_id}` | any user | A user's profile |
| `GET` | `/users/{user_id}/events` | in handler: only yourself | The events you take part in |

## Events

| Method | Path | Access | What it does |
|---|---|---|---|
| `GET` | `/events` | public | List events. Query: `page`, `limit` (1–100), `stage` |
| `GET` | `/events/{event_id}` | public | An event's detail. `include_stats=true` adds counts |
| `GET` | `/events/{event_id}/share` | public | Metadata for sharing the event link (Open Graph, Twitter) |
| `POST` | `/events` | any user | Create an event. The creator is taken from the token |
| `PATCH` | `/events/{event_id}/stage` | owner | Advance to the next stage. Requires `estimated_end_date` when entering `participation` or `voting` |
| `PATCH` | `/events/{event_id}/estimated-end-date` | owner | Postpone a stage's deadline. It cannot be brought forward |
| `PATCH` | `/events/{event_id}/pause` | owner | Pause, or resume — it toggles |
| `PATCH` | `/events/{event_id}/cancel` | owner | Cancel the event. Permanent |

## Participation

| Method | Path | Access | What it does |
|---|---|---|---|
| `POST` | `/events/{event_id}/register` | public | Register for the event with a name and email. **Creates the account if the email is new.** Only during `participation`, not while paused, and up to `max_participants` |
| `GET` | `/events/{event_id}/participants` | any user | The event's participants, with their role in it |

## Proposals

| Method | Path | Access | What it does |
|---|---|---|---|
| `POST` | `/events/{event_id}/participant/{participant_id}/attachment` | self or owner | Upload the participant's proposal: `multipart/form-data` with `file` and an optional `description` (up to 1000 characters). One per participant, only during `participation` |
| `GET` | `/events/{event_id}/attachments` | any user | The event's proposals, with their download URL |
| `GET` | `/attachments/{attachment_id}/download` | in handler: the proposal's owner, the event's creator, or an `admin` | Download the file. Streamed through the api |
| `DELETE` | `/attachments/{attachment_id}` | in handler: only the proposal's owner | Delete your proposal, so you can upload another. Only during `participation` |

## Voting

| Method | Path | Access | What it does |
|---|---|---|---|
| `POST` | `/events/{event_id}/voting-config` | owner or organizer | Set the voting parameters. Once per event; rejected if `m` breaks the model's limits |
| `POST` | `/events/{event_id}/generate-assignments` | owner or organizer | Hand out the proposals to evaluate. Once per event, during `voting` |
| `GET` | `/events/{event_id}/participants/{participant_id}/assignment` | self or owner | The proposals a participant has to rank |
| `PUT` | `/events/{event_id}/participants/{participant_id}/vote-draft` | self or owner | Save a partial ranking. Not validated; overwritten on each save |
| `GET` | `/events/{event_id}/participants/{participant_id}/vote-draft` | self or owner | The saved draft. `404 DRAFT_NOT_FOUND` when there is none yet |
| `POST` | `/events/{event_id}/participants/{participant_id}/ranking-votes` | self or owner | Submit the final ranking: ranks consecutive from 1, no duplicates. **Final** |
| `GET` | `/events/{event_id}/distributed-results` | any user | The global and adjusted rankings, and each evaluator's quality. During `voting` and `results` |
| `GET` | `/events/{event_id}/voting-statistics` | any user | Voting progress: who has submitted, completion rate |

> `GET /distributed-results` **recalculates and stores the results on every call**: it is not a
> read-only `GET`. Calling it repeatedly is harmless — the calculation is deterministic — but it
> is not free.

## Errors

The api has no single error shape. Most endpoints answer:

```json
{ "error": "Readable message", "code": "STABLE_CODE", "details": "optional" }
```

`code` is the stable identifier: match on it, not on the message. Three other shapes remain:

| Where | Shape |
|---|---|
| Authentication and permission checks (`401`, `403` before the handler) | `{"error": "UNAUTHORIZED", "message": "..."}` — here `error` holds the code |
| Some voting endpoints | `{"error": "..."}`, without `code` |
| A rule enforced by a database trigger | a generic `500` |

Success responses mostly wrap the payload in `data`. The exceptions: creating an event
answers `{event}`, the user endpoints `{user}`, the assignment `{assignment, ...}`, and
submitting a ranking or registering with Google answer without a wrapper.
