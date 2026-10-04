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
**Description:** Accessible form and navigation controls. `DateQuickPicker` is controlled with ISO dates and takes `presets: { days, label }[]`; `NumberStepper` never propagates an out-of-range value; `TextField` forwards its `ref`.

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
