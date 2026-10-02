---
component: stat-tile
version: 2.0.0
status: active
last_updated: 2026-10-02
related: [progress-bar, card]
---

# StatTile

## Propósito

Muestra una métrica clave como número grande con su etiqueta ("Inscriptos 4 / 20").

**Cuándo usar:** métricas de la gestión (inscriptos, archivos recibidos, rankings enviados, días al cierre), resumen del reparto en Abrir votación, resumen de resultados.

**Cuándo NO usar:** listas de datos → [data-table](./data-table.md); más de 4 métricas juntas (no se distingue la importante).

## Anatomía

1. **Container** — [card](./card.md) default, padding `space.padding.default`.
2. **Etiqueta** — `text.eyebrow` o `text.caption`.
3. **Valor** — `text.metric`.
4. **Total / unidad (opcional)** — "/ 20", "días", en `text.secondary`.
5. **Barra (opcional)** — [progress-bar](./progress-bar.md) md.

## Variants

| Variant | Uso |
|---|---|
| default | Métrica |
| compact | Resumen dentro de un diálogo (valor `font.size.2xl`) |

## Sizes

default: valor 28px · compact: valor 20px.

## States

default · loading (valor en skeleton) · error (el bloque padre muestra el [callout](./callout.md); el tile no inventa un 0).

## Spacing & sizing rules

Mínimo 140px de ancho en desktop. En mobile se acomodan de a 2 por fila (y en `compact` se permite 3, con texto corto). Gap etiqueta–valor `space.xs`.

## Accesibilidad

Etiqueta y valor en un mismo elemento de lectura ("Inscriptos: 4 de 20"); el formato visual "4 / 20" va con texto accesible completo.

## Guidelines de contenido

Etiqueta de 1–3 palabras · valores formateados según idioma (`Intl.NumberFormat`).

## Do's & don'ts

**Do:** mostrar el total cuando existe.

**Don't:** mostrar "0" mientras carga o si falló la carga (REQ-001).

## API

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| label | string | — | Etiqueta |
| value | number \| string | — | Valor |
| total | number | — | Total opcional |
| unit | string | — | Unidad |
| progress | boolean | false | Muestra barra (requiere total) |
| variant | `default \| compact` | `default` | Variant |
| loading | boolean | false | Skeleton |

## Componentes y patterns relacionados

[progress-bar](./progress-bar.md) · [card](./card.md)

## Historial

- 2026-10-02 v2.0.0 — Creado para REQ-003 (2a, 2c, 2e, 2d).
