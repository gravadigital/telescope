---
foundation: elevation
version: 2.0.0
last_updated: 2026-10-02
status: diseñada
---

# Elevation

> **v2.0.0 — sombras del rediseño (REQ-003).** Valores contados sobre
> `documentation/Telescopio Rediseño Vistas.html`. `[fuente: diseño REQ-003]`

## Propósito

Jerarquía de capas. El rediseño usa **poca sombra**: las superficies se separan del canvas por
borde (`border.default`) y color, no por elevación. La sombra se reserva para lo que flota.

## Niveles

| Token | z-index | Sombra | Uso |
|---|---|---|---|
| `elevation.0` | 0 | none | Superficies en el flujo (tarjetas, tablas): borde, sin sombra |
| `elevation.1` | 10 | `0 10px 30px rgba(11,16,32,.08)` | Superficie destacada en el flujo ("Tu próximo paso") |
| `elevation.2` | 30 | `0 20px 60px rgba(11,16,32,.18)` | Popovers y menús (panel de notificaciones, menú de usuario) |
| `elevation.3` | 40 | `0 30px 80px rgba(0,0,0,.35)` | Diálogos sobre backdrop |
| `elevation.4` | 50 | `0 24px 60px rgba(11,16,32,.28)` | Toasts |

| Token | Valor | Uso |
|---|---|---|
| `focus.ring` | `0 0 0 4px #EAE7F9` (`color.violet.100`) | Anillo de foco de inputs y botones, más `border.focus` |
| `backdrop` | `rgba(11,16,32,.55)` | Fondo detrás de un diálogo |

> El diseño muestra los diálogos sobre un fondo oscurecido, pero no declara su valor exacto. Se toma
> `color.ink.900` al 55%. Si el equipo de diseño define otro, se ajusta con un PATCH.

## Guidelines

**Do:**
- Separar superficies con borde de 1px, no con sombra.
- Usar `elevation.1` una sola vez por pantalla, en el paso destacado.

**Don't:**
- No apilar sombras: una superficie tiene un solo nivel.
- No poner sombra a tablas ni filas.

## Accesibilidad

- El anillo de foco nunca se quita: `focus.ring` + `border.focus` en todo control interactivo.
- `prefers-reduced-motion`: las transiciones de entrada de popovers y diálogos se reducen a opacidad.

## Historial

- 2026-09-18 v0.1.0 — Placeholder inicial.
- 2026-10-02 v2.0.0 — Niveles del rediseño de REQ-003, anillo de foco y backdrop.
