---
foundation: spacing
version: 1.0.0
last_updated: 2026-09-18
status: relevado-desde-código
---

# Espaciado

> **Sembrado desde el código existente** (`web`). `[fuente: código-existente]`

## Escala

Base de **4px** (0.25rem), con progresión aproximadamente duplicada.

| Token | Variable CSS | Valor | Equivalente |
|---|---|---|---|
| `space.xs` | `--spacing-xs` | `0.25rem` | 4px |
| `space.sm` | `--spacing-sm` | `0.5rem` | 8px |
| `space.md` | `--spacing-md` | `1rem` | 16px |
| `space.lg` | `--spacing-lg` | `1.5rem` | 24px |
| `space.xl` | `--spacing-xl` | `2rem` | 32px |
| `space.2xl` | `--spacing-2xl` | `3rem` | 48px |
| `space.3xl` | `--spacing-3xl` | — | ⚠️ solo en `global.css` |

**Es una escala coherente y bien adoptada** — de las fundaciones sembradas, la que está en mejor
estado.

## Radio de borde

| Token | Variable CSS | Valor |
|---|---|---|
| `radius.sm` | `--radius-sm` | `4px` |
| `radius.md` | `--radius-md` | `8px` |
| `radius.lg` | `--radius-lg` | `12px` — **el de la tarjeta glass** |
| `radius.xl` | `--radius-xl` | `16px` |
| `radius.2xl` | `--radius-2xl` | `24px` |
| `radius.full` | `--radius-full` | `9999px` — badges y chips |

## Sombra

| Token | Variable CSS |
|---|---|
| `shadow.sm` … `shadow.2xl` | `--shadow-sm` … `--shadow-2xl` |
| `shadow.button` | `--shadow-button` | ⚠️ solo en `global.css` |
| `shadow.button.hover` | `--shadow-button-hover` | ⚠️ solo en `global.css` |

## Transición

| Token | Variable CSS | Valor |
|---|---|---|
| `motion.fast` | `--transition-fast` | `150ms ease` |
| `motion.base` | `--transition-base` | `200ms ease` |
| `motion.slow` | `--transition-slow` | `300ms ease` |

Ver también [`motion.md`](./motion.md).

## Z-index

| Token | Variable CSS |
|---|---|
| `z.dropdown` | `--z-dropdown` |
| `z.fixed` | `--z-fixed` |
| `z.modal` | `--z-modal` |

⚠️ Solo en `global.css`. Son **tres niveles para todo el producto**, lo que es suficiente hoy pero
no contempla, por ejemplo, un toast por encima de un modal.

## Guidelines

**Do:**
- Usar la escala para todo padding, margin y gap.
- `--radius-lg` para superficies tipo tarjeta, `--radius-full` para badges.
- Usar los tokens de z-index en vez de números literales.

**Don't:**
- No escribir valores de espaciado en `px` o `rem` literales.
- No inventar niveles de z-index intermedios.

## Deuda conocida

1. ⚠️ **Hay padding en `px` literales en las media queries.** `ManageEventPage.css` usa `1rem` y
   `1.5rem` directos; `CreateEventPage.css` usa `20px`, `10px`, `30px`, `40px`. Los valores
   coinciden aproximadamente con la escala, pero no la referencian.
2. ⚠️ **`--spacing-3xl`, las sombras de botón y los z-index solo existen en `global.css`.**
3. **No hay tokens de tamaño de control** (altura de botón, de input). Cada componente los define.

## Historial

- 2026-09-18 v1.0.0 — Sembrado desde `web/src/styles/global.css` por `/product-consolidate-services`.
