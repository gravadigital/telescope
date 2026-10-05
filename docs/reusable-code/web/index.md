# Reusable Code - web

This document lists the reusable code documented so far for this service (incremental: only elements added by implemented stories; it is not a full scan). Each category has its own file with details.

## Components

**Total: 36**

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
- **NumberStepper** (`src/components/ui/number-stepper/NumberStepper.tsx`) - Bounded integer with − / +, recommended mark and range error
- **DateQuickPicker** (`src/components/ui/date-quick-picker/DateQuickPicker.tsx`) - Date with duration presets (from today or postpone) and native calendar
- **FileDropzone** (`src/components/ui/file-dropzone/FileDropzone.tsx`) - File picker / drop zone validated with `domain/files`, includes the FileChip; `onReplace` tells the page a replacement started and `submitted` resets it
- **Menu** (`src/components/ui/menu/Menu.tsx`) - Dropdown menu (actions / select) with roving focus
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
- **ParticipantsTable** (`src/components/events/participants-table/ParticipantsTable.tsx`) - Public participants table on `DataTable` (name and registration date; never the email)
- **ParticipantsDialog** (`src/components/events/participants-dialog/ParticipantsDialog.tsx`) - Participants dialog (O-08): loads on open with skeleton / empty / error + retry
- **Podium** (`src/components/voting/podium/Podium.tsx`) - Top-3 results as cards with score on a 0-10 scale and the current user marked "Tú"
- **RankingList** (`src/components/voting/ranking-list/RankingList.tsx`) - Results table from 4th place on `DataTable` with the current user's row highlighted
- **EventResults** (`src/components/voting/event-results/EventResults.tsx`) - Public results block: loads `distributed-results`, handles loading / not calculated / error + retry, never recalculates; `onLoaded(results)`

See full details in [components.md](./components.md)

## Hooks

- **useT / I18nProvider** (`src/i18n/I18nProvider.tsx`) - Own i18n over `Intl` (ADR-010): `t(key, params)`, `locale`, `setLocale`, `fmt` formatters; typed `es` / `en` catalogs, `messageKeyForError(err)` for API errors

- **useGoogleSignIn** (`src/hooks/useGoogleSignIn.ts`) - Two-step Google flow shared by login and register: existing user signs in and goes to `next`; new user goes to `/complete-profile` with the credential in router state only

See full details in [hooks.md](./hooks.md)

## Utils

**Total: 13**

- **ApiError / getErrorCode** (`src/config/api.ts`) - Error thrown by `apiRequest`, `uploadFile` and `downloadFile` with `status`, `code` and `details`
- **domain/stages** (`src/domain/stages.ts`) - Stage order, next stage, status, i18n key and `validateStageAdvance` (same codes as the backend)
- **domain/files** (`src/domain/files.ts`) - Allowed types, 10 MB limit, `validateFile`, `formatFileSize`, `fileTypeLabel`
- **domain/dates** (`src/domain/dates.ts`) - Local-calendar date helpers and `Intl` formatting (`endOfDay`, `daysUntilClose`, `formatDate`, `formatRelative`, `addDays`, `todayISO`)
- **domain/score** (`src/domain/score.ts`) - `formatScore` (MBC score on a 0-10 scale)
- **domain/redirect** (`src/domain/redirect.ts`) - `safeNextPath` (internal routes only, default `/events`) and `loginPathFor(path)`
- **domain/auth** (`src/domain/auth.ts`) - `isValidEmail`, `validateLogin`, `validateRegister`, `validateNewPassword`, `validateDisplayName` returning field errors as translation keys
- **domain/events** (`src/domain/events.ts`) - `pendingTasks`, `rowAction`, `stagePill`, `myStatusLabel`, `currentDeadline`, `openEvents`, `parseStageFilter` and constants (`SEARCH_DEBOUNCE_MS`, `PENDING_LIMIT`, `EVENTS_PAGE_SIZE`)
- **i18n helpers** (`src/i18n/`) - `translate`, `detectLocale`, `messageKeyForError`, `scopedMessageKeyForError`, `findVoseo` / `findGenderMarks` (neutral Spanish guard)
- **domain/eventForm** (`src/domain/eventForm.ts`) - Event form rules shared by create and edit: `validateEventForm`, `toEventInput`, `changedEventFields`, `hasEventFormData`, `automaticEventDates`, `canEditEvent`, `minCapacityFor`, range constants
- **domain/voting** (`src/domain/voting.ts`) - `validateThresholds` (in hundredths), `recommendedMinEvaluations`, `VotingConfigPreview`
- **domain/eventDetail** (`src/domain/eventDetail.ts`) - Event detail rules: `nextStepState` (11 states with priority cancelled > results > paused), `detailPill`, `progressSteps`, `splitResults` (podium + rest), `shareUrl` / `shareLinks`, `shareAudienceKey`, `afterKey`, `capacityOf` / `isRegistered` / `isFull` and constants

See full details in [utils.md](./utils.md)

## Styles

- **Tokens** (`src/styles/tokens.css`) - Single source of Design System `web` v2.0.0 tokens; reference tier uses the `--ref-` prefix, never consumed by components
