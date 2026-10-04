# Reusable Code - web

This document lists the reusable code documented so far for this service (incremental: only elements added by implemented stories; it is not a full scan). Each category has its own file with details.

## Components

**Total: 19**

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
- **FileDropzone** (`src/components/ui/file-dropzone/FileDropzone.tsx`) - File picker / drop zone validated with `domain/files`, includes the FileChip
- **Menu** (`src/components/ui/menu/Menu.tsx`) - Dropdown menu (actions / select) with roving focus
- **EventHero** (`src/components/events/event-hero/EventHero.tsx`) - Dark band with back link, pills, title, meta and actions
- **StageTimeline** (`src/components/events/stage-timeline/StageTimeline.tsx`) - Four-stage timeline (full / compact) with editable deadline
- **NextStepCard** (`src/components/events/next-step-card/NextStepCard.tsx`) - Raised card for the next step with checklist, consequence and actions
- **ProgressChecklist** (`src/components/events/progress-checklist/ProgressChecklist.tsx`) - Numbered participant progress

See full details in [components.md](./components.md)

## Hooks

N/A

## Utils

**Total: 6**

- **ApiError / getErrorCode** (`src/config/api.ts`) - Error thrown by `apiRequest`, `uploadFile` and `downloadFile` with `status`, `code` and `details`
- **domain/stages** (`src/domain/stages.ts`) - Stage order, next stage, status, i18n key and `validateStageAdvance` (same codes as the backend)
- **domain/files** (`src/domain/files.ts`) - Allowed types, 10 MB limit, `validateFile`, `formatFileSize`, `fileTypeLabel`
- **domain/dates** (`src/domain/dates.ts`) - Local-calendar date helpers and `Intl` formatting (`endOfDay`, `daysUntilClose`, `formatDate`, `formatRelative`, `addDays`, `todayISO`)
- **domain/score** (`src/domain/score.ts`) - `formatScore` (MBC score on a 0-10 scale)
- **domain/voting** (`src/domain/voting.ts`) - `validateThresholds` (in hundredths), `recommendedMinEvaluations`, `VotingConfigPreview`

See full details in [utils.md](./utils.md)

## Styles

- **Tokens** (`src/styles/tokens.css`) - Single source of Design System `web` v2.0.0 tokens; reference tier uses the `--ref-` prefix, never consumed by components
