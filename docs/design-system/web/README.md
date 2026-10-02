---
design_system: web
version: 2.0.0
last_updated: 2026-10-02
status: diseñado
platform: web
---

# Design System — `web`

> **v2.0.0 — lenguaje visual del rediseño (REQ-003).** Reemplaza al DS relevado del código
> (v1.0.0, glassmorphism oscuro). Fuente: `documentation/Telescopio Rediseño Vistas.html` y las
> decisiones DA-7 / DA-8 de [REQ-003](../../requests/REQ-003.rediseno-de-vistas-notificaciones-y-multilenguaje.md).
>
> ⚠️ **El código desplegado todavía usa la v1.0.** La v2.0.0 se implementa con las stories de
> fundaciones del front de REQ-003. Hasta entonces, documentación y código no coinciden.

**Plataforma:** `web` · **Viewports:** `mobile` (base), `desktop` (≥ 768px) · **Mobile-first**

## Fundaciones

| Fundación | Estado | Notas |
|---|---|---|
| [color](./foundations/color.md) | **Diseñada** | Bandas oscuras + contenido claro. Acción **`#4B3FA8`**, acento `#6E5BF2`, señal `#35D6F2` |
| [typography](./foundations/typography.md) | **Diseñada** | Plus Jakarta Sans + JetBrains Mono, escala de 10 pasos |
| [spacing](./foundations/spacing.md) | **Diseñada** | Base 4px + radios del rediseño |
| [grid](./foundations/grid.md) | **Diseñada** | Mobile-first, único corte en 768px, contenedor 1200px |
| [elevation](./foundations/elevation.md) | **Diseñada** | Poca sombra; anillo de foco y backdrop |
| [motion](./foundations/motion.md) | Placeholder | Tokens de transición en `spacing.md` |
| [iconography](./foundations/iconography.md) | Placeholder | El rediseño deja de usar emojis como ícono; falta elegir el set |
| [voice-tone](./foundations/voice-tone.md) | Placeholder | Español rioplatense neutro de género + inglés (REQ-003) |

## Componentes

Primitivos de `src/components/ui/` (DA-8). Los compuestos de dominio (EventHero, StageTimeline,
NextStepCard, SortableRankList, NotificationItem, AppHeader, AuthLayout…) **no** son del DS: se
arman con estos y los especifican los screen.md.

| Componente | Rol | Pantallas |
|---|---|---|
| [button](./components/button.md) | Acciones | Todas |
| [text-field](./components/text-field.md) | Texto, multilínea con contador, búsqueda | Auth, Crear/editar evento, Detalle, Eventos |
| [dialog](./components/dialog.md) | Overlay modal accesible | O-07, O-08, O-14 a O-19 |
| [card](./components/card.md) | Superficie (incl. CtaBanner) | Todas |
| [status-pill](./components/status-pill.md) | Estado de evento, archivo, voto, rol | Todas las de eventos |
| [data-table](./components/data-table.md) | Tabla con acción única, apilada en mobile | Eventos, Mis eventos, Gestión, Participantes, Resultados |
| [filter-tabs](./components/filter-tabs.md) | Filtros con conteo | Eventos |
| [progress-bar](./components/progress-bar.md) | Cupo, rankings enviados | Inicio, Eventos, Gestión |
| [stat-tile](./components/stat-tile.md) | Métricas | Gestión, Abrir votación |
| [callout](./components/callout.md) | Avisos y error de bloque con reintento | Detalle, Gestión, diálogos |
| [empty-state](./components/empty-state.md) | Sin datos + acción | Gestión, Mis eventos, Notificaciones, 404 |
| [date-quick-picker](./components/date-quick-picker.md) | Fecha con atajos | O-07, O-15, O-16 |
| [number-stepper](./components/number-stepper.md) | Entero con − / + | Crear evento, O-16, O-18 |
| [file-dropzone](./components/file-dropzone.md) | Carga de propuesta + FileChip | Detalle |
| [menu](./components/menu.md) | Menú de usuario, idioma | Header |

## Pendientes conocidos

1. **Hover y active** de los botones: el diseño no los define (`bg.action.primary.hover` en Pendiente).
2. **Fondo suave de error:** el diseño no lo define.
3. **Set de íconos:** iconography sigue en placeholder.
4. **"✓ Copiado" blanco sobre verde** no cumple AA (3.5:1); ver `color.md` → Accesibilidad.

## Cómo se actualiza

`/product-design-system-update`. Ver [`governance.md`](./governance.md).
