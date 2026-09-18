---
foundation: grid
version: 1.0.0
last_updated: 2026-09-18
status: relevado-desde-código
platform: web
---

# Grid (web)

> **Sembrado desde el código existente** (`web`), no un placeholder.
> Los valores de esta página son los que **el CSS implementado usa hoy**, contados sobre las media
> queries reales. `[fuente: código-existente]`
>
> **Esta es ahora la fuente contra la que se implementa el responsive.** Si un valor de acá cambia,
> cambia el comportamiento de código ya desplegado: es un cambio breaking (ver `governance.md`).

## Propósito

Sistema de grilla y breakpoints para layout responsive.

**Este archivo es la fuente única de los valores de breakpoint.** Lo consumen:
- `/service-planify-story`, que lo copia al Story Plan.
- `/service-implement-story`, que implementa contra estos tokens.
- `/product-ux-wireframes`, que titula los layouts por viewport con los anchos reales.

## El dato más importante: el CSS es desktop-first

**Todos los breakpoints del producto son `max-width`.** La regla base describe el desktop y los
`@media` van restando ancho. Esto es lo contrario de la convención mobile-first habitual, y hay que
saberlo antes de escribir una línea de CSS en este proyecto.

## Viewports de UX ↔ breakpoints

| Viewport UX | Ancho del frame | Aplica | Evidencia |
|---|---|---|---|
| `desktop` | 1200px | por encima de 768px | Es la **regla base** de todo el CSS |
| `mobile` | 400px | 768px y abajo | **13 de las 24** media queries de ancho del proyecto |

**El corte estructural real es 768px, y es el único.** Entre 769px y cualquier ancho mayor, el
layout no cambia: no hay breakpoint superior.

## Breakpoints reales

Contados sobre las media queries del proyecto. Ninguno está declarado como escala: **cada `@media`
repite el número literal**, no hay variables CSS de breakpoint ni archivo de configuración.

| Valor | Ocurrencias | Tipo | Qué hace |
|---|---|---|---|
| `1024px` | 2 | Ajuste | La tabla de eventos baja su `min-width` de 800px a 700px y pasa a columnas fraccionales |
| **`768px`** | **13** | **Estructural** | **El corte real del producto.** Tablas→tarjetas, filas→columnas, botones a ancho completo |
| `600px` | 3 | Ajuste | ⚠️ `EventTimeline` **oculta descripciones y deadlines** (ver gaps) |
| `480px` | 6 | Ajuste | Reduce padding y tipografía |

**Archivos por breakpoint:**
- `1024px` — `EventDetailPage.css:616`, `Events.css:181`
- `768px` — `App.css:105`, `index.css:654`, `styles/global.css:818`, y 10 más
- `600px` — `EventTimeline.css:239`, `VotingConfigurationPanel.css:216`, `VotingResultsPanel.css:204`
- `480px` — `global.css:834`, `Auth.css:275`, `Modal.css:105`, `Events.css:275`,
  `Participants.css:330`, `EventDetailPage.css:712`

### Para el rango intermedio

- **769px–1023px:** se comporta **como desktop** (es la regla base).
- **601px–768px:** se comporta **como mobile**, con el layout completo de tarjetas.
- **≤600px:** mobile **menos los deadlines y descripciones del timeline** — que es un defecto, no
  una decisión (ver `gaps-as-is.md`).

## Guidelines

**Do:**
- **Escribir desktop-first**, con `max-width`, para ser coherente con el resto del CSS.
- Usar `768px` para cualquier cambio estructural de layout.
- Usar `480px` solo para ajustes de padding y tipografía.

**Don't:**
- **No introducir breakpoints nuevos.** Los cuatro valores existentes ya son más de los que el
  producto necesita; agregar un quinto empeora la dispersión.
- **No ocultar información con `display:none` en un breakpoint.** Es exactamente el defecto de
  `EventTimeline` a 600px, que deja al participante sin ver el deadline.
- No usar `600px` para cambios estructurales: hoy solo lo usan tres componentes.

## Deuda conocida

1. ⚠️ **Los breakpoints no existen como escala.** Cada `@media` repite el literal. Un cambio de
   breakpoint exige tocar N archivos. **Extraerlos a variables CSS es la mejora de mayor relación
   valor/esfuerzo de esta fundación.**
2. ⚠️ **Hay CSS responsive muerto.** `EventDetailPage.css` tiene tres bloques completos (1024px,
   768px, 480px) apuntando a clases del layout anterior (`.event-title-row`, `.stats-grid`,
   `.tabs`) que el JSX ya no usa. **Consecuencia real: la pantalla de detalle actual no tiene
   reglas a 480px.**
3. ⚠️ **`reset-password` no tiene ninguna media query propia**: un solo layout para todo ancho.

## Accesibilidad

- Contenido usable a 200% de zoom sin scroll horizontal. **No verificado** en la implementación
  actual.
- En mobile, evitar columnas de texto menores a 320px.

## Historial

- 2026-09-18 v1.0.0 — Sembrado desde el código existente de `web` por
  `/product-consolidate-services`. Valores contados sobre las media queries reales.
