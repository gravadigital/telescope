---
component: dialog
version: 2.0.0
status: active
last_updated: 2026-10-02
related: [button, text-field, date-quick-picker, number-stepper, data-table]
---

# Dialog

> **Reemplaza a `modal` (v1.0).** Es el único overlay modal del producto: reemplaza a `Modal`,
> `stage-modal-*` y `share-menu` (DA-8).

## Propósito

Pide una decisión o un dato acotado sin salir de la pantalla.

**Cuándo usar:** transiciones de etapa (O-15, O-16, O-17), editar cierre o datos, confirmar un recordatorio o una pausa, compartir, ver participantes.

**Cuándo NO usar:** flujos de más de un paso o largos → página (por eso auth pasó a páginas); avisos que no piden decisión → [callout](./callout.md) o toast; menús → [menu](./menu.md).

## Anatomía

1. **Backdrop** — `bg.backdrop`; click afuera cierra (salvo `alertdialog`).
2. **Container** — `bg.surface`, `radius.surface`, `shadow.dialog`.
3. **Eyebrow (opcional)** — transición de etapa en `text.eyebrow` ("CREACIÓN → PARTICIPACIÓN").
4. **Título** — h2, describe la acción.
5. **Botón cerrar** — `Button variant="icon"` "×".
6. **Body** — contenido.
7. **Acciones** — secondary + primary.

## Variants

| Variant | Propósito | Ejemplo |
|---|---|---|
| default | Formulario o contenido | Abrir inscripción, Editar datos |
| alert | Decisión irreversible; `role="alertdialog"`, sin cierre por click afuera | Publicar resultados |

## Sizes

| Size | Ancho desktop | Uso |
|---|---|---|
| sm | 480px | Confirmaciones, fecha |
| md | 560px | Formularios, abrir votación, participantes |

**Mobile:** pantalla completa, acciones fijas abajo.

## States

| State | Descripción |
|---|---|
| open / closed | Entrada con opacidad + desplazamiento corto (`motion`), solo opacidad con `prefers-reduced-motion` |
| busy | Acción en curso: acciones deshabilitadas, no se cierra con Escape |
| error | [callout](./callout.md) de error dentro del body; los datos se conservan |

## Spacing & sizing rules

Padding `space.padding.spacious` (desktop) / `space.padding.compact` (mobile) · gap entre secciones `space.stack.md` · alto máximo 90vh con scroll en el body, cabecera y acciones fijas.

## Accesibilidad

- **ARIA:** `role="dialog"` (o `alertdialog`), `aria-modal="true"`, `aria-labelledby` = título, `aria-describedby` cuando hay explicación.
- **Teclado:** Escape cierra (salvo busy); Tab circula dentro.
- **Foco:** atrapado; foco inicial en el primer control (o en la opción segura en `alert`); al cerrar vuelve al disparador.
- **Screen reader:** el resto de la página queda `inert`.

## Guidelines de contenido

Título = la acción ("Abrir inscripción"), no "Advance to…" · el botón primario repite el verbo · las consecuencias irreversibles se dicen en el body, antes de los botones.

## Do's & don'ts

**Do:** un diálogo por decisión · decir qué no se puede deshacer · conservar lo cargado ante un error.

**Don't:** diálogos encadenados · usar un diálogo para un aviso informativo · cerrar con click afuera un `alert`.

## API

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| open | boolean | — | Visible |
| onClose | function | — | Cierre (×, Escape, backdrop) |
| variant | `default \| alert` | `default` | Rol |
| size | `sm \| md` | `sm` | Ancho desktop |
| eyebrow | string | — | Transición |
| title | string | — | Título |
| busy | boolean | false | Acción en curso |
| actions | ReactNode | — | Botones |

**Slots:** children = body. **Eventos:** `onClose`.

## Componentes y patterns relacionados

[button](./button.md) · [callout](./callout.md) · [date-quick-picker](./date-quick-picker.md) · [number-stepper](./number-stepper.md)

## Historial

- 2026-09-18 v1.0.0 — Relevado como `modal` desde `Modal.tsx` (sin `role`, foco ni Escape).
- 2026-10-02 v2.0.0 — **Breaking.** Renombrado a `dialog` y especificado para REQ-003: accesibilidad completa, eyebrow de transición, variant `alert`, pantalla completa en mobile.
