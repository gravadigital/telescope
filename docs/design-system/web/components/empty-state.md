---
component: empty-state
version: 2.0.0
status: active
last_updated: 2026-10-02
related: [callout, data-table, card]
---

# EmptyState

## Propósito

Dice que no hay datos **porque no los hay** (no por un error) y ofrece la acción siguiente.

**Cuándo usar:** sin inscriptos, sin resultados de búsqueda, sin notificaciones, Mis eventos vacío, 404.

**Cuándo NO usar:** falla de carga → [callout](./callout.md) error (REQ-001: un error no se muestra como vacío).

## Anatomía

1. **Ícono** — `text.muted`, 32px.
2. **Título** — `text.heading.s` (h1 en la 404).
3. **Texto** — `text.secondary`.
4. **Acción (opcional)** — button secondary (primary en la 404).

## Variants

| Variant | Uso |
|---|---|
| inline | Dentro de una tabla o card |
| page | Pantalla completa (404) |

## Sizes

inline: padding `space.lg`; page: padding `space.2xl`.

## States

Estático.

## Spacing & sizing rules

Centrado; ancho máximo del texto 420px; gap `space.sm` (ícono–título), `space.md` (texto–acción).

## Accesibilidad

Título con el nivel de heading que corresponda en la pantalla; ícono `aria-hidden`.

## Guidelines de contenido

Qué falta + qué hacer: "Todavía no hay inscriptos" + "Compartí el enlace de invitación…".

## Do's & don'ts

**Do:** ofrecer siempre una salida.

**Don't:** usarlo para errores · ilustraciones grandes que empujan la acción fuera de pantalla en mobile.

## API

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| variant | `inline \| page` | `inline` | Variant |
| icon | IconName | — | Ícono |
| title | string | — | Título |
| description | string | — | Texto |
| action | `{label, onClick \| href}` | — | Acción |

## Componentes y patterns relacionados

[callout](./callout.md) · [data-table](./data-table.md) · [card](./card.md)

## Historial

- 2026-10-02 v2.0.0 — Creado para REQ-003.
