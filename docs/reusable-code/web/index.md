# Reusable Code - web

This document lists the reusable code documented so far for this service (incremental: only elements added by implemented stories; it is not a full scan). Each category has its own file with details.

## Components

**Total: 42**

- **Button** (`src/components/ui/button/Button.tsx`) - Variants primary / secondary / tertiary / onBand / icon, sizes sm / md / lg, loading state; `icon` requires `aria-label`
- **TextField** (`src/components/ui/text-field/TextField.tsx`) - Text, multiline with counter and search variants; label, help, error, password toggle
- **Dialog** (`src/components/ui/dialog/Dialog.tsx`) - Only modal overlay: portal, focus trap, Escape, inert page, focus return, `alert` variant
- **DataTable** (`src/components/ui/data-table/DataTable.tsx`) - Generic table with one action per row, stacked on mobile with `data-label`
- **FilterTabs** (`src/components/ui/filter-tabs/FilterTabs.tsx`) - Tablist with counts and arrow / Home / End navigation
- **StatusPill** (`src/components/ui/status-pill/StatusPill.tsx`) - Status chip with tones success / warning / action / neutral / onBand
- **StatTile** (`src/components/ui/stat-tile/StatTile.tsx`) - Metric with optional total, progress bar and loading skeleton
- **Callout** (`src/components/ui/callout/Callout.tsx`) - Info / warning / error / success notice; `error` is `role="alert"` and can carry a retry action
- **EmptyState** (`src/components/ui/empty-state/EmptyState.tsx`) - Inline or page empty state with a single action
- **Card** (`src/components/ui/card/Card.tsx`) - Surface with variants default / subtle / raised / feature / interactive
- **ProgressBar** (`src/components/ui/progress-bar/ProgressBar.tsx`) - `role="progressbar"` with tone and size
- **NumberStepper** (`src/components/ui/number-stepper/NumberStepper.tsx`) - Bounded number with − / +, recommended mark and range error; a decimal `step` snaps to the step grid in hundredths and accepts decimal input
- **DateQuickPicker** (`src/components/ui/date-quick-picker/DateQuickPicker.tsx`) - Date with duration presets (from today or postpone) and native calendar; `base` overrides the date the presets are added to
- **FileDropzone** (`src/components/ui/file-dropzone/FileDropzone.tsx`) - File picker / drop zone validated with `domain/files`, includes the FileChip; `onReplace` tells the page a replacement started and `submitted` resets it
- **Menu** (`src/components/ui/menu/Menu.tsx`) - Dropdown menu (actions / select) with roving focus
- **Icons** (`src/components/ui/icons/Icons.tsx`) - Inline SVG icons on `BaseIcon` / `BrandIcon`; S-016 adds `EditIcon` (pencil) and `BellIcon` (reminder)
- **AppHeader / AppLayout** (`src/components/layout/app-header/AppHeader.tsx`, `src/components/layout/app-layout/AppLayout.tsx`) - Global band (logo, links, notifications slot, language and user menus) and layout route with header, `<main>` and footer
- **UserMenu / LanguageSelect** (`src/components/layout/user-menu/UserMenu.tsx`, `src/components/layout/language-select/LanguageSelect.tsx`) - User menu with avatar initials and language radio items; ES / EN selector for visitors
- **RequireAuth** (`src/components/layout/require-auth/RequireAuth.tsx`) - Route guard: waits for `loading`, then redirects to `/login?next=<route>`
- **AuthLayout / RedirectIfAuthenticated** (`src/components/layout/auth-layout/AuthLayout.tsx`, `src/components/layout/redirect-if-authenticated/RedirectIfAuthenticated.tsx`) - Split brand / form layout for the auth pages (no global chrome) and the inverse guard that sends signed-in users to `next`
- **GoogleButton** (`src/components/auth/google-button/GoogleButton.tsx`) - "Continue with Google" button (implicit flow) with label by prop
- **EventHero** (`src/components/events/event-hero/EventHero.tsx`) - Dark band with back link, pills, title, meta and actions
- **StageTimeline** (`src/components/events/stage-timeline/StageTimeline.tsx`) - Four-stage timeline (full / compact) with editable deadline; `summaryDetail` adds the deadline to the mobile summary
- **NextStepCard** (`src/components/events/next-step-card/NextStepCard.tsx`) - Raised card for the next step with checklist, consequence and actions
- **ProgressChecklist** (`src/components/events/progress-checklist/ProgressChecklist.tsx`) - Numbered participant progress
- **PendingCard** (`src/components/events/pending-card/PendingCard.tsx`) - Card for one pending task (upload / vote / results) with event, deadline or position and a single action link
- **EventsTable** (`src/components/events/events-table/EventsTable.tsx`) - Event table on `DataTable` with variants `public` / `organizer` / `participant`; stage pill, capacity bar and one resolved action per row
- **EventPreview** (`src/components/events/event-preview/EventPreview.tsx`) - Decorative `aria-hidden` card previewing how an event will look in the list (pill, name, description, organizer, 0 / capacity)
- **EditEventDialog** (`src/components/events/edit-event-dialog/EditEventDialog.tsx`) - Edit name / description / organizer / capacity via PATCH; only changed fields, capacity minimum = registered, inline discard confirmation
- **ShareDialog** (`src/components/events/share-dialog/ShareDialog.tsx`) - Share dialog (O-14): link built on the client, "Copiar" with 2 s "✓ Copiado" and failure notice, five networks, native "Más opciones" when `navigator.share` exists
- **ParticipantsTable** (`src/components/events/participants-table/ParticipantsTable.tsx`) - Participants table on `DataTable`: `public` (name and registration date; never the email) or `organizer` (name, email, file download / "missing" pill and, by stage, registration date or vote pill)
- **ParticipantsDialog** (`src/components/events/participants-dialog/ParticipantsDialog.tsx`) - Participants dialog (O-08): loads on open with skeleton / empty / error + retry
- **OpenRegistrationDialog** (`src/components/events/open-registration-dialog/OpenRegistrationDialog.tsx`) - Creation → Participation: registration deadline with 3 / 7 / 14-day presets (default today + 7), `validateNewDeadline`, PATCH stage
- **EditDeadlineDialog** (`src/components/events/edit-deadline-dialog/EditDeadlineDialog.tsx`) - Postpone the participation / voting deadline: presets counted from the current close, `validatePostpone`, `updateEstimatedEndDate`
- **OpenVotingDialog** (`src/components/events/open-voting-dialog/OpenVotingDialog.tsx`) - Participation → Voting: loads the voting-config preview, voting deadline, files per reviewer and advanced settings; sends the config in the same PATCH stage
- **PublishResultsDialog** (`src/components/events/publish-results-dialog/PublishResultsDialog.tsx`) - Voting → Results `alert` dialog; warns about missing votes ("Publicar igual"), initial focus on "Esperar"
- **ReminderDialog** (`src/components/events/reminder-dialog/ReminderDialog.tsx`) - Manual file / vote reminder: lists up to `REMINDER_PREVIEW_LIMIT` recipients + "y {n} más", `EventService.sendReminder`, `onDone(result)`
- **Podium** (`src/components/voting/podium/Podium.tsx`) - Top-3 results as cards with score on a 0-10 scale and the current user marked "Tú"
- **RankingList** (`src/components/voting/ranking-list/RankingList.tsx`) - Results table from 4th place on `DataTable` with the current user's row highlighted
- **EventResults** (`src/components/voting/event-results/EventResults.tsx`) - Public results block: loads `distributed-results`, handles loading / not calculated / error + retry; recalculates once only with `recalculateIfMissing` (management); `onLoaded(results)`

See full details in [components.md](./components.md)

## Hooks

- **useT / I18nProvider** (`src/i18n/I18nProvider.tsx`) - Own i18n over `Intl` (ADR-010): `t(key, params)`, `locale`, `setLocale`, `fmt` formatters; typed `es` / `en` catalogs, `messageKeyForError(err)` for API errors

- **useGoogleSignIn** (`src/hooks/useGoogleSignIn.ts`) - Two-step Google flow shared by login and register: existing user signs in and goes to `next`; new user goes to `/complete-profile` with the credential in router state only

See full details in [hooks.md](./hooks.md)

## Utils

**Total: 16**

- **ApiError / getErrorCode** (`src/config/api.ts`) - Error thrown by `apiRequest`, `uploadFile` and `downloadFile` with `status`, `code` and `details`
- **domain/stages** (`src/domain/stages.ts`) - Stage order, next stage, status, i18n key, `MIN_PROPOSALS_TO_VOTE` and `transitionDialog` (which dialog runs the next step of each stage)
- **domain/files** (`src/domain/files.ts`) - Allowed types, 10 MB limit, `validateFile`, `formatFileSize`, `fileTypeLabel`
- **domain/dates** (`src/domain/dates.ts`) - Local-calendar date helpers and `Intl` formatting (`endOfDay`, `daysUntilClose`, `formatDate`, `formatRelative`, `addDays`, `todayISO`), duration presets (`DURATION_PRESETS`, `DEFAULT_DURATION_DAYS`) and deadline rules `validateNewDeadline` / `validatePostpone`
- **domain/score** (`src/domain/score.ts`) - `formatScore` (MBC score on a 0-10 scale)
- **domain/redirect** (`src/domain/redirect.ts`) - `safeNextPath` (internal routes only, default `/events`) and `loginPathFor(path)`
- **domain/auth** (`src/domain/auth.ts`) - `isValidEmail`, `validateLogin`, `validateRegister`, `validateNewPassword`, `validateDisplayName` returning field errors as translation keys
- **domain/events** (`src/domain/events.ts`) - `pendingTasks`, `rowAction`, `stagePill`, `myStatusLabel`, `currentDeadline`, `openEvents`, `parseStageFilter` and constants (`SEARCH_DEBOUNCE_MS`, `PENDING_LIMIT`, `EVENTS_PAGE_SIZE`)
- **i18n helpers** (`src/i18n/`) - `translate`, `detectLocale`, `messageKeyForError`, `scopedMessageKeyForError`, `findVoseo` / `findGenderMarks` (neutral Spanish guard)
- **domain/eventForm** (`src/domain/eventForm.ts`) - Event form rules shared by create and edit: `validateEventForm`, `toEventInput`, `changedEventFields`, `hasEventFormData`, `automaticEventDates`, `canEditEvent`, `minCapacityFor`, range constants
- **domain/voting** (`src/domain/voting.ts`) - `validateThresholds` (in hundredths), `recommendedMinEvaluations`, `VotingConfigPreview`, voting-config draft (`initialVotingDraft`, `validateVotingDraft`, `isRecommendedConfig`) and range constants (`ADJUSTMENT_MIN/MAX`, `MIN_EVALUATIONS_MAX`, `THRESHOLD_STEP`)
- **domain/eventDetail** (`src/domain/eventDetail.ts`) - Event detail rules: `nextStepState` (11 states with priority cancelled > results > paused), `detailPill`, `progressSteps`, `splitResults` (podium + rest), `shareUrl` / `shareLinks`, `shareAudienceKey`, `afterKey`, `capacityOf` / `isRegistered` / `isFull` and constants
- **domain/manage** (`src/domain/manage.ts`) - Organizer management rules: `manageStage`, `canPause`, `pendingFiles`, `pendingVotes`, `voteCell`, `votingProgress`, `managePill`, `reminderType`, `REMINDER_PREVIEW_LIMIT`
- **API services** (`src/services/api.ts`) - `EventService.updateEventStage` (optional `votingConfig`, returns `StageUpdateResult`), `EventService.sendReminder`, `DistributedVotingService.getVotingConfigPreview` / `getVotingConfig` (`null` on `CONFIG_NOT_FOUND`)
- **Stage / reminder types** (`src/types/index.ts`) - `ReminderType`, `ReminderResult`, `VotingConfigInput`, `StageUpdateResult`

See full details in [utils.md](./utils.md)

## Styles

- **Tokens** (`src/styles/tokens.css`) - Single source of Design System `web` v2.0.0 tokens; reference tier uses the `--ref-` prefix, never consumed by components
