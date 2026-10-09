# Utils - web

## ApiError

**Location:** `src/config/api.ts`
**Description:** Class thrown by `apiRequest`, `uploadFile` and `downloadFile`. `message` stays as before (`error || message`); `code` comes from `body.code` or, for middleware errors (`{ error: "UNAUTHORIZED", message }`), from `body.error`; `details` is the rest of the body. `getErrorCode(err)` reads the code from any error.

**Usage:**
```ts
try { await apiRequest(url); } catch (err) { const code = getErrorCode(err); }
```

---

## domain/stages (transitionDialog)

**Location:** `src/domain/stages.ts`
**Description:** Stage order and helpers (`STAGE_ORDER`, `stageIndex`, `getNextStage`, `stageNameKey`, `stageStatus`, `MIN_PROPOSALS_TO_VOTE = 3`). `transitionDialog` says which dialog runs the next step of each stage (`null` in Results). The client-side advance validation (`validateStageAdvance`, `requiresEstimatedEndDate`) was removed in S-016: each transition dialog validates its own fields and the backend codes are shown on failure.

**Signature:**
```ts
type TransitionDialog = 'openRegistration' | 'openVoting' | 'publishResults'
transitionDialog(stage: EventStage): TransitionDialog | null
```

**Usage:**
```ts
const dialog = transitionDialog(event.stage); // creation -> 'openRegistration'
```

---

## validateFile

**Location:** `src/domain/files.ts`
**Description:** Same rules as the backend: 8 MIME types, 10 485 760 bytes; type is evaluated before size; without MIME the extension decides.

**Signature:**
```ts
validateFile(file: { name: string; type: string; size: number }): { ok: true } | { ok: false; reason: 'too_large' | 'invalid_type' }
```

---

## Date helpers

**Location:** `src/domain/dates.ts`
**Description:** Dates without time are parsed in the local calendar (never `new Date('YYYY-MM-DD')`). Formatting takes the locale and uses `Intl`.

**Signature:**
```ts
endOfDay(date: string): Date
daysUntilClose(date: string, now?: Date): number
formatDate(date: string, locale: string): string
formatRelative(when: Date | string, locale: string, now?: Date): string
addDays(date: string, days: number): string
todayISO(now?: Date): string
DURATION_PRESETS = [3, 7, 14] as const   // days, shared by the deadline dialogs
DEFAULT_DURATION_DAYS = 7
type DeadlineIssue = 'not_after_today' | 'not_postponed'
validateNewDeadline(date: string, today: string): DeadlineIssue | null   // date must be > today
validatePostpone(date: string, current: string): DeadlineIssue | null    // date must be > current close
```

`validateNewDeadline` / `validatePostpone` compare `YYYY-MM-DD` strings (local calendar).

---

## validateThresholds / formatScore

**Location:** `src/domain/voting.ts`, `src/domain/score.ts`
**Description:** `validateThresholds` compares in hundredths (avoids `0.7 - 0.6` float error). `formatScore` shows `mbc_score × 10` with one decimal. The voting-config draft of the "Abrir votación" dialog starts from the preview (`recommended_m`, `min(3, m)` and the preview defaults); `validateVotingDraft` checks thresholds first, then the adjustment range; `isRecommendedConfig` tells whether an applied configuration matches the recommended one (thresholds in hundredths).

**Signature:**
```ts
validateThresholds(good: number, bad: number): 'not_greater' | 'gap_too_small' | null
recommendedMinEvaluations(m: number): number            // min(3, m)
initialVotingDraft(p: VotingConfigPreview): VotingConfigDraft
validateVotingDraft(d: VotingConfigDraft): ThresholdIssue | 'adjustment_out_of_range' | null
isRecommendedConfig(c: Pick<VotingConfiguration, 'attachments_per_evaluator' | 'min_evaluations_per_file'
  | 'adjustment_magnitude' | 'quality_good_threshold' | 'quality_bad_threshold'>): boolean
// VotingConfigDraft: attachments_per_evaluator, min_evaluations_per_file, adjustment_magnitude, quality_good_threshold, quality_bad_threshold
// constants: ADJUSTMENT_MIN = 1, ADJUSTMENT_MAX = 10, MIN_EVALUATIONS_MAX = 20, THRESHOLD_STEP = 0.05, MIN_THRESHOLD_GAP, DEFAULT_THRESHOLDS
```

**Usage:**
```ts
const draft = initialVotingDraft(preview);
const issue = validateVotingDraft(draft); // null -> can submit
```

---

## safeNextPath / loginPathFor

**Location:** `src/domain/redirect.ts`
**Description:** `safeNextPath` accepts only internal paths (starts with `/`, not `//` or `/\`), otherwise `/events`. `loginPathFor` builds `/login?next=<encoded path>`.

**Signature:**
```ts
safeNextPath(raw: string | null | undefined): string
loginPathFor(path: string): string
```

---

## domain/auth and scopedMessageKeyForError

**Location:** `src/domain/auth.ts`, `src/i18n/errors.ts`
**Description:** Pure form validation returning translation keys per field (`FieldErrors<K>`); display name is validated by length (3..100), not by character set. `scopedMessageKeyForError` translates an API error only if its `code` is in the page's allowed list (`errors.<code>`), network errors as `errors.network`, anything else as the page's own fallback key.

**Signature:**
```ts
isValidEmail(value: string): boolean
validateLogin({ email, password }): FieldErrors<'email' | 'password'>
validateRegister({ name, email, password }): FieldErrors<'name' | 'email' | 'password'>
validateNewPassword({ password, confirm }): FieldErrors<'password' | 'confirm'>
validateDisplayName(name: string): TranslationKey | undefined
scopedMessageKeyForError(err: unknown, codes: readonly string[], fallback: TranslationKey): TranslationKey
```

**Usage:**
```ts
setFormError(scopedMessageKeyForError(err, ['INVALID_PAYLOAD'], 'auth.register.error'));
```

---

## domain/events

**Location:** `src/domain/events.ts`
**Description:** Pure rules for the event lists. The front only interprets `my_status` (the ranking position is computed by the backend). Pending tasks exclude paused / cancelled events for upload and vote; row action follows the product-map table; `openEvents` sorts by closest registration close, then more participants.

**Signature:**
```ts
pendingTasks(events: MyEvent[]): PendingTask[]
rowAction({ event, userId, myEvent? }): RowAction            // { kind, variant, to, hint? }
stagePill(e): { key: TranslationKey; tone; icon }
myStatusLabel(e: MyEvent): { key; params? } | null
currentDeadline(e): string | null
openEvents(items: EventListItem[]): EventListItem[]
parseStageFilter(raw: string | null): 'all' | 'participation' | 'voting' | 'results'
```

**Usage:**
```ts
const tasks = pendingTasks(myEvents);
const action = rowAction({ event: row, userId: user?.id ?? null, myEvent: byId[row.id] });
```

---

## domain/eventForm

**Location:** `src/domain/eventForm.ts`
**Description:** Single source of the event form rules, shared by the create wizard and the edit dialog. Measures trimmed values by code points (the backend counts runes) and returns translation keys as field errors. `automaticEventDates` is computed in the local calendar (start tomorrow, end the day after).

**Signature:**
```ts
validateEventForm(values: EventFormValues, options?: { minCapacity?: number; fields?: readonly EventFormField[] }): FieldErrors<EventFormField>
toEventInput(values): EventCreateInput          // trims, snake_case
changedEventFields(initial, values): EventUpdate // only what changed (PATCH body)
hasEventFormData(values): boolean
automaticEventDates(now?: Date): { start_date: string; end_date: string }
canEditEvent(stage): boolean                     // creation | participation
minCapacityFor(registered: number): number
charCount(value: string): number
// constants: EVENT_NAME_MIN/MAX, EVENT_DESCRIPTION_MIN/MAX, EVENT_ORGANIZER_MAX, EVENT_CAPACITY_MIN/MAX/DEFAULT, EMPTY_EVENT_FORM
```

**Usage:**
```ts
const errors = validateEventForm(values, { fields: ['name', 'description', 'organizer'] });
const changes = changedEventFields(initial, values);
if (canEditEvent(event.stage)) { /* show "Editar datos" */ }
```

---

## domain/eventDetail

**Location:** `src/domain/eventDetail.ts`
**Description:** Pure rules for the event detail page, the only place that decides the "Tu próximo paso" state. `nextStepState(event, userId, myAttachment, assignment)` returns one of 11 states with priority cancelled > results > paused > stage states (a registered user of a full event stays in `upload` / `submitted`). `detailPill` and `progressSteps` return translation keys, never text. `splitResults` returns the podium (first 3 by `adjusted_rank`) and the rest without mutating its input. `shareUrl` / `shareLinks` build the share link and the five network URLs.

**Signature:**
```ts
nextStepState(event, userId: string | null, myAttachment: { id: string } | null, assignment: 'none' | 'pending' | 'completed' | null): NextStepState
detailPill(state, event, now?): { key; params?; tone: 'onBand' }
progressSteps(state, event, now?): DetailProgressStep[] | null
splitResults(ranking: AttachmentResult[]): { podium: AttachmentResult[]; rest: AttachmentResult[] }
shareUrl(origin: string, eventId: string): string
shareLinks(url: string, name: string): { network: ShareNetwork; href: string }[]
shareAudienceKey(stage): TranslationKey
afterKey(state, stage): TranslationKey | null
capacityOf(e) / isRegistered(e, userId) / isFull(e)
```

**Usage:**
```ts
const state = nextStepState(event, user?.id ?? null, myAttachment, assignmentStatus);
const { podium, rest } = splitResults(results.adjusted_ranking);
```

---

## domain/manage

**Location:** `src/domain/manage.ts`
**Description:** Pure rules for the organizer management page (S-016). Cancelled wins over the stage; pause is allowed unless cancelled or in Results. Pending files are participants without an attachment; pending votes are only those with `false` in `participant_voting_status` (absent = not participating). `managePill` priority is cancelled > paused > stage, adding the days to close when the stage deadline has not passed ("closes today" when 0). `reminderType` maps participation -> `file`, voting -> `vote`, otherwise `null`.

**Signature:**
```ts
type ManageStage = 'creation' | 'participation' | 'voting' | 'results' | 'cancelled'
manageStage(e: Pick<Event, 'stage' | 'is_cancelled'>): ManageStage
canPause(e: Pick<Event, 'stage' | 'is_cancelled'>): boolean
pendingFiles(participants: EventParticipant[], attachments: Pick<Attachment, 'participant_id'>[]): EventParticipant[]
pendingVotes(participants: EventParticipant[], status: Record<string, boolean> | undefined): EventParticipant[]
voteCell(participantId: string, status: Record<string, boolean> | undefined): 'sent' | 'pending' | 'notParticipating'
votingProgress(s: Pick<VotingStatistics, 'completed_assignments' | 'total_assignments'>): VotingProgress // { sent, total, missing, complete }
managePill(e: Event, now?: Date): ManagePill   // { key: ManagePillKey ('manage.pill.*'); params?: { count } }
reminderType(stage: EventStage): ReminderType | null
REMINDER_PREVIEW_LIMIT = 5
```

**Usage:**
```ts
const pill = managePill(event);           // t(pill.key, pill.params)
const type = reminderType(event.stage);   // null -> no reminder button
const recipients = type === 'file' ? pendingFiles(participants, attachments) : pendingVotes(participants, stats?.participant_voting_status);
```

---

## API services (S-016 changes)

**Location:** `src/services/api.ts`
**Description:** `EventService.updateEventStage` now accepts the voting configuration (sent in the same `PATCH /events/{id}/stage` when opening the voting) and returns `StageUpdateResult` (`voting` only when moving to voting). `EventService.sendReminder` calls `POST /events/{id}/reminders`. `DistributedVotingService.getVotingConfigPreview` reads `GET …/voting-config/preview` (`recommended_m` / `max_m` are never recomputed on the client); `getVotingConfig` reads the applied configuration and returns `null` on `CONFIG_NOT_FOUND`. Removed in S-016: `getEventParticipants`, `createVotingConfig`, `generateAssignments` (use `getParticipants` and the stage PATCH with `votingConfig`).

**Signature:**
```ts
EventService.updateEventStage(eventId: string, newStage: EventStage, estimatedEndDate?: string,
  votingConfig?: VotingConfigInput): Promise<StageUpdateResult>
EventService.sendReminder(eventId: string, type: ReminderType): Promise<ReminderResult>
DistributedVotingService.getVotingConfigPreview(eventId: string): Promise<VotingConfigPreview>
DistributedVotingService.getVotingConfig(eventId: string): Promise<VotingConfiguration | null>
```

**Usage:**
```ts
await EventService.updateEventStage(id, 'voting', date, { attachments_per_evaluator: m, min_evaluations_per_file: k });
const { recipients_count } = await EventService.sendReminder(id, 'vote');
```

---

## Stage and reminder types

**Location:** `src/types/index.ts`
**Description:** Types for the S-016 stage and reminder endpoints.

**Signature:**
```ts
type ReminderType = 'file' | 'vote'
interface ReminderResult { type: ReminderType; recipients_count: number }
interface VotingConfigInput { attachments_per_evaluator: number; quality_good_threshold?: number;
  quality_bad_threshold?: number; adjustment_magnitude?: number; min_evaluations_per_file?: number }
interface StageUpdateResult { stage: EventStage;
  voting?: { configuration: VotingConfiguration; assignments_count: number; total_attachments: number } }
```

---

## domain/ranking

**Location:** `src/domain/ranking.ts`
**Description:** Pure rules behind the ranking list (S-017). Positions stay unique because `move` only swaps neighbours. `hasChanged(order, null)` is `true`; `initialOrder` puts the draft's known ids first (by `rank`) and appends the rest in assignment order; `isValidOrder` validates what was read from `localStorage`; `submittedRankingKey(assignmentId)` is the key of the submitted-order reference (the api has no endpoint to read the submitted votes).

**Signature:**
```ts
move(order: readonly string[], index: number, direction: 'up' | 'down'): string[]
positionLabel(position: number, total: number): 'best' | 'middle' | 'worst'
hasChanged(order: readonly string[], submitted: readonly string[] | null): boolean
initialOrder(attachments: readonly { id: string }[], draft: readonly { attachment_id: string; rank: number }[] | null): string[]
toRankings(order: readonly string[]): { attachment_id: string; rank: number }[]
isValidOrder(order: unknown, attachments: readonly { id: string }[]): order is string[]
submittedRankingKey(assignmentId: string): string   // 'telescopio_submitted_ranking:{id}'
DRAFT_DEBOUNCE_MS = 500
```

**Usage:**
```ts
const next = move(order, index, 'down');
await DistributedVotingService.submitRankingVotes(eventId, userId, assignment.id, toRankings(order));
```

---

## fetchFile / saveBlob / openAssignedAttachment (S-017)

**Location:** `src/config/api.ts`, `src/services/api.ts`
**Description:** `fetchFile(endpoint)` requests a protected file with the JWT and returns the `Blob` (`ApiError` when not OK); `downloadFile` is `saveBlob(await fetchFile(...), filename)`. `AttachmentService.openAssignedAttachment` navigates a tab opened by the caller (synchronously in the click, so it is not blocked) to the blob URL; without a tab it saves the file with the neutral name `propuesta-{n}.{ext}`; on failure it closes the tab and rethrows. `DistributedVotingService.submitRankingVotes` now resolves `{ replaced: boolean }`.

**Signature:**
```ts
fetchFile(endpoint: string): Promise<Blob>
saveBlob(blob: Blob, filename: string): void
AttachmentService.openAssignedAttachment(attachmentId: string, position: number, mimeType: string, target: Window | null): Promise<void>
```

**Usage:**
```ts
const target = window.open('', '_blank');
await AttachmentService.openAssignedAttachment(a.id, number, a.mime_type, target);
```

