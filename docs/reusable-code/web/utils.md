# Utils - web

## ApiError

**Location:** `src/config/api.ts`
**Description:** Class thrown by `apiRequest`, `uploadFile` and `downloadFile`. `message` stays as before (`error || message`); `code` comes from `body.code` or, for middleware errors (`{ error: "UNAUTHORIZED", message }`), from `body.error`; `details` is the rest of the body. `getErrorCode(err)` reads the code from any error.

**Usage:**
```ts
try { await apiRequest(url); } catch (err) { const code = getErrorCode(err); }
```

---

## validateStageAdvance

**Location:** `src/domain/stages.ts`
**Description:** Replicates the backend rules for `PATCH /stage` and returns the same codes (`INVALID_TRANSITION`, `MISSING_ESTIMATED_DATE`, `INVALID_ESTIMATED_DATE`, `INSUFFICIENT_ATTACHMENTS`). Today is a valid deadline.

**Signature:**
```ts
validateStageAdvance(input: { current: EventStage; target: EventStage; estimatedEndDate?: string | null; participantsWithProposal?: number; today?: Date }): StageAdvanceIssue[]
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
```

---

## validateThresholds / formatScore

**Location:** `src/domain/voting.ts`, `src/domain/score.ts`
**Description:** `validateThresholds` compares in hundredths (avoids `0.7 - 0.6` float error). `formatScore` shows `mbc_score × 10` with one decimal.
