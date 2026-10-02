---
tokens: component
version: 2.0.0
last_updated: 2026-10-02
status: diseñada
---

# Tokens — Component-level

> Tier 3. Formato `{componente}.{variant}.{propiedad}.{estado}`. Cada uno apunta a un semántico de
> [`semantic.md`](./semantic.md); nunca a un primitivo.

## Button
```
button.primary.bg            : bg.action.primary
button.primary.bg.hover      : bg.action.primary.hover      # Pendiente (el diseño no lo define)
button.primary.fg            : text.inverse
button.secondary.bg          : bg.surface
button.secondary.fg          : text.action
button.secondary.border      : border.strong
button.tertiary.fg           : text.action
button.onBand.bg             : bg.band.raised
button.onBand.fg             : text.inverse
button.onBand.border         : border.inverse
button.disabled.bg           : bg.disabled
button.disabled.fg           : text.disabled
button.radius                : radius.control
button.focus                 : focus.ring
```

## TextField
```
textField.bg                 : bg.surface
textField.border             : border.strong
textField.border.focus       : border.focus
textField.border.error       : border.error
textField.fg                 : text.primary
textField.placeholder        : text.disabled
textField.help               : text.muted
textField.error              : text.error
textField.radius             : radius.field
```

## Dialog
```
dialog.bg                    : bg.surface
dialog.backdrop              : bg.backdrop
dialog.radius                : radius.surface
dialog.shadow                : shadow.dialog
dialog.eyebrow               : text.muted
```

## Card
```
card.bg                      : bg.surface
card.border                  : border.default
card.radius                  : radius.surface
card.subtle.bg               : bg.surface.subtle
card.raised.shadow           : shadow.raised
card.feature.bg              : bg.band
card.feature.fg              : text.inverse
```

## StatusPill
```
statusPill.success.bg / fg   : bg.success.subtle / text.success
statusPill.warning.bg / fg   : bg.warning.subtle / text.warning
statusPill.action.bg / fg    : bg.action.subtle / text.action
statusPill.neutral.bg / fg   : bg.neutral.subtle / text.secondary
statusPill.onBand.bg / fg    : bg.band.raised / text.inverse
statusPill.radius            : radius.pill
```

## DataTable
```
dataTable.bg                 : bg.surface
dataTable.border             : border.default
dataTable.header.fg          : text.muted
dataTable.row.hover          : bg.surface.subtle
dataTable.row.highlight      : bg.unread
dataTable.radius             : radius.surface
```

## FilterTabs
```
filterTabs.fg                : text.secondary
filterTabs.selected.bg       : bg.band
filterTabs.selected.fg       : text.inverse
filterTabs.hover.bg          : bg.neutral.subtle
filterTabs.radius            : radius.pill
```

## ProgressBar
```
progressBar.track            : bg.disabled
progressBar.fill.action      : bg.accent
progressBar.fill.success     : bg.success
progressBar.fill.warning     : bg.warning
```

## StatTile / Callout / EmptyState
```
statTile.value               : text.primary
statTile.label               : text.muted
callout.info.bg              : bg.surface.subtle
callout.warning.bg / fg      : bg.warning.subtle / text.warning
callout.error.border / fg    : border.error / text.error
callout.success.bg / fg      : bg.success.subtle / text.success
emptyState.icon              : text.muted
emptyState.text              : text.secondary
```

## DateQuickPicker / NumberStepper / FileDropzone / Menu
```
datePicker.preset.selected.bg  : bg.action.subtle
datePicker.preset.selected.fg  : text.action
numberStepper.border           : border.strong
fileDropzone.bg                : bg.surface.subtle
fileDropzone.border            : border.strong          # punteado
fileDropzone.border.dragover   : border.focus
fileDropzone.bg.dragover       : bg.action.subtle
fileDropzone.radius            : radius.area
menu.bg                        : bg.surface
menu.shadow                    : shadow.popover
menu.item.hover                : bg.surface.subtle
```

## Historial

- 2026-09-18 v0.1.0 — Placeholder inicial.
- 2026-10-02 v2.0.0 — Tokens de los 15 componentes del rediseño de REQ-003.
