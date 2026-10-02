---
component: filter-tabs
version: 2.0.0
status: active
last_updated: 2026-10-02
related: [data-table, text-field]
---

# FilterTabs

## Propósito

Filtra una lista por una dimensión, mostrando cuántos resultados tiene cada opción.

**Cuándo usar:** etapa en Eventos ("Todos · 7 | Inscripción abierta · 4 | En votación · 0 | Finalizados · 3").

**Cuándo NO usar:** navegar entre pantallas → links del header; más de 6 opciones → [menu](./menu.md).

## Anatomía

1. **Lista** — fila de opciones con `radius.pill`.
2. **Opción** — label + " · " + conteo.
3. **Indicador de seleccionada** — fondo `bg.band` + `text.inverse`.

## Variants

| Variant | Uso |
|---|---|
| default | Sobre canvas o surface |

## Sizes

md: 36px de alto, padding `8px 14px` (del diseño).

## States

| State | Tokens |
|---|---|
| default | `text.secondary`, sin fondo |
| selected | `bg.band` + `text.inverse`, `font.weight.semibold` |
| hover | `bg.neutral.subtle` |
| focus | `focus.ring` |
| empty (conteo 0) | se muestra igual y es seleccionable |
| loading | conteos como skeleton |

## Spacing & sizing rules

Gap entre opciones `space.xs`. En mobile la fila hace scroll horizontal dentro de su contenedor (nunca la página) con la seleccionada visible.

## Accesibilidad

- `role="tablist"` / `role="tab"` con `aria-selected`; controla la lista (`aria-controls`).
- Flechas ← → mueven entre opciones; Home/End a los extremos.
- El conteo forma parte del nombre accesible ("Inscripción abierta, 4 eventos").

## Guidelines de contenido

Nombres de etapa del catálogo único · conteo siempre visible.

## Do's & don'ts

**Do:** mantener la opción seleccionada en la URL.

**Don't:** ocultar opciones con conteo 0 (cambia la posición de las demás) · usar tabs para acciones.

## API

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| options | `{value, label, count?}[]` | — | Opciones |
| value | string | — | Seleccionada |
| onChange | function | — | Cambio |
| loading | boolean | false | Conteos en skeleton |

## Componentes y patterns relacionados

[data-table](./data-table.md) · [text-field](./text-field.md) (búsqueda)

## Historial

- 2026-10-02 v2.0.0 — Creado para REQ-003 (S-02 Eventos, S-11 Mis eventos).
