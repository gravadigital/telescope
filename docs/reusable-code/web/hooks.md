# Hooks

## useT / I18nProvider

**Location:** `src/i18n/I18nProvider.tsx` (barrel: `src/i18n/index.ts`)
**Description:** Own i18n provider over `Intl` (ADR-010). Initial locale from the saved `telescopio_locale` or `navigator.language` (`es*` -> es, else en); `<html lang>` follows the locale. The `en` catalog type is derived from `es`, so a missing key fails `npm run typecheck`. Throws outside the provider.

**Signature:**
```ts
useT(): { t(key: TranslationKey, params?: Record<string, string | number>): string; locale: 'es' | 'en';
  setLocale(next: 'es' | 'en'): void;
  fmt: { date; dateLong; dateTime; relative; number; score } }
messageKeyForError(err: unknown): TranslationKey   // errors.<code> | errors.generic | errors.network
```

**Usage:**
```tsx
const { t } = useT();
<p>{t('common.participants', { count: 3 })}</p>
<Callout>{t(messageKeyForError(err))}</Callout>
```

---

## useGoogleSignIn

**Location:** `src/hooks/useGoogleSignIn.ts`
**Description:** Runs `GoogleAuthService.verify`. Existing user: `login` and `navigate(safeNextPath(next))`. New user: `navigate('/complete-profile', { state: { googleToken, suggestedName, next } })`; the credential is never written to storage.

**Signature:**
```ts
useGoogleSignIn(next: string | null): { busy: boolean; error: TranslationKey | null;
  onToken(accessToken: string): Promise<void>; onError(): void }
```

**Usage:**
```tsx
const google = useGoogleSignIn(next);
<GoogleButton label={t('auth.google.continue')} onToken={google.onToken} onError={google.onError} disabled={google.busy} />
```
