---
component: data-table
version: 2.0.0
status: active
last_updated: 2026-10-02
related: [status-pill, progress-bar, empty-state, callout]
---

# DataTable

## Propósito

Lista de registros con columnas, estados por celda y **una sola acción por fila**. En mobile se
apila: cada fila es un bloque con la etiqueta de cada valor (AC 3).

**Cuándo usar:** eventos (S-02, S-11), participantes de la gestión (S-05), participantes públicos (O-08), ranking completo (S-04).

**Cuándo NO usar:** 1–3 elementos con mucho texto → [card](./card.md); listas de notificaciones → NotificationItem (dominio).

## Anatomía

1. **Container** — `bg.surface`, `border.default`, `radius.surface`.
2. **Cabecera** — `text.eyebrow` en mono ("EVENTO", "ETAPA").
3. **Fila** — divisor `border.default`; alterna opcional `bg.surface.subtle`.
4. **Celda** — texto, [status-pill](./status-pill.md), [progress-bar](./progress-bar.md) o acción.
5. **Acción de fila** — [button](./button.md) sm, última columna.
6. **Fila apilada (mobile)** — etiqueta + valor por celda, acción a ancho completo al final.

## Variants

| Variant | Uso |
|---|---|
| default | Tablas de datos |
| highlighted-row | Fila resaltada ("Vos" en el ranking): `bg.unread` |

## Sizes

Fila de 56px (desktop) con padding `space.md`; en mobile el bloque apilado tiene padding `space.padding.compact`.

## States

| State | Comportamiento |
|---|---|
| default | Filas |
| loading | Skeleton de N filas (el contenedor no colapsa) |
| empty | Se reemplaza por [empty-state](./empty-state.md) — lo decide la pantalla |
| error | Se reemplaza por [callout](./callout.md) error con "Reintentar"; **nunca** filas vacías ni inventadas (REQ-001) |
| row hover | `bg.surface.subtle` si la fila es navegable |

## Spacing & sizing rules

Columna de acción alineada a la derecha, ancho al contenido · texto largo en dos líneas máximo con elipsis y título completo accesible · sin scroll horizontal en mobile (se apila).

## Accesibilidad

- `<table>` semántica con `<caption>` (puede ser visualmente oculto) y `<th scope="col">`.
- En mobile se mantiene la semántica de tabla con CSS (`display:block` + `data-label` visible), no se reemplaza por divs.
- La acción de fila tiene nombre único ("Gestionar Evento 1").

## Guidelines de contenido

Cabeceras de 1–2 palabras · fechas con el formato del dominio (`src/domain/dates`) · "—" para vacío, nunca "Not specified" ni datos inventados.

## Do's & don'ts

**Do:** una acción por fila resuelta por rol y etapa · etiqueta visible en cada valor apilado.

**Don't:** varias acciones por fila · ocultar columnas en mobile (apilar, no ocultar) · paginar en el cliente lo que el servidor ya pagina.

## API

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| columns | `{key, header, render?, align?}[]` | — | Columnas |
| rows | `T[]` | — | Datos |
| rowKey | `(row) => string` | — | Clave |
| rowAction | `(row) => {label, onClick, variant}` | — | Acción única |
| highlightRow | `(row) => boolean` | — | Fila resaltada |
| caption | string | — | Caption accesible |
| loading | boolean | false | Skeleton |

## Componentes y patterns relacionados

[status-pill](./status-pill.md) · [progress-bar](./progress-bar.md) · [empty-state](./empty-state.md) · [callout](./callout.md)

## Historial

- 2026-10-02 v2.0.0 — Creado para REQ-003. Unifica la tabla de `Events` y la de participantes de `ManageEventPage`.
