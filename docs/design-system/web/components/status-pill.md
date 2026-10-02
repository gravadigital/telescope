---
component: status-pill
version: 2.0.0
status: active
last_updated: 2026-10-02
related: [data-table, card]
---

# StatusPill

> **Reemplaza a `status-badge` (v1.0).**

## Propósito

Comunica en pocas palabras el estado de un evento o de la situación personal del usuario.

**Cuándo usar:** etapa en listados y encabezados ("Inscripción abierta · cierra en 3 días"), estado de archivo o voto en tablas ("✓ Enviado", "Pendiente"), rol ("Organizás este evento"), visibilidad ("Borrador · no visible").

**Cuándo NO usar:** contadores → texto o el contador de la campana; filtros → [filter-tabs](./filter-tabs.md); avisos con explicación → [callout](./callout.md).

## Anatomía

1. **Container** — `radius.pill`.
2. **Punto o ícono (opcional)** — "●" en "Inscripción abierta", "✓" en completado.
3. **Label** — `text.ui` en tamaño `2xs`–`sm`.

## Variants

| Variant | Uso | Tokens |
|---|---|---|
| success | Inscripción abierta, ✓ Enviado, ✓ archivo | `bg.success.subtle` + `text.success` |
| warning | Falta archivo, Pendiente, Pausado | `bg.warning.subtle` + `text.warning` |
| action | Votación, Te toca votar | `bg.action.subtle` + `text.action` |
| neutral | Finalizado, No participa, Borrador | `bg.neutral.subtle` + `text.secondary` |
| on-band | Sobre `bg.band` (EventHero, rol) | `bg.band.raised` + `text.inverse` (texto clave en `text.signal`) |

Nombres de etapa **únicos** en todo el producto, del catálogo i18n: Creación · Participación (pill: "Inscripción abierta") · Votación · Resultados (pill: "Finalizado"). Resuelve el "Completed" vs "Results" de la v1.0.

## Sizes

| Size | Alto | Uso |
|---|---|---|
| sm | 22px | Celdas de tabla |
| md | 28px | Encabezados, tarjetas |

## States

Estático: no es interactivo.

## Spacing & sizing rules

Padding `4px 10px` (sm) / `5px 11px` (md) del diseño · gap punto–label `space.xs` · nunca se corta: hace wrap en mobile.

## Accesibilidad

- Texto real, nunca solo color.
- Íconos decorativos con `aria-hidden`.
- No usar `role="status"`: es contenido estático.

## Guidelines de contenido

Máximo ~40 caracteres · etapa + dato clave separados por " · " · copy neutro de género ("Inscripto").

## Do's & don'ts

**Do:** una sola pill de estado por entidad · combinar etapa y plazo en la misma pill.

**Don't:** usar la pill como botón · inventar variants por color.

## API

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| tone | `success \| warning \| action \| neutral \| onBand` | `neutral` | Variant |
| size | `sm \| md` | `md` | Tamaño |
| icon | `dot \| check \| none` | `none` | Indicador |
| children | string | — | Label |

## Componentes y patterns relacionados

[data-table](./data-table.md) · [card](./card.md)

## Historial

- 2026-09-18 v1.0.0 — Relevado como `status-badge` (CSS duplicado por archivo).
- 2026-10-02 v2.0.0 — **Breaking.** Renombrado a `status-pill` con los tonos del rediseño de REQ-003 y nombres de etapa únicos.
