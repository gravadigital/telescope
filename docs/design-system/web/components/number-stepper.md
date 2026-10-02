---
component: number-stepper
version: 2.0.0
status: active
last_updated: 2026-10-02
related: [text-field, dialog]
---

# NumberStepper

## Propósito

Elige un entero dentro de un rango con − / +, mostrando el recomendado y el máximo.

**Cuándo usar:** cupo (S-03, O-18), propuestas por evaluador y ajustes avanzados (O-16).

**Cuándo NO usar:** rangos amplios donde escribir es más rápido (>100 pasos) → [text-field](./text-field.md) numérico.

## Anatomía

1. **Label.**
2. **Botón −** — `Button variant="icon"`.
3. **Valor** — editable por teclado.
4. **Botón +.**
5. **Ayuda** — "Recomendado: 3 · máximo 3" / "Entre 1 y 100".

## Variants

| Variant | Uso |
|---|---|
| default | Entero |
| with-unit | Con unidad ("3 posiciones") |

## Sizes

md: 44px de alto; botones de 44×44px (táctil).

## States

| State | Comportamiento |
|---|---|
| default | Ambos botones activos |
| at-min / at-max | El botón correspondiente se deshabilita (AC 36: no permite superar el máximo) |
| error | Valor tipeado fuera de rango: `border.error` + mensaje |
| disabled | Todo deshabilitado |

## Spacing & sizing rules

Valor de ancho fijo (3 dígitos) · gap `space.sm`.

## Accesibilidad

Valor como `<input type="number">` con `role="spinbutton"`, `aria-valuemin/max/now`; flechas ↑ ↓ cambian el valor; botones con `aria-label` traducido ("Disminuir", "Aumentar") y `aria-controls` al input.

## Guidelines de contenido

La ayuda dice el recomendado y el límite; los límites vienen del backend cuando existen (`GET /voting-config/preview`, DA-5).

## Do's & don'ts

**Do:** iniciar en el recomendado.

**Don't:** calcular en el front límites que define el backend.

## API

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| value | number | — | Valor |
| min / max | number | — | Límites |
| step | number | 1 | Paso |
| recommended | number | — | Recomendado (en la ayuda) |
| unit | string | — | Unidad |
| label / help / error | string | — | Textos |
| onChange | function | — | Cambio |

## Componentes y patterns relacionados

[text-field](./text-field.md) · [dialog](./dialog.md)

## Historial

- 2026-10-02 v2.0.0 — Creado para REQ-003 (2d, cupo).
