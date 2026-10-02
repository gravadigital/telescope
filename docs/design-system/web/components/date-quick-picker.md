---
component: date-quick-picker
version: 2.0.0
status: active
last_updated: 2026-10-02
related: [dialog, text-field]
---

# DateQuickPicker

## Propósito

Elige una fecha de cierre con atajos de duración y, si hace falta, un calendario.

**Cuándo usar:** abrir inscripción (O-15), abrir votación (O-16), posponer el cierre (O-07).

**Cuándo NO usar:** fechas sin relación con "hoy" o con un cierre actual; rangos.

## Anatomía

1. **Label** — "¿Hasta cuándo se pueden inscribir? *".
2. **Valor** — fecha en lenguaje natural ("jueves 1 de octubre de 2026"), según idioma.
3. **Botón "Cambiar"** — abre el calendario nativo (`<input type="date">`).
4. **Atajos** — chips "3 días · 1 semana · 2 semanas" (o "+3 días…" relativos al cierre actual).
5. **Ayuda / error.**

## Variants

| Variant | Base de los atajos | Uso |
|---|---|---|
| from-today | hoy | O-15, O-16 |
| postpone | cierre actual; el mínimo es cierre actual + 1 día | O-07 |

## Sizes

Un tamaño; chips de 36px.

## States

| State | Comportamiento |
|---|---|
| default | Atajo inicial seleccionado (1 semana) |
| custom | Fecha elegida en el calendario; ningún atajo seleccionado |
| error | `border.error` + mensaje ("El cierre solo se puede posponer…") |
| disabled | Diálogo busy |

## Spacing & sizing rules

Valor y "Cambiar" en una fila; atajos debajo con gap `space.sm`.

## Accesibilidad

Atajos como grupo de radio (`role="radiogroup"`) con flechas; el valor elegido se anuncia en región live; el calendario es el nativo (accesible por defecto).

## Guidelines de contenido

La fecha se muestra como fin del día, **sin hora** (L-10) · formato con `Intl.DateTimeFormat` del idioma activo.

## Do's & don'ts

**Do:** validar en el cliente las mismas reglas que el backend (posterior a hoy; solo posponer).

**Don't:** mostrar "23:59" (el modelo guarda fecha) · permitir fechas pasadas.

## API

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| variant | `fromToday \| postpone` | `fromToday` | Base |
| value | string (ISO date) | — | Fecha |
| min | string (ISO date) | — | Mínimo |
| presets | number[] (días) | `[3, 7, 14]` | Atajos |
| label / help / error | string | — | Textos |
| onChange | function | — | Cambio |

## Componentes y patterns relacionados

[dialog](./dialog.md) · [text-field](./text-field.md)

## Historial

- 2026-10-02 v2.0.0 — Creado para REQ-003 (2b, 2d, editar cierre).
