---
component: color-swatch-picker
version: 2.1.1
status: active
last_updated: 2026-11-06
related: [text-field, number-stepper, dialog]
---

# ColorSwatchPicker

## Propósito

Elige **un** color de una paleta **cerrada**, viendo los colores en lugar de leer nombres.
`[fuente: input-cliente — REQ-004]`

**Cuándo usar:** el color de portada del evento, en Crear evento (S-03, paso 1) y en Editar datos
(O-18, también en el modo "solo color"). Paleta: los 16 `color.cover.*` de
[`foundations/color.md` → Portada del evento](../foundations/color.md).

**Cuándo NO usar:** colores libres (el producto no los admite) ni listas largas o con significado
(estados, categorías): ahí va un select o [filter-tabs](./filter-tabs.md).

## Anatomía

1. **Label** — "Color de portada".
2. **Grilla de muestras** — 16 botones circulares rellenos con `bg.cover.{id}`, en el orden
   canónico de la fundación.
3. **Marca de selección** — ✓ en `text.primary` dentro de la muestra elegida, más el anillo de
   selección.
4. **Nombre del color elegido** — texto visible bajo la grilla ("Lavanda"), para no depender solo
   del color.
5. **Ayuda** — opcional ("Es el fondo del encabezado de tu evento. Podés cambiarlo después.").

## Variants

| Variant | Uso |
|---|---|
| default | Único. El valor viaja con el submit del formulario o del diálogo; el componente no guarda por su cuenta |

## Sizes

| Viewport | Muestra | Área táctil | Columnas |
|---|---|---|---|
| desktop | 32px | 32px | 8 (8 × 2) |
| mobile | 40px | 44px | 4 (4 × 4) |

## States

| State | Comportamiento |
|---|---|
| default | Muestras con borde `border.default`; la del valor actual seleccionada |
| hover | Escala 1,08 con `transition.fast`; solo puntero fino |
| selected | ✓ en `text.primary` + anillo 2px `bg.action.primary` con 2px de offset (8,15:1 sobre `bg.surface`) |
| focus | `focus.ring` + `border.focus` sobre la muestra enfocada (`border.focus` 4,73:1 sobre `bg.surface`) |
| disabled | Opacidad 0,4, `cursor: not-allowed`; mientras se envía el formulario o se guarda el diálogo |

No tiene estado de error propio: el valor siempre es válido porque la paleta es cerrada. Si la API
rechaza el guardado, el error lo muestra el contenedor ("Error de guardado" de O-18, "Error del
formulario" de S-03).

## Spacing & sizing rules

- Gap entre muestras: `space.sm`. Label → grilla y grilla → nombre: `space.sm`.
- Grilla sin scroll horizontal: 8 columnas en desktop (≈ 312px), 4 en mobile.
- Se apoya siempre sobre `bg.surface` (formulario de S-03, cuerpo de O-18). Tokens:
  [`tokens/component.md` → ColorSwatchPicker](../tokens/component.md).

## Accesibilidad

- `role="radiogroup"` con `aria-labelledby` al label; cada muestra `role="radio"` con
  `aria-checked`.
- **Nombre accesible = nombre del color en el idioma activo** (`Lavanda` / `Lavender`), nunca el hex
  ni el identificador.
- Teclado: Tab entra en la muestra seleccionada (roving tabindex); las flechas mueven el foco **y
  eligen** (como un grupo de radios nativo): izquierda/derecha de a una muestra y arriba/abajo de a
  una fila (8 columnas desde 768px, 4 en mobile). **No dan la vuelta en los bordes**: si no hay
  muestra en esa dirección, no pasa nada. Espacio y Enter eligen la muestra enfocada.
- La selección no depende solo del color: ✓, anillo y nombre visible.
- Contraste no textual: anillo de selección y de foco ≥ 3:1 sobre `bg.surface`. Las muestras contra
  `bg.surface` quedan en ~1,4:1; su borde `border.default` las delimita y la selección no depende
  de distinguirlas por luminancia.

## Guidelines de contenido

- Label: "Color de portada" / "Cover color".
- Nombres de color: los de la fundación, en `es` y `en` (catálogos de i18n, ADR-010).
- Ayuda: una línea que diga **dónde se ve** el color y que se puede cambiar.

## Do's & don'ts

**Do:** preseleccionar siempre un valor (el default `lavender` al crear; el actual al editar).

**Don't:** agregar un "color personalizado" ni un input de hex. Enviar el hex a la API: el valor es
el **identificador**.

## API

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| value | `CoverColorId` | — | Identificador seleccionado (siempre definido) |
| onChange | `(id: CoverColorId) => void` | — | Cambio de selección |
| label | string | — | Texto del label |
| help | string | — | Ayuda opcional |
| disabled | boolean | `false` | Deshabilita todo |
| names | `Record<CoverColorId, string>` | — | Nombre de cada color en el idioma activo: es el nombre accesible de cada muestra y el texto visible del elegido. Los componentes del kit no traducen, así que lo recibe por props |
| selectedRef | `React.Ref<HTMLButtonElement>` | — | Apunta a la muestra elegida; un diálogo lo usa como foco inicial |

`CoverColorId` = `'lavender' | 'periwinkle' | 'sky' | 'ice' | 'aqua' | 'mint' | 'pistachio' |
'lemon' | 'butter' | 'peach' | 'coral' | 'rose' | 'pink' | 'lilac' | 'sand' | 'mist'`, en ese
orden, que es el mismo del enum de la API.

## Componentes y patterns relacionados

[text-field](./text-field.md) · [number-stepper](./number-stepper.md) (convive en S-03 y O-18) ·
[dialog](./dialog.md) (contenedor en O-18)

## Historial

- 2026-11-06 v2.1.0 — Creado para REQ-004 (color de portada en S-03 y O-18).
- 2026-11-06 v2.1.1 — API: se documentan `names` (nombres por idioma) y `selectedRef` (foco inicial en diálogos), y se aclara que las flechas mueven el foco y eligen, sin dar la vuelta en los bordes (S-021).
