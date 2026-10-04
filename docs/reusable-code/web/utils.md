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
