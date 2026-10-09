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


## useNotifications / NotificationsProvider

**Location:** `src/context/NotificationsContext.tsx`

**Description:** Context shared by the bell, the panel and the notifications page. It owns `unreadCount` and the ADR-009 polling of `GET /notifications/unread-count`: on mount, every `NOTIFICATIONS_POLL_MS` while `document.visibilityState === 'visible'`, on `visibilitychange` to visible, on window `focus` and on every pathname change; a request in flight is never duplicated and a failure keeps the last value. Renders a visually hidden `aria-live="polite"` region that announces count changes after the first load. `useNotifications()` throws outside the provider; `AppLayout` mounts the provider only when there is a session.

**Signature:**
```ts
useNotifications(): {
  unreadCount: number;
  refresh(): Promise<void>;
  markRead(id: string): Promise<void>;   // optimistic -1, API error ignored
  markAllRead(): Promise<void>;          // success -> 0, error rethrown
  syncUnreadCount(n: number): void;      // use the unread_count a list already returned
}
```

**Usage:**
```tsx
const { unreadCount, markAllRead } = useNotifications();
await markAllRead().catch(() => setError(true));
```
