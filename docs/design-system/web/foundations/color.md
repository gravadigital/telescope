---
foundation: color
version: 2.1.0
last_updated: 2026-11-06
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

**Bandas oscuras + contenido claro.** El negro se usa **solo** para identidad y navegación de la
plataforma: el header, el footer y el panel de marca de auth. El encabezado de evento (EventHero)
usa el **color de portada del evento** (REQ-004), para que plataforma y evento no se confundan. Todo el contenido vive
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

### Portada del evento (REQ-004)

Paleta **cerrada** de 16 pasteles para el fondo del EventHero (`events.cover_color`). El
**identificador** es el contrato: la API lo valida como enum y lo guarda; `web` lo traduce a
`--cover-{id}`. Recalibrar un hex es PATCH y no migra datos; **renombrar o quitar un
identificador es MAJOR** y exige migración en `api`. `[fuente: input-cliente — REQ-004; valores
elegidos por Claude con autorización del usuario]`

Criterio: todos tienen la **misma luminancia relativa (≈ 0,69)**, repartidos en el círculo
cromático más dos neutros (`sand`, `mist`). Así ninguno compite con el texto y los contrastes son
parejos: el que se elija no cambia la legibilidad.

| # | Identificador | Nombre (ES / EN) | Hex | Primitivo | `text.primary` | `text.secondary` | vs `bg.canvas` |
|---|---|---|---|---|---|---|---|
| 1 | `lavender` **(default)** | Lavanda / Lavender | `#D9D4FA` | `color.cover.lavender` | 13.3 | 4.58 | 1.28 |
| 2 | `periwinkle` | Vincapervinca / Periwinkle | `#CDD8F9` | `color.cover.periwinkle` | 13.3 | 4.59 | 1.28 |
| 3 | `sky` | Cielo / Sky | `#B6DEF7` | `color.cover.sky` | 13.3 | 4.59 | 1.28 |
| 4 | `ice` | Hielo / Ice | `#A8E3E9` | `color.cover.ice` | 13.4 | 4.61 | 1.27 |
| 5 | `aqua` | Agua / Aqua | `#ADE4D7` | `color.cover.aqua` | 13.4 | 4.62 | 1.27 |
| 6 | `mint` | Menta / Mint | `#B0E5C2` | `color.cover.mint` | 13.4 | 4.61 | 1.27 |
| 7 | `pistachio` | Pistacho / Pistachio | `#C5E2A8` | `color.cover.pistachio` | 13.4 | 4.60 | 1.27 |
| 8 | `lemon` | Limón / Lemon | `#E3DB90` | `color.cover.lemon` | 13.3 | 4.60 | 1.28 |
| 9 | `butter` | Manteca / Butter | `#F4D49E` | `color.cover.butter` | 13.3 | 4.59 | 1.28 |
| 10 | `peach` | Durazno / Peach | `#F9D0B9` | `color.cover.peach` | 13.3 | 4.58 | 1.28 |
| 11 | `coral` | Coral / Coral | `#F9CFCA` | `color.cover.coral` | 13.3 | 4.60 | 1.28 |
| 12 | `rose` | Rosa / Rose | `#F8CEDA` | `color.cover.rose` | 13.4 | 4.61 | 1.27 |
| 13 | `pink` | Chicle / Bubblegum | `#F4CDE9` | `color.cover.pink` | 13.3 | 4.58 | 1.28 |
| 14 | `lilac` | Lila / Lilac | `#EECEF5` | `color.cover.lilac` | 13.3 | 4.59 | 1.28 |
| 15 | `sand` | Arena / Sand | `#E2D7CA` | `color.cover.sand` | 13.3 | 4.60 | 1.28 |
| 16 | `mist` | Bruma / Mist | `#D2D9E4` | `color.cover.mist` | 13.3 | 4.59 | 1.28 |

**Orden canónico (enum de la API):** `lavender`, `periwinkle`, `sky`, `ice`, `aqua`, `mint`, `pistachio`, `lemon`, `butter`, `peach`, `coral`, `rose`, `pink`, `lilac`, `sand`, `mist`.

**Contraste (mínimo sobre los 16):** `text.primary` 13,3:1 · `text.secondary` 4,58:1 ·
`text.action` 5,73:1 — todos AA. **`text.muted` no se usa sobre la portada** (3,2:1, no
llega a AA). Contra `bg.canvas` el pastel queda en ≥ 1,27:1
y ΔE ≥ 11 (antes 1,01:1): se distingue del fondo de la página, y el EventHero suma un borde
inferior `border.default` para el caso de baja visión. Entre pastel y pastel, ΔE76 ≥ 6,1.

## Tokens semánticos de color

Los componentes consumen **estos**, nunca los primitivos. Detalle completo en
[`tokens/semantic.md`](../tokens/semantic.md).

| Token | Valor | Uso |
|---|---|---|
| `bg.canvas` | `color.gray.100` | Fondo de página |
| `bg.surface` | `color.white` | Tarjetas, diálogos, tablas |
| `bg.surface.subtle` | `color.gray.50` | Superficie secundaria |
| `bg.band` | `color.black` | Header, footer y panel de marca (REQ-004: el EventHero deja la banda) |
| `bg.cover.{id}` | `color.cover.{id}` | Fondo del EventHero según `cover_color` (REQ-004) |
| `bg.cover.default` | `color.cover.lavender` | EventHero de un evento sin elección explícita |
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
- Usar el negro solo en bandas de identidad y navegación de la plataforma (header, footer, auth). El EventHero usa `bg.cover.{id}` (REQ-004).
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
- 2026-11-06 v2.1.0 — REQ-004: paleta de 16 pasteles de portada (`color.cover.*`, default `lavender`), tokens `bg.cover.*`; `bg.band` pasa a header + footer y el EventHero toma el color del evento.
