---
component: card
version: 2.0.0
status: active
last_updated: 2026-10-02
related: [stat-tile, callout, empty-state]
---

# Card (superficie)

> **Reemplaza a `glass-card` (v1.0).** El glassmorphism deja de existir: la superficie base pasa a
> ser blanca sobre canvas claro.

## Propósito

Agrupa contenido relacionado sobre el canvas.

**Cuándo usar:** secciones de una pantalla ("Tu próximo paso", "Detalles", "Tu progreso"), tarjetas de evento y de pendientes, la franja "¿Querés…?" (variant `feature`).

**Cuándo NO usar:** métricas → [stat-tile](./stat-tile.md); avisos → [callout](./callout.md); listas tabulares → [data-table](./data-table.md).

## Anatomía

1. **Container** — `bg.surface`, borde `border.default`, `radius.surface`.
2. **Eyebrow (opcional)** — `text.eyebrow`.
3. **Título (opcional)** — h2/h3.
4. **Body.**
5. **Acciones (opcional).**

## Variants

| Variant | Uso | Tokens |
|---|---|---|
| default | Sección | `bg.surface` + `border.default` |
| subtle | Superficie secundaria (podio 2° y 3°, fila de detalle) | `bg.surface.subtle` |
| raised | **El** paso destacado ("Tu próximo paso") | `bg.surface` + `shadow.raised` |
| feature | Franja CtaBanner ("¿Querés evaluar propuestas…?") con acción | `bg.band` + `text.inverse` |
| interactive | Tarjeta clickeable (evento, pendiente) | default + borde `border.strong` en hover/focus |

## Sizes

| Size | Padding | Uso |
|---|---|---|
| compact | `space.padding.compact` | Pendientes, ítems |
| default | `space.padding.default` | Secciones laterales |
| spacious | `space.padding.spacious` | Secciones principales |

## States

default · hover/focus (solo `interactive`: `border.strong` + `focus.ring`).

## Spacing & sizing rules

Gap interno `space.stack.md` · entre cards `space.stack.md` (mobile) / `space.lg` (desktop).

## Accesibilidad

- `interactive`: el área clickeable es un único `<a>` o `<button>` (no anidar controles).
- Si tiene título, usar el nivel correcto de heading; `section` con `aria-labelledby`.

## Guidelines de contenido

Título corto; eyebrow en mayúsculas desde el catálogo ("TU PRÓXIMO PASO").

## Do's & don'ts

**Do:** un solo `raised` por pantalla · `feature` solo para invitaciones a una acción.

**Don't:** anidar cards con borde dentro de cards con borde · usar `feature` para contenido de lectura.

## API

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| variant | `default \| subtle \| raised \| feature \| interactive` | `default` | Variant |
| padding | `compact \| default \| spacious` | `default` | Padding |
| as | `section \| article \| a \| button` | `section` | Elemento |
| eyebrow / title | string | — | Encabezado |

## Componentes y patterns relacionados

[stat-tile](./stat-tile.md) · [callout](./callout.md) · [empty-state](./empty-state.md)

## Historial

- 2026-09-18 v1.0.0 — Relevado como `glass-card` (patrón glass repetido a mano).
- 2026-10-02 v2.0.0 — **Breaking.** Renombrado a `card`; superficie clara del rediseño de REQ-003 con variants default / subtle / raised / feature / interactive.
