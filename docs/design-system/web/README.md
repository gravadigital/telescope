---
design_system: web
version: 1.0.0
last_updated: 2026-09-18
status: relevado-desde-código
platform: web
---

# Design System — `web`

> **Sembrado desde el código existente** por `/product-consolidate-services` el 2026-09-18.
> Los valores son los que el CSS implementado usa hoy, no propuestas.

**Plataforma:** `web` · **Viewports:** `desktop`, `mobile` · **Corte estructural:** 768px

## Estado de las piezas

### Fundaciones

| Fundación | Estado | Notas |
|---|---|---|
| [grid](./foundations/grid.md) | **Sembrada** | Breakpoints reales. **Desktop-first**, corte único en 768px |
| [color](./foundations/color.md) | **Sembrada** | Paleta real. Marca: **`#6a5acd`** |
| [typography](./foundations/typography.md) | **Sembrada** | Stack de sistema, escala de 7 pasos |
| [spacing](./foundations/spacing.md) | **Sembrada** | Base 4px. **La mejor conservada** |
| [motion](./foundations/motion.md) | Placeholder | Hay tokens de transición en `spacing.md` |
| [elevation](./foundations/elevation.md) | Placeholder | Hay tokens de sombra en `spacing.md` |
| [iconography](./foundations/iconography.md) | Placeholder | ⚠️ El producto usa **emojis** como iconos |
| [voice-tone](./foundations/voice-tone.md) | Placeholder | Requiere decisión de producto sobre idioma |

### Componentes relevados

Los cuatro son **candidatos**: se repiten y son genéricos, pero **ninguno existe hoy como
componente** salvo `Modal`.

| Componente | ¿Existe en código? | Prioridad de componentizar |
|---|---|---|
| [modal](./components/modal.md) | ✅ Sí, 4 usos | **Alta** — corregir accesibilidad acá arregla 4 overlays |
| [button](./components/button.md) | ❌ Sistema de clases CSS | **Alta** — el elemento más usado |
| [glass-card](./components/glass-card.md) | ❌ Patrón duplicado a mano | **Alta** — es la superficie base de todo |
| [status-badge](./components/status-badge.md) | ❌ CSS duplicado por archivo | Media |

## Las tres deudas que atraviesan todo el DS

1. **Fuente de verdad duplicada.** Las 57 variables de `index.css` están repetidas en `global.css`.
2. **Un tercio de los colores hardcodeado** (350 hex vs 753 `var()`), con una **paleta implícita sin
   tokens** para textos secundarios.
3. **Accesibilidad de overlays.** Ningún modal tiene `role="dialog"`, gestión de foco ni cierre por
   Escape.

## Cómo se actualiza

`/product-design-system-update`. Cualquier cambio a una fundación sembrada es **breaking**: el
código ya implementado depende de esos valores.
