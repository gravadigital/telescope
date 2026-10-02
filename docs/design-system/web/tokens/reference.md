---
tokens: reference
version: 2.0.0
last_updated: 2026-10-02
status: diseñada
---

# Tokens — Reference (primitivos)

> Tier 1. **No se consumen desde componentes**: siempre vía [`semantic.md`](./semantic.md).
> Valores del rediseño de REQ-003. `[fuente: diseño REQ-003]`

```
Reference (primitivos)  ←  ESTE NIVEL
        ↓
Semantic (alias)
        ↓
Component
```

## Color

| Token | Valor |
|---|---|
| `color.black` | `#000000` |
| `color.white` | `#FFFFFF` |
| `color.ink.900` | `#0B1020` |
| `color.ink.800` | `#141A2E` |
| `color.gray.700` | `#39414D` |
| `color.gray.600` | `#575E6B` |
| `color.gray.500` | `#6E7687` |
| `color.gray.400` | `#8892A8` |
| `color.gray.300` | `#D3D9E2` |
| `color.gray.200` | `#E1E5EC` |
| `color.gray.150` | `#E8ECF2` |
| `color.gray.100` | `#F1F3F6` |
| `color.gray.50` | `#FAFBFC` |
| `color.violet.700` | `#4B3FA8` |
| `color.violet.500` | `#6E5BF2` |
| `color.violet.200` | `#CFC9F7` |
| `color.violet.100` | `#EAE7F9` |
| `color.violet.50` | `#F8F7FF` |
| `color.cyan.400` | `#35D6F2` |
| `color.green.700` | `#16744A` |
| `color.green.600` | `#1F9D62` |
| `color.green.100` | `#E1F1E8` |
| `color.amber.700` | `#8A6212` |
| `color.amber.500` | `#E9A227` |
| `color.amber.100` | `#F7EDD6` |
| `color.red.700` | `#B8381F` |

## Tipografía

| Token | Valor |
|---|---|
| `font.family.base` | `'Plus Jakarta Sans', system-ui, sans-serif` |
| `font.family.mono` | `'JetBrains Mono', monospace` |
| `font.size.2xs` … `font.size.5xl` | 12 · 13 · 14 · 15 · 16 · 18 · 20 · 28 · 36 · 44 px |
| `font.weight.regular` … `extrabold` | 400 · 500 · 600 · 700 · 800 |
| `font.leading.tight` / `snug` / `normal` / `relaxed` | 1 · 1.35 · 1.55 · 1.6 |
| `font.tracking.tight` / `wide` | -0.02em · 0.12em |

## Espaciado y forma

| Token | Valor |
|---|---|
| `space.xs` · `sm` · `ms` · `md` · `lg` · `lx` · `xl` · `2xl` | 4 · 8 · 12 · 16 · 24 · 28 · 32 · 48 px |
| `radius.xs` / `sm` / `md` / `lg` / `xl` / `2xl` / `full` | 6 · 8 · 10 · 12 · 14 · 18 · 999 px |

## Elevación

| Token | Valor |
|---|---|
| `shadow.1` | `0 10px 30px rgba(11,16,32,.08)` |
| `shadow.2` | `0 20px 60px rgba(11,16,32,.18)` |
| `shadow.3` | `0 30px 80px rgba(0,0,0,.35)` |
| `shadow.4` | `0 24px 60px rgba(11,16,32,.28)` |

## Breakpoint

| Token | Valor |
|---|---|
| `bp.desktop` | `768px` |

## Reglas

- Una sola definición en código: `src/styles/tokens.css` (DA-7). Se elimina la copia de `index.css`.
- Cambiar el valor de un primitivo: PATCH si es calibración, MAJOR si cambia la apariencia general.

## Historial

- 2026-09-18 v0.1.0 — Placeholder inicial.
- 2026-10-02 v2.0.0 — Primitivos del rediseño de REQ-003.
