---
component: glass-card
version: 1.0.0
last_updated: 2026-09-18
status: relevado-desde-código
---

# Glass Card (superficie base)

> **Relevado desde el código existente.** `[fuente: código-existente]`

## Qué es

⚠️ **No existe como componente ni como clase única.** Es un **patrón visual repetido a mano** en
casi todos los archivos CSS del producto:

```css
background: var(--glass-bg);
border: 1px solid var(--glass-border);
border-radius: var(--radius-lg);
```

Se documenta porque **es la superficie base de toda la aplicación**: tarjetas de evento, paneles,
modales, fichas y contenedores de formulario son todos esta misma combinación, escrita una y otra
vez.

## Anatomía

| Propiedad | Token |
|---|---|
| Fondo | `bg.glass` — `rgba(255,255,255,0.05)` |
| Borde | `border.glass` — `rgba(255,255,255,0.1)` |
| Radio | `radius.lg` — 12px |
| Hover | `bg.glass.hover` / `border.glass.hover` |

Sobre el degradado fijo del `body`, produce el efecto de vidrio esmerilado que define el lenguaje
visual.

## Dónde aparece

**En prácticamente todas las pantallas**: tarjetas del listado (en mobile), ficha del evento,
paneles de configuración y resultados, contenedor del formulario de creación, tarjetas de
reset-password, superficie de los modales.

## Tokens que consume

`bg.glass`, `border.glass`, `radius.lg`, y en hover sus variantes.

## Accesibilidad

⚠️ **Es el punto de riesgo de contraste del producto.** Un fondo translúcido al **5% de opacidad**
sobre un degradado oscuro deja muy poco margen para el texto secundario — que además usa la paleta
de grises **sin tokens** documentada en `color.md` (deuda #2).

**Sin auditoría de contraste. Objetivo WCAG no definido.**

## Do / Don't

*Vacío a propósito.* El código no registra guías de uso. Se van a documentar cuando el patrón se
factorice.

## Deuda conocida

1. ⚠️ **Está duplicado en casi todos los archivos CSS.** Cambiar la superficie base del producto
   —por ejemplo, subir la opacidad para mejorar el contraste— exige hoy tocar decenas de archivos.
   **Factorizarlo a una clase única es la mejora de mayor relación valor/esfuerzo del DS.**
2. ⚠️ **Sin verificación de contraste**, siendo la superficie sobre la que se lee todo.

## Historial

- 2026-09-18 v1.0.0 — Relevado desde el código por `/product-consolidate-services`.
