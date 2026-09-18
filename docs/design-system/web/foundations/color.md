---
foundation: color
version: 1.0.0
last_updated: 2026-09-18
status: relevado-desde-código
---

# Color

> **Sembrado desde el código existente** (`web`), no un placeholder.
> Los valores son los que el CSS define hoy en `:root`. `[fuente: código-existente]`

## El lenguaje visual

**Oscuro con glassmorphism.** Fondo con degradado fijo entre tres azules profundos
(`background-attachment: fixed`), y superficies translúcidas blancas con borde claro encima. No hay
librería de componentes: todo está construido a mano con CSS plano.

## Paleta

### Brand

| Token | Hex | Variable CSS | Uso |
|---|---|---|---|
| `color.brand.primary` | **`#6a5acd`** | `--color-primary` | **El violeta de marca.** Acciones primarias, links |
| `color.brand.primary.hover` | `#7b68ee` | `--color-primary-hover` | Hover de acción primaria |
| `color.brand.primary.dark` | `#5a4ab3` | `--color-primary-dark` | Estados presionados |
| `color.brand.primary.light` | `#9370db` | `--color-primary-light` | Solo en `global.css` |
| `color.brand.secondary` | `#3b82f6` | `--color-secondary` | Azul de apoyo |

> **`#6a5acd` es el color de marca real del producto.** Es el que consume el generador de
> wireframes y el que el implementador recibe vía `bg.action.primary`. No sustituirlo por otro.

### Neutral — escala de grises (tipo Tailwind, 10 pasos)

| Token | Variable CSS |
|---|---|
| `color.neutral.50` … `color.neutral.900` | `--color-gray-50` … `--color-gray-900` |

### Semántico

| Token | Hex | Variable CSS |
|---|---|---|
| `color.success` | `#22c55e` | `--color-success` |
| `color.warning` | `#f59e0b` | `--color-warning` |
| `color.error` | `#ef4444` | `--color-danger` |
| `color.info` | `#3b82f6` | `--color-info` — ⚠️ **idéntico a `--color-secondary`** |

### Fondo y superficies (el glassmorphism)

| Token | Valor | Variable CSS |
|---|---|---|
| `bg.base.primary` | `#1a1a3a` | `--bg-dark-primary` |
| `bg.base.secondary` | `#2d2d5a` | `--bg-dark-secondary` |
| `bg.base.tertiary` | `#4a4a8a` | `--bg-dark-tertiary` |
| `bg.glass` | `rgba(255,255,255,0.05)` | `--glass-bg` |
| `bg.glass.hover` | `rgba(255,255,255,0.1)` | `--glass-bg-hover` |
| `border.glass` | `rgba(255,255,255,0.1)` | `--glass-border` |
| `border.glass.hover` | `rgba(255,255,255,0.2)` | `--glass-border-hover` |

El `body` usa `linear-gradient(135deg, …)` entre los tres fondos base, con
`background-attachment: fixed`.

## Tokens semánticos

| Token | Valor | Uso |
|---|---|---|
| `bg.surface` | `bg.glass` + `border.glass` | La tarjeta glass: **la superficie base de toda la app** |
| `bg.action.primary` | `color.brand.primary` | Fondo de botón primario |
| `text.primary` | `color.neutral.50` (aprox.) | Texto principal sobre fondo oscuro |
| `text.muted` | ⚠️ **sin token** | Ver deuda #2 |
| `border.default` | `border.glass` | Bordes de superficie |

## Guidelines

**Do:**
- Usar `var(--…)` siempre. **Hay token para casi todo lo que hace falta.**
- Para cualquier superficie nueva, partir del patrón glass: `--glass-bg` + `--glass-border` +
  `--radius-lg`.
- Comunicar estado con **texto además de color** — como ya hacen los badges (`✓ Submitted`,
  `⏳ Pending`).

**Don't:**
- **No escribir colores hex literales.** Es la deuda #1 de esta fundación.
- No usar `#3b82f6` a mano: existe como `--color-secondary` y como `--color-info`.
- No asumir tema claro: **solo dos componentes lo soportan** (ver deuda #3).

## Deuda conocida

1. ⚠️ **Un tercio de los colores está hardcodeado.** 753 usos de `var(--…)` contra **350 hex
   literales**. El más repetido es `#ffffff` (29 veces). `#3b82f6` aparece 9 veces a mano pese a
   tener dos tokens.
2. ⚠️ **Hay una segunda paleta implícita, sin tokens.** Grises y pasteles usados para textos
   secundarios y estados suaves que **no tienen equivalente en la escala**: `#fca5a5` (13),
   `#e2e8f0` (12), `#94a3b8` (12), `#86efac` (11), `#cbd5e1` (10). **Darles token es el trabajo más
   valioso de esta fundación**, porque hoy `text.muted` no tiene valor asignable.
3. ⚠️ **Tema claro a medias.** Solo `Auth.css` y `Modal.css` responden a
   `prefers-color-scheme: light`. El resto de la aplicación queda oscura, así que el modo claro
   está roto por diseño.
4. ⚠️ **Fuente de verdad duplicada.** Las 57 variables de `index.css` están **repetidas** en
   `global.css` (que define 79 en total). Los valores coinciden, así que hoy no hay diferencia
   visible — pero son dos lugares donde cambiar un token.
5. ⚠️ **`--color-info` y `--color-secondary` tienen el mismo valor.** O son el mismo rol y sobra
   uno, o son roles distintos y deberían diferenciarse.

## Accesibilidad

⚠️ **Sin verificar.** No hay auditoría de contraste. Sobre un fondo oscuro con superficies
translúcidas al 5% de opacidad, el contraste de texto secundario es el riesgo principal — y es
exactamente donde vive la paleta sin tokens de la deuda #2.

**Objetivo WCAG: no definido.** Ver Feature Group 4 del PRD.

## Historial

- 2026-09-18 v1.0.0 — Sembrado desde `web/src/styles/global.css` y `web/src/index.css` por
  `/product-consolidate-services`.
