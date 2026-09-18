---
foundation: typography
version: 1.0.0
last_updated: 2026-09-18
status: relevado-desde-código
---

# Tipografía

> **Sembrado desde el código existente** (`web`). `[fuente: código-existente]`

## Familias

| Token | Variable CSS | Valor |
|---|---|---|
| `font.family.base` | `--font-family` | Stack de sistema (system font stack) |
| `font.family.mono` | `--font-family-mono` | Stack monoespaciado |

**No hay fuente web.** El producto usa las fuentes del sistema operativo: sin request de fuente,
sin FOUT, sin costo de carga. Es una decisión razonable que conviene sostener.

## Escala de tamaños

| Token | Variable CSS |
|---|---|
| `font.size.xs` … `font.size.3xl` | `--text-xs` … `--text-3xl` |

⚠️ **La escala existe solo en `global.css`**, no en `index.css`. Son 7 pasos.

### Tamaños observados en uso

Varias pantallas escriben tamaños en `rem` directamente, sin pasar por la escala:

| Pantalla | Desktop | Mobile |
|---|---|---|
| `create-event` `<h1>` | 2.5rem | 2rem |
| `event-detail` título | 2.2rem | **1.6rem** |
| `manage-event` `<h1>` | — | 2rem |
| `events-list` `<h1>` | — | `--text-xl` |

**`events-list` es la única que usa el token.** Las demás escriben el valor literal.

## Jerarquía de encabezados

| Nivel | Uso observado |
|---|---|
| `h1` | Título de pantalla |
| `h3` | Títulos de sección dentro de una pantalla (`Identification`, `Configuration`, `Event Stage Control`, `Registered Participants`) |

⚠️ **El `h2` no se usa en ninguna pantalla.** Se salta directamente de `h1` a `h3`, lo que rompe la
jerarquía semántica para lectores de pantalla.

⚠️ **La landing tiene tres `<h1>` en la misma página** (uno por sección).

## Guidelines

**Do:**
- Usar los tokens `--text-*` para cualquier tamaño nuevo.
- Un solo `h1` por pantalla.
- Respetar la secuencia `h1 → h2 → h3` sin saltos.

**Don't:**
- **No escribir tamaños en `rem` literales.** Es la deuda principal de esta fundación.
- No usar `h3` como si fuera `h2`.

## Deuda conocida

1. ⚠️ **La escala está definida pero poco adoptada.** La mayoría de los títulos escribe `rem`
   literales. Cuatro pantallas, cuatro tamaños de `h1` distintos (2.5, 2.2, 2, `--text-xl`).
2. ⚠️ **`h2` ausente en todo el producto**, con salto directo de `h1` a `h3`.
3. ⚠️ **Tres `h1` en la landing.**
4. ⚠️ **La escala solo existe en `global.css`.** `index.css` no la tiene, lo que agrava la
   duplicación de fuente de verdad descrita en `color.md`.
5. **No hay tokens de `line-height` ni de `font-weight`.** Cada componente los decide por su cuenta.

## Accesibilidad

- ⚠️ Sin verificar el comportamiento a 200% de zoom.
- Usar fuentes de sistema **favorece** la accesibilidad: respeta la configuración del usuario.

## Historial

- 2026-09-18 v1.0.0 — Sembrado desde `web/src/styles/global.css` por `/product-consolidate-services`.
