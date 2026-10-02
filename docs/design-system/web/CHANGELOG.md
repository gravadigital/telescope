# Design System — Changelog

Sigue el formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)
y el versionado [Semantic Versioning](https://semver.org/lang/es/).

## [2.0.0] - 2026-10-02

> **Breaking.** Reemplaza el lenguaje visual relevado del código (glassmorphism oscuro) por el del
> rediseño de REQ-003 (`documentation/Telescopio Rediseño Vistas.html`, DA-7 y DA-8). Origen: la
> sección `## Revisión UX` de REQ-003, que dejó estos cambios en `pendiente-DS`.

### Cambiado
- `foundations/color.md`: paleta nueva — bandas `#000000`, acción `#4B3FA8`, acento `#6E5BF2`, señal `#35D6F2`, neutros fríos, estados verde / ámbar / rojo. `color.brand.primary` pasa de `#6a5acd` a `#4B3FA8`. Contrastes calculados.
- `foundations/typography.md`: Plus Jakarta Sans + JetBrains Mono (antes fuentes de sistema); escala de 10 pasos; tokens de peso, interlineado y tracking.
- `foundations/grid.md`: mobile-first con un único breakpoint `768px` (`min-width`); contenedor de 1200px; se abandonan los cortes de 1024 / 600 / 480px.
- `foundations/spacing.md`: escala de radios del rediseño (6 · 8 · 10 · 12 · 14 · 18 · 999px).
- `tokens/semantic.md`: remapeo completo a los roles nuevos (`bg.band`, `bg.accent`, `bg.unread`, `text.inverse.secondary`, `text.signal`, `radius.*`, `shadow.*`).
- `components/button.md`: variants primary / secondary / tertiary / onBand / icon, sizes sm/md/lg, estado loading.
- `components/modal.md` → **renombrado a `dialog.md`**: `role="dialog"`/`alertdialog`, foco atrapado, Escape, eyebrow de transición, pantalla completa en mobile.
- `components/status-badge.md` → **renombrado a `status-pill.md`**: tonos del rediseño y nombres de etapa únicos.
- `components/glass-card.md` → **renombrado a `card.md`**: superficie clara con variants default / subtle / raised / feature (CtaBanner) / interactive.

### Agregado
- `foundations/elevation.md`: niveles de sombra, anillo de foco y backdrop (antes placeholder).
- `foundations/spacing.md`: `space.ms` (12px) y `space.lx` (28px).
- `tokens/reference.md` y `tokens/component.md`: primitivos y tokens por componente (antes placeholder).
- Componentes: `text-field` (con multilínea y búsqueda), `filter-tabs`, `data-table`, `progress-bar`, `stat-tile`, `callout`, `empty-state`, `date-quick-picker`, `number-stepper`, `file-dropzone`, `menu`.

### Eliminado
- Tokens glass (`bg.glass*`, `border.glass*`), fondos degradados `bg.base.*` y la marca `#6a5acd`.

### Migración
- `modal` → `dialog` · `status-badge` → `status-pill` · `glass-card` → `card` (variant `default`).
- `--glass-bg` + `--glass-border` → `bg.surface` + `border.default`. `--color-primary` → `bg.action.primary`.
- Media queries `max-width` → regla base mobile + `@media (min-width: 768px)`.
- El código desplegado sigue en v1.0.0: la migración la hacen las stories de fundaciones del front de REQ-003.

---

## [1.0.0] - 2026-09-18

### Agregado
- Fundaciones color, typography, spacing y grid, y componentes button, glass-card, modal y status-badge, sembrados desde el código existente por `/product-consolidate-services`.

---

## [0.1.0] - 2026-09-18

### Agregado
- Estructura inicial del Design System (bootstrap automático).
- Archivos placeholder en foundations/, tokens/, guidelines/.
- Carpetas vacías components/ y patterns/.

> **Nota:** esta versión `0.1.0` es solo la estructura inicial. El primer DS
> "real" se versiona como `0.2.0` o superior cuando el equipo de diseño
> reemplace los placeholders con valores definitivos.

---

## Cómo registrar cambios

Cada vez que se ejecuta `/product-design-system-update`, el agente:

1. Aplica el cambio pedido.
2. Bumpea versión semver según naturaleza:
   - **MAJOR**: breaking (remover variant, renombrar componente)
   - **MINOR**: agregar (componente, variant, foundation)
   - **PATCH**: corrección, ajuste de spec
3. Agrega entrada en este CHANGELOG con formato:

```
## [X.Y.Z] - YYYY-MM-DD

### Agregado / Cambiado / Eliminado / Corregido / Deprecado
- {descripción concisa del cambio}
```
