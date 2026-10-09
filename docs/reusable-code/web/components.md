# Components - web

All text reaches the components through props (no embedded copy); CSS uses only tokens from `src/styles/tokens.css`. Primitives are re-exported from `src/components/ui/index.ts`; event composites are imported by path.

## Button

**Location:** `src/components/ui/button/Button.tsx`
**Description:** Action button. `variant="icon"` requires `aria-label` (discriminated union). In `loading` it shows `loadingLabel`, sets `aria-busy` and is not clickable.

**Props:** `variant`, `size`, `loading`, `loadingLabel`, `disabled`, `iconStart`, `iconEnd`, `fullWidth`, `type`, `onClick`.

**Usage:**
```tsx
<Button variant="primary" size="lg" onClick={submit}>{t('proposal.send')}</Button>
<Button variant="icon" aria-label={t('common.close')} iconStart={<CloseIcon />} />
```

---

## Dialog

**Location:** `src/components/ui/dialog/Dialog.tsx`
**Description:** The only modal overlay. Renders in a portal only when `open`; marks the rest of the page `inert`, traps focus, closes with Escape (unless `busy`) and returns focus to the trigger. `variant="alert"` uses `alertdialog` and does not close on backdrop click.

**Props:** `open`, `onClose`, `variant`, `size`, `eyebrow`, `title`, `busy`, `actions`, `closeLabel`, `describedBy`, `initialFocusRef`.

**Usage:**
```tsx
<Dialog open={open} onClose={close} title={t('stage.open')} closeLabel={t('common.close')} actions={<Button>...</Button>}>
  ...
</Dialog>
```

---

## DataTable

**Location:** `src/components/ui/data-table/DataTable.tsx`
**Description:** Generic semantic table. One action per row (`rowAction`), highlighted row, loading skeleton. On mobile each row is stacked using `data-label`. Empty and error states are decided by the screen.

**Usage:**
```tsx
<DataTable columns={cols} rows={events} rowKey={(e) => e.id} caption={t('events.title')}
  rowAction={(e) => ({ label: t('events.manage', { name: e.name }), onClick: () => open(e) })} />
```

---

## FileDropzone

**Location:** `src/components/ui/file-dropzone/FileDropzone.tsx`
**Description:** File picker and drop zone. Validates type and size with `domain/files` and reports `onReject('too_large' | 'invalid_type' | 'multiple')`. Shows the chosen file or the already submitted one as a FileChip.

---

## DateQuickPicker / NumberStepper / TextField / Menu / FilterTabs

**Location:** `src/components/ui/{date-quick-picker,number-stepper,text-field,menu,filter-tabs}/`
**Description:** Accessible form and navigation controls. `DateQuickPicker` is controlled with ISO dates and takes `presets: { days, label }[]`; the optional `base` (ISO) is the date the presets are added to and takes priority over the variant default (today for `fromToday`, initial value for `postpone`). `NumberStepper` never propagates an out-of-range value; with a decimal `step` (e.g. `THRESHOLD_STEP = 0.05`) − / + snap to the step grid rounded to hundredths (no `0.6500000001`), typed decimals are accepted and the input uses `inputMode="decimal"`. `TextField` forwards its `ref`.

**Usage:**
```tsx
<DateQuickPicker variant="postpone" base={current} value={value} presets={presets} locale={locale} label={...} changeLabel={...} onChange={setValue} />
<NumberStepper value={good} min={0} max={1} step={THRESHOLD_STEP} label={...} decrementLabel={...} incrementLabel={...} onChange={setGood} />
```

---

## Icons

**Location:** `src/components/ui/icons/Icons.tsx`
**Description:** Inline SVG icons (`IconProps` = SVG props) built on `BaseIcon` (stroke) or `BrandIcon` (filled path). S-016 adds `EditIcon` (pencil, "edit deadline") and `BellIcon` (reminders). S-017 adds `ArrowUpIcon` and `ArrowDownIcon` (move a ranking row).

**Usage:**
```tsx
<Button variant="tertiary" iconStart={<BellIcon width={16} height={16} />}>{t('manage.remind')}</Button>
```

---

## Event composites

**Location:** `src/components/events/{event-hero,stage-timeline,next-step-card,progress-checklist}/`
**Description:** Presentational structure shared by the event detail and management screens. `StageTimeline` shows only the current stage on mobile (`variant="compact"` always shows the four names).

---

## Global layout (AppHeader, AppLayout, UserMenu, LanguageSelect, RequireAuth)

**Location:** `src/components/layout/{app-header,app-layout,user-menu,language-select,require-auth}/`
**Description:** Global chrome. `AppLayout` is the parent route (`<Outlet />` inside `<main id="main">`, footer from `footer.tagline`). `AppHeader` shows nothing while `loading`; visitors get `LanguageSelect` plus links to `/login` and `/register`; signed-in users get a reserved `[data-slot="notifications"]` and `UserMenu`. On mobile the links move into a `Menu`. `RequireAuth` wraps protected routes.

**Usage:**
```tsx
<Route element={<AppLayout />}>
  <Route path="/events/create" element={<RequireAuth><CreateEventPage /></RequireAuth>} />
</Route>
```

---

## Menu (selectable items in actions)

An item with `selected` defined in `variant="actions"` renders as `menuitemradio` with `aria-checked` and a check mark; items without it stay `menuitem`.

---

## AuthLayout, RedirectIfAuthenticated, GoogleButton

**Location:** `src/components/layout/{auth-layout,redirect-if-authenticated}/`, `src/components/auth/google-button/`
**Description:** `AuthLayout` renders the split layout of the auth pages (brand `aside` 5/12 + form `section` 7/12 from 768px; compact brand strip without benefits on mobile) and exports helper classes `.ly-auth__form`, `__separator`, `__alt`, `__back`, `__aside-link`, `__text`. `RedirectIfAuthenticated` is the inverse of `RequireAuth`. `GoogleButton` has no text of its own; pages mount it only when `RUNTIME_CONFIG.GOOGLE_CLIENT_ID` is set.

**Signature:**
```ts
AuthLayout({ brandTitle: string; benefits?: string[]; backLink?: { to: string; label: string; state?: unknown };
  title: string; headingRef?: React.Ref<HTMLHeadingElement>; children })
GoogleButton({ label: string; onToken(accessToken: string): void; onError(): void; disabled?: boolean })
```

**Usage:**
```tsx
<Route path="/login" element={<RedirectIfAuthenticated><LoginPage /></RedirectIfAuthenticated>} />
<AuthLayout brandTitle={t('auth.login.brandTitle')} title={t('auth.login.title')}>...</AuthLayout>
```

---

## PendingCard

**Location:** `src/components/events/pending-card/PendingCard.tsx`
**Description:** One "Tus pendientes" card built with `Card`: heading by task kind, event name, closing date (upload / vote) or ranking position (results), and a single link styled as a primary button to `/events/{id}`. No business logic: everything comes in `task`.

**Signature:**
```ts
PendingCard({ task: PendingTask })
```

**Usage:**
```tsx
pendingTasks(myEvents).slice(0, PENDING_LIMIT).map((task) => <PendingCard key={task.event.id} task={task} />)
```

---

## EventsTable

**Location:** `src/components/events/events-table/EventsTable.tsx`
**Description:** Column configuration over `DataTable` shared by Events and My events. `public` (Event / Stage / Participants / Created), `organizer` (… / Closes) and `participant` (Event / Stage / My status / Closes). The row action comes from `rowAction` and uses the new `hint` and `accessibleLabel` props of `DataTableRowAction`.

**Signature:**
```ts
EventsTable({ variant: 'public' | 'organizer' | 'participant'; caption: string; captionHidden?: boolean;
  rows: EventListItem[] | MyEvent[]; userId: string | null; myEventsById?: Record<string, MyEvent>;
  loading?: boolean; skeletonRows?: number })
```

**Usage:**
```tsx
<EventsTable variant="public" caption={t('events.list.title')} captionHidden rows={items} userId={user?.id ?? null} myEventsById={byId} />
```

---

## EventPreview

**Location:** `src/components/events/event-preview/EventPreview.tsx`
**Description:** Decorative card (`aria-hidden`, no focusable elements) showing how an event will look in the list once registration opens: "Registration open" pill, name, 2-line description, "by {organizer}" and a `0 / {capacity}` progress bar. Empty name / description show muted placeholders; an empty organizer falls back to `fallbackOrganizer`.

**Signature:**
```ts
EventPreview({ name: string; description: string; organizer: string; capacity: number; fallbackOrganizer: string })
```

**Usage:**
```tsx
<EventPreview name={values.name} description={values.description} organizer={values.organizer}
  capacity={values.maxParticipants} fallbackOrganizer={user?.name ?? ''} />
```

---

## EditEventDialog

**Location:** `src/components/events/edit-event-dialog/EditEventDialog.tsx`
**Description:** Dialog to edit name, description, organizer and capacity of an event in Creation or Participation via `PATCH /events/{id}`. Preloads the current data, sends only the changed fields, raises the capacity minimum to the registered count (and to `details.current_count` after `MAX_PARTICIPANTS_BELOW_REGISTERED`), and confirms discarding unsaved changes inside the same dialog. Calls `onSaved(updated)` then `onClose()`.

**Signature:**
```ts
EditEventDialog({ open: boolean; event: Event; onClose: () => void; onSaved: (event: Event) => void })
```

**Usage:**
```tsx
<EditEventDialog open={editOpen} event={event} onClose={() => setEditOpen(false)}
  onSaved={(updated) => setEvent((prev) => ({ ...prev, ...updated }))} />
```

---

## ShareDialog

**Location:** `src/components/events/share-dialog/ShareDialog.tsx`
**Description:** Share dialog (O-14) for an event. Builds the link on the client (`${origin}/events/${id}`), shows what whoever opens it will see per stage, copies with "✓ Copiado" for 2 s (a `role="status"` region announces it) and, if the clipboard fails or is missing, shows a warning and selects the link field. Lists WhatsApp, X, LinkedIn, Facebook and Email (`target="_blank"` except Email) and, only when `navigator.share` exists, a mobile-only "Más opciones" button (a user `AbortError` is ignored). Also reused by S-016.

**Signature:**
```ts
ShareDialog({ open: boolean; eventId: string; eventName: string; stage: EventStage; onClose: () => void })
```

**Usage:**
```tsx
<ShareDialog open={shareOpen} eventId={event.id} eventName={event.title} stage={event.stage}
  onClose={() => setShareOpen(false)} />
```

---

## ParticipantsTable

**Location:** `src/components/events/participants-table/ParticipantsTable.tsx`
**Description:** Participants table on `DataTable` with a visually hidden caption and 4 skeleton rows while loading. Discriminated by `variant`:
- `public` (default): name and registration date (`created_at` formatted with the locale). Never renders the email.
- `organizer`: name, email, file (tertiary button with the file name calling `onDownload(attachment)`, or a warning "missing" pill) and, depending on `stage`, the registration date or (in `voting`) a vote pill from `voteCell` (sent / pending / not participating). `voteUnavailable` shows "—" when the statistics failed.

**Signature:**
```ts
ParticipantsTable(
  | { variant?: 'public'; rows: EventParticipant[]; caption: string; loading?: boolean }
  | { variant: 'organizer'; rows: EventParticipant[]; caption: string; loading?: boolean; stage: EventStage;
      attachments: Attachment[]; votingStatus?: Record<string, boolean>; voteUnavailable?: boolean;
      onDownload?: (attachment: Attachment) => void }
)
```

**Usage:**
```tsx
<ParticipantsTable rows={participants} caption={t('participants.title', { count, max })} />
<ParticipantsTable variant="organizer" rows={participants} caption={...} stage={event.stage} attachments={attachments}
  votingStatus={stats?.participant_voting_status} voteUnavailable={statsFailed} onDownload={download} />
```

---

## ParticipantsDialog

**Location:** `src/components/events/participants-dialog/ParticipantsDialog.tsx`
**Description:** Participants dialog (O-08). Every time it opens it calls `EventService.getParticipants(eventId)` and shows a skeleton table with a status message, an empty state, an error callout with "Reintentar", or the table. Footer has a "Cerrar" button.

**Signature:**
```ts
ParticipantsDialog({ open: boolean; eventId: string; count: number; max: number; onClose: () => void })
```

**Usage:**
```tsx
<ParticipantsDialog open={open} eventId={event.id} count={ids.length} max={capacityOf(event)} onClose={close} />
```

---

## Podium

**Location:** `src/components/voting/podium/Podium.tsx`
**Description:** Ordered list `aria-label="Podio"` with one card per place ("Puesto N", participant or "—", file name, "{score} pts" on the 0-10 scale). The current user's item gets a "Tú" pill and the class `vt-podium__item--you`. Three columns from 768px, stacked on mobile.

**Signature:**
```ts
Podium({ entries: AttachmentResult[]; currentUserId: string | null })
```

**Usage:**
```tsx
<Podium entries={splitResults(results.adjusted_ranking).podium} currentUserId={user?.id ?? null} />
```

---

## RankingList

**Location:** `src/components/voting/ranking-list/RankingList.tsx`
**Description:** "Ranking completo" table (position, participant, proposal, score) on `DataTable`, stacked with labels on mobile. The current user's row is highlighted and marked "Tú".

**Signature:**
```ts
RankingList({ entries: AttachmentResult[]; currentUserId: string | null })
```

**Usage:**
```tsx
<RankingList entries={splitResults(results.adjusted_ranking).rest} currentUserId={user?.id ?? null} />
```

---

## SortableRankList

**Location:** `src/components/voting/sortable-rank-list/SortableRankList.tsx`
**Description:** Ordered list of the proposals assigned to the evaluator. Each row shows the position, "Propuesta N" (N = index in `attachments`, never the api `label` and never the author or original file name), `TYPE · size`, the optional description, "Ver archivo" and a position label (best / middle / least). In `editable` mode it has ↑ ↓ icon buttons (disabled at the edges or with `disabled`); moving swaps with the neighbour, announces the new position in an `aria-live="polite"` region and keeps focus on the same row's button (or the other one if it became disabled). The component is controlled: the page owns the order, the draft debounce and the submission. Mobile-first; ↑ ↓ are 44 px; one row per line, in one line from 768 px.

**Signature:**
```ts
SortableRankList({ attachments: AssignedAttachment[]; order: string[]; mode: 'editable' | 'readonly';
  onChange?: (order: string[]) => void; onOpenFile: (a: AssignedAttachment, number: number) => void;
  disabled?: boolean })
```

**Usage:**
```tsx
<SortableRankList mode="editable" attachments={assignment.attachments} order={order}
  onChange={setOrder} onOpenFile={openFile} disabled={submitting} />
```

---

## EventResults

**Location:** `src/components/voting/event-results/EventResults.tsx`
**Description:** Public results block. Loads `GET /distributed-results`; renders `Podium`, `RankingList` (only if there is a 4th place) and the score note. `RESULTS_NOT_CALCULATED` or an empty `adjusted_ranking` show "Los resultados todavía no están disponibles." (not an error); other failures show an error callout with "Reintentar". By default it never calls the recalculate endpoint; with `recalculateIfMissing` (management page, S-016) a `RESULTS_NOT_CALCULATED` triggers one `POST …/distributed-results/recalculate` per load (eventId + retry attempt; a re-run effect reuses the same promise). Used by the event detail and the management page.

**Signature:**
```ts
EventResults({ eventId: string; currentUserId: string | null; onLoaded?: (results: VotingResults) => void;
  recalculateIfMissing?: boolean })
```

**Usage:**
```tsx
<EventResults eventId={event.id} currentUserId={user?.id ?? null} onLoaded={setResults} />
```

---

## Stage transition and management dialogs (S-016)

**Location:** `src/components/events/{open-registration-dialog,edit-deadline-dialog,open-voting-dialog,publish-results-dialog,reminder-dialog}/`
**Description:** Organizer dialogs on `Dialog`, each calling the API itself and reporting success with `onDone`. Errors go through `scopedMessageKeyForError` with each dialog's allowed codes and show an error `Callout`; while saving, `Dialog` is `busy` and Cancel is disabled. `OpenRegistrationDialog`, `EditDeadlineDialog` and `OpenVotingDialog` mount their content only when `open`, so every opening starts from the initial values without errors. Which dialog runs the next step of a stage comes from `transitionDialog(stage)`.

- **OpenRegistrationDialog** - Creation → Participation. `DateQuickPicker` `fromToday` with `DURATION_PRESETS` (default today + `DEFAULT_DURATION_DAYS`), initial focus on the selected preset, blocks dates not after today (`validateNewDeadline`). Calls `EventService.updateEventStage(eventId, 'participation', date)`.
- **EditDeadlineDialog** - Postpones the current deadline of `participation` or `voting`. Presets counted from the current close (`base={currentDate}`), default current + 7, rejects dates not after the current close (`validatePostpone`). Calls `EventService.updateEstimatedEndDate(eventId, stage, date)`.
- **OpenVotingDialog** - Participation → Voting. On open loads `DistributedVotingService.getVotingConfigPreview` (skeleton / error + retry), shows proposals / reviewers / files per reviewer, a "left out" warning and the minimum-proposals error when `can_open_voting` is false. Fields: voting deadline, files per reviewer (`min_m..max_m`, min evaluations follow `recommendedMinEvaluations` until touched) and a collapsible advanced section (min evaluations, adjustment, good / bad thresholds with `THRESHOLD_STEP`) validated with `validateVotingDraft`. Calls `EventService.updateEventStage(eventId, 'voting', date, votingConfig)`.
- **PublishResultsDialog** - Voting → Results, `variant="alert"`. With `progress.missing > 0` shows a warning ("{missing} of {total}") and the confirm label changes to "publish anyway"; initial focus on "Wait". Calls `EventService.updateEventStage(eventId, 'results')`.
- **ReminderDialog** - Manual `file` / `vote` reminder. Lists the first `REMINDER_PREVIEW_LIMIT` recipients plus "and {n} more"; with no recipients shows a notice and disables Send. `EVENT_PAUSED_OR_CANCELLED` has its own message. Calls `EventService.sendReminder(eventId, type)` and `onDone(result)`.

**Signature:**
```ts
OpenRegistrationDialog({ open: boolean; eventId: string; today?: string; onClose: () => void; onDone: () => void })
EditDeadlineDialog({ open: boolean; eventId: string; stage: 'participation' | 'voting'; currentDate: string;
  onClose: () => void; onDone: () => void })
OpenVotingDialog({ open: boolean; eventId: string; today?: string; onClose: () => void; onDone: () => void })
PublishResultsDialog({ open: boolean; eventId: string; progress: VotingProgress; onClose: () => void; onDone: () => void })
ReminderDialog({ open: boolean; eventId: string; type: ReminderType; recipients: EventParticipant[];
  onClose: () => void; onDone: (result: ReminderResult) => void })
```

**Usage:**
```tsx
<PublishResultsDialog open={dialog === 'publishResults'} eventId={event.id} progress={votingProgress(stats)}
  onClose={close} onDone={reload} />
<ReminderDialog open={reminderOpen} eventId={event.id} type={reminderType(event.stage)!}
  recipients={pendingFiles(participants, attachments)} onClose={close} onDone={(r) => toast(r.recipients_count)} />
```


## Notifications (S-018)

**Location:** `src/components/notifications/{notification-item,notification-bell,notification-panel}/`

**Description:**
- **NotificationItem** - Renders one `AppNotification` using `describe()` from `domain/notifications` (returns nothing for unknown types). Unread items show a dot, bold title, `--bg-unread` background and a visually hidden "unread" text. `variant="panel"`: the whole item is a `<button>` with "{action} →"; `variant="page"`: tag + relative time and an action `Button` (`primary` when `isActionable`, else `secondary`).
- **NotificationBell** - `Button variant="icon"` with `BellIcon`, visible counter only when `unreadCount > 0` and `aria-label` including the count. On desktop (`min-width: 768px`) toggles the panel (`aria-expanded`, `aria-controls`); on mobile navigates to `/notifications`.
- **NotificationPanel** - `role="dialog"` without `aria-modal`; loads `NotificationService.list({ limit: PANEL_LIMIT })` on mount, moves focus to the first item, closes with Escape (focus back to the bell), `mousedown` outside or focus leaving; "Mark all as read" keeps it open. It does not trap focus.

**Signature:**
```ts
NotificationItem({ notification: AppNotification; variant: 'panel' | 'page';
  onActivate: (n: AppNotification, d: NotificationDescription) => void; now?: Date })
NotificationBell()                       // needs NotificationsProvider
NotificationPanel({ id: string; onClose: (reason: 'escape' | 'outside' | 'navigate' | 'blur') => void;
  bellRef: React.RefObject<HTMLButtonElement | null> })
```

**Usage:**
```tsx
<NotificationItem notification={n} variant="page" onActivate={(n, d) => navigate(d.route)} />
```
