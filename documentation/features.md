# What Telescope does

An organizer opens a call, participants submit one proposal each, and then the participants
themselves evaluate each other's proposals. The result is a ranking nobody had to produce by
hand.

## Events and their stages

An **event** is a call for proposals. It moves through four stages, always forward, never
skipping one:

```
creation → participation → voting → results
```

| Stage | What happens |
|---|---|
| `creation` | The organizer sets it up. Nobody else can join yet. |
| `participation` | People register through the event's shareable link and upload their proposal. |
| `voting` | The organizer configures the voting and generates the assignments; each participant ranks the proposals they got. |
| `results` | The ranking is published. |

Only the organizer advances the stage, and each step is irreversible from the interface.
Entering `participation` or `voting` requires an estimated end date for that stage; entering
`voting` requires at least two proposals.

Independently of the stage, an event can be **paused** (nobody can register or upload while
paused) and **cancelled** (permanent). The estimated end date of a stage can be postponed,
never brought forward.

Every stage change, pause, cancellation and new deadline is emailed to the participants, if
email is configured.

## People and roles

Anyone can create an account with email and password, or with Google if it is configured.

**Registering for an event does not require an account.** The event's shareable link asks for a
name and an email; if the email is new, an account is created on the spot, without a password.
That person can set one later through *forgot password*.

Roles exist at two levels:

| Level | Values | What it decides |
|---|---|---|
| Global | `admin`, `organizer`, `participant` | What someone can do in the system. `admin` passes every event permission check. |
| Per event | `creator`, `participant` | Who runs *this* event. |

The same person can be the creator of one event and a participant in another. **The creator of
an event cannot take part in it**: they cannot register or submit a proposal.

## Proposals

Each participant submits **one** proposal per event, during `participation`: a file of up to
10 MB (JPEG, PNG, GIF, PDF, TXT, DOC or DOCX) with an optional description of up to 1000
characters. It can be deleted and replaced while the stage lasts.

A proposal can be downloaded by its owner, the event's creator and administrators.

## How the voting works

This is what makes Telescope different, and what participants most need to understand.

### 1. Configuration

Once the event is in `voting`, the organizer sets the parameters:

| Parameter | Default | Meaning |
|---|---|---|
| `m` — proposals per evaluator | recommended by the interface | How many proposals each participant evaluates |
| minimum evaluations per proposal | 3 | How many evaluators each proposal should get |
| good quality threshold | 0.6 | At or above this, an evaluator is rewarded |
| bad quality threshold | 0.3 | At or below this, an evaluator is penalised |
| adjustment | 3 | How many positions a reward or penalty moves a proposal |

`m` has hard limits. It cannot exceed the number of proposals minus one — nobody evaluates
their own — and it must be at least `2·log₂(k)` for `k` proposals, the condition for the
ranking to converge (relaxed for ten proposals or fewer). With few proposals the valid range is
narrow: with four, `m` can only be 2 or 3.

**The configuration is set once.** There is no way to change it, or to regenerate the
assignments, afterwards.

### 2. Assignment

The system hands each participant `m` proposals, never their own, trying to give every
proposal at least the minimum number of evaluations.

### 3. Ranking

Each participant orders their `m` proposals from best (1) to worst. Progress is saved as a
draft, so the work can be left and resumed. **Submitting is final**: a submitted ranking cannot
be changed.

### 4. Results

From all the rankings, Telescope computes:

- **The global ranking**, by Modified Borda Count: each proposal scores by the positions it
  received, normalised to `[0, 1]`. Ties are broken by number of votes and then by id, so the
  same votes always give the same order.
- **Each evaluator's quality**, between 0 and 1: how closely their ranking matched the global
  one, over the proposals they were given. **Someone who did not submit gets 0.**
- **The adjusted ranking**: the proposal of each good evaluator moves up by the adjustment, and
  that of each poor evaluator moves down by it.

Both rankings are shown. The consequence to explain to participants: **evaluating carefully
improves your own proposal's position, and not evaluating at all pushes it down.**

## What Telescope does not do

- **No re-evaluation.** Assignments and the voting configuration are fixed once created.
- **No going back a stage.** Advancing is irreversible.
- **No managing organizers from the interface.** Global roles are set in the database.
- **No retries for email.** If a notification fails, it is lost.
