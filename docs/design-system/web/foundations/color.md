---
foundation: color
version: 2.0.0
last_updated: 2026-10-02
status: diseñada
---

# Color

> **v2.0.0 — lenguaje visual del rediseño (REQ-003, DA-7).** Los valores salen del archivo de diseño
> `documentation/Telescopio Rediseño Vistas.html` (pantallas 1a–2g), contados sobre los estilos de
> sus 19 pantallas. `[fuente: diseño REQ-003]`
>
> Reemplaza la paleta glassmorphism de la v1.0 (relevada del código). Ver la migración en el
> `CHANGELOG.md`.

## El lenguaje visual

**Bandas oscuras + contenido claro.** El negro se usa **solo** para identidad y navegación: el
header, el encabezado de evento (EventHero) y el panel de marca de auth. Todo el contenido vive
sobre fondo claro, en superficies blancas con borde fino. Cada pantalla tiene **un único** paso
destacado en el color de acción. `[fuente: diseño — nota "Sistema" del Turno 1]`

## Paleta (primitivos)

### Marca

| Token | Hex | Uso |
|---|---|---|
| `color.violet.700` | **`#4B3FA8`** | **Color de acción.** Botón primario, links y acciones sobre fondo claro |
| `color.violet.500` | `#6E5BF2` | Acento: etapa "ahora", indicador de no leída, foco, acciones sobre banda oscura |
| `color.violet.200` | `#CFC9F7` | Texto secundario sobre banda oscura |
| `color.violet.100` | `#EAE7F9` | Fondo suave de acción (chips de etiqueta, anillo de foco) |
| `color.violet.50` | `#F8F7FF` | Fondo de ítem no leído |
| `color.cyan.400` | `#35D6F2` | Señal sobre banda oscura: contador de la campana, números destacados, logo |

### Neutros

| Token | Hex | Uso |
|---|---|---|
| `color.black` | `#000000` | Bandas de navegación y encabezado |
| `color.ink.900` | `#0B1020` | Texto principal sobre claro |
| `color.ink.800` | `#141A2E` | Superficie elevada dentro de una banda oscura |
| `color.gray.700` | `#39414D` | Texto de énfasis medio |
| `color.gray.600` | `#575E6B` | Texto secundario |
| `color.gray.500` | `#6E7687` | Texto atenuado, metadatos |
| `color.gray.400` | `#8892A8` | Texto deshabilitado, placeholders |
| `color.gray.300` | `#D3D9E2` | Borde fuerte, controles deshabilitados |
| `color.gray.200` | `#E1E5EC` | Borde por defecto, divisores |
| `color.gray.150` | `#E8ECF2` | Fondo de chip neutro |
| `color.gray.100` | `#F1F3F6` | Fondo de página (canvas) |
| `color.gray.50` | `#FAFBFC` | Superficie sutil (filas alternas, tarjetas de podio) |
| `color.white` | `#FFFFFF` | Superficie |

### Estado

| Token | Hex | Uso |
|---|---|---|
| `color.green.600` | `#1F9D62` | Éxito sólido ("✓ Copiado", etapa completada) |
| `color.green.700` | `#16744A` | Texto de éxito sobre fondo suave |
| `color.green.100` | `#E1F1E8` | Fondo de éxito ("Inscripción abierta", "✓ Enviado") |
| `color.amber.500` | `#E9A227` | Advertencia sólida |
| `color.amber.700` | `#8A6212` | Texto de advertencia sobre fondo suave |
| `color.amber.100` | `#F7EDD6` | Fondo de advertencia ("Falta archivo", "Pendiente") |
| `color.red.700` | `#B8381F` | Error (texto y borde) |

> ⚠️ **El diseño no define un fondo suave de error.** Se usa `#B8381F` como texto y borde sobre
> blanco. Si hace falta un fondo, se pide al diseño; no se inventa (regla 13).

## Tokens semánticos de color

Los componentes consumen **estos**, nunca los primitivos. Detalle completo en
[`tokens/semantic.md`](../tokens/semantic.md).

| Token | Valor | Uso |
|---|---|---|
| `bg.canvas` | `color.gray.100` | Fondo de página |
| `bg.surface` | `color.white` | Tarjetas, diálogos, tablas |
| `bg.surface.subtle` | `color.gray.50` | Superficie secundaria |
| `bg.band` | `color.black` | Header, EventHero, panel de marca |
| `bg.band.raised` | `color.ink.800` | Superficie dentro de una banda |
| `bg.action.primary` | `color.violet.700` | Botón primario |
| `bg.action.subtle` | `color.violet.100` | Fondo suave de acción |
| `bg.accent` | `color.violet.500` | Acento ("ahora", no leída) |
| `bg.unread` | `color.violet.50` | Ítem no leído |
| `bg.success` / `bg.success.subtle` | `color.green.600` / `color.green.100` | Éxito |
| `bg.warning` / `bg.warning.subtle` | `color.amber.500` / `color.amber.100` | Advertencia |
| `bg.neutral.subtle` | `color.gray.150` | Chip neutro |
| `bg.disabled` | `color.gray.200` | Control deshabilitado |
| `text.primary` | `color.ink.900` | Texto principal |
| `text.secondary` | `color.gray.600` | Texto secundario |
| `text.muted` | `color.gray.500` | Metadatos |
| `text.disabled` | `color.gray.400` | Deshabilitado |
| `text.inverse` | `color.white` | Texto sobre banda |
| `text.inverse.secondary` | `color.violet.200` | Texto secundario sobre banda |
| `text.signal` | `color.cyan.400` | Señal sobre banda |
| `text.action` | `color.violet.700` | Links y botón secundario |
| `text.success` / `text.warning` / `text.error` | `color.green.700` / `color.amber.700` / `color.red.700` | Estado |
| `border.default` | `color.gray.200` | Bordes |
| `border.strong` | `color.gray.300` | Bordes de controles |
| `border.focus` | `color.violet.500` | Foco |
| `border.error` | `color.red.700` | Campo inválido |

`color.brand.primary` = **`#4B3FA8`** (`color.violet.700`). Es el valor que lee el generador de
wireframes.

## Guidelines

**Do:**
- Usar el negro solo en bandas de identidad y navegación (header, EventHero, auth).
- Un solo elemento en `bg.action.primary` por pantalla: el paso destacado.
- Comunicar estado con texto además de color ("✓ Enviado", "Pendiente").
- Usar `text.inverse.secondary` y `text.signal` para jerarquía dentro de una banda.

**Don't:**
- No escribir hex literales en componentes (deuda #1 de la v1.0, RF 7).
- No poner contenido largo sobre `bg.band`: la banda es identidad, no lectura.
- No usar `bg.accent` como botón primario sobre fondo claro: el primario es `bg.action.primary`.
- No usar el cian sobre fondo claro (contraste insuficiente).

## Accesibilidad

Contrastes calculados sobre los pares que el diseño usa:

| Par | Ratio | WCAG AA texto normal (4.5:1) |
|---|---|---|
| `text.primary` sobre `bg.surface` | 18.9:1 | ✓ |
| `text.secondary` sobre `bg.surface` | 6.5:1 | ✓ |
| `text.muted` sobre `bg.surface` | 4.56:1 | ✓ (justo) |
| `text.muted` sobre `bg.canvas` | 4.1:1 | ✗ — en el canvas usar `text.secondary` |
| blanco sobre `bg.action.primary` | 8.2:1 | ✓ |
| blanco sobre `bg.accent` | 4.7:1 | ✓ |
| blanco sobre `bg.success` | 3.5:1 | ✗ — **el "✓ Copiado" del diseño no cumple**; usar texto `font.weight.bold` ≥ 18.66px o `text.success` sobre `bg.success.subtle` |
| `text.success` sobre `bg.success.subtle` | 4.9:1 | ✓ |
| `text.warning` sobre `bg.warning.subtle` | 4.7:1 | ✓ |
| `text.error` sobre `bg.surface` | 5.8:1 | ✓ |
| `text.inverse.secondary` sobre `bg.band` | 13.4:1 | ✓ |
| `text.signal` sobre `bg.band` | 12.1:1 | ✓ |
| `text.disabled` sobre `bg.surface` | 3.1:1 | ✗ — aceptable solo en controles deshabilitados (WCAG los exime) |

**Objetivo:** WCAG 2.1 AA (REQ-003 FG-4). Ratios calculados con la fórmula de luminancia relativa
de WCAG 2.1.

## Historial

- 2026-09-18 v1.0.0 — Sembrado desde `web/src/styles/global.css` y `web/src/index.css` por
  `/product-consolidate-services` (glassmorphism oscuro, marca `#6a5acd`).
- 2026-10-02 v2.0.0 — **Breaking.** Paleta del rediseño de REQ-003: bandas oscuras + contenido
  claro, acción `#4B3FA8`, acento `#6E5BF2`, señal `#35D6F2`. Se eliminan los tokens glass y los
  fondos degradados.
