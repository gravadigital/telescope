---
component: progress-bar
version: 2.0.0
status: active
last_updated: 2026-10-02
related: [stat-tile, data-table]
---

# ProgressBar

## Propósito

Muestra cuánto de un total está cubierto. Es la `CapacityBar` de REQ-003 y la barra de "Rankings enviados".

**Cuándo usar:** cupo ocupado ("13 de 20 lugares"), rankings enviados ("1 de 4"), paso del wizard en mobile.

**Cuándo NO usar:** carga indeterminada → skeleton; etapas del evento → StageTimeline (dominio).

## Anatomía

1. **Track** — `bg.disabled`, `radius.pill`.
2. **Fill** — color por tono.
3. **Label (opcional)** — "{n} / {total}" o "{n} de {total} lugares ocupados".

## Variants

| Tono | Uso | Fill |
|---|---|---|
| action | Cupo, rankings | `bg.accent` |
| success | Completo | `bg.success` |
| warning | Cupo completo | `bg.warning` |

## Sizes

| Size | Alto | Uso |
|---|---|---|
| sm | 4px | Celdas de tabla |
| md | 8px | Tarjetas, StatTile |

## States

default · complete (100%: tono success, salvo cupo completo que es warning).

## Spacing & sizing rules

Label arriba o a la derecha con gap `space.sm`; ancho al contenedor.

## Accesibilidad

`role="progressbar"` con `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax` y `aria-valuetext` traducido ("13 de 20 lugares ocupados"). El label visible repite el valor (no depender del color).

## Guidelines de contenido

Siempre el número además de la barra.

## Do's & don'ts

**Do:** mostrar el total real (nunca porcentajes inventados).

**Don't:** animar en loop · usarla como indicador de carga.

## API

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| value | number | — | Actual |
| max | number | — | Total |
| tone | `action \| success \| warning` | `action` | Tono |
| size | `sm \| md` | `md` | Alto |
| label | string | — | Texto visible |
| valueText | string | — | Texto accesible |

## Componentes y patterns relacionados

[stat-tile](./stat-tile.md) · [data-table](./data-table.md)

## Historial

- 2026-10-02 v2.0.0 — Creado para REQ-003 (CapacityBar + rankings enviados).
