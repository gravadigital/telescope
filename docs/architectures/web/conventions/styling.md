---
id: styling
display_name: Estilado (CSS plano + tokens del DS)
language: react
description: Plain CSS file per component, Design System web v2.0.0 tokens as CSS custom properties in tokens.css, mobile-first with a single 768px breakpoint
applies_to: [frontend]
required_by: []
package: null
---

# Estilado

CSS plano, un archivo por componente, importado desde el `.tsx`. **Sin Tailwind, sin
CSS-in-JS, sin CSS Modules, sin librería de componentes.**

```tsx
import './SortableRankList.css';
```

Los nombres de clase son globales: no hay scoping automático. Se evitan colisiones
prefijando con el nombre del componente (`ui-`, `ev-`, `vt-`, `srl-`, `edp-`…; el test
`components/ui/__tests__/static-rules.test.ts` exige un prefijo conocido).

## Tokens

Los tokens del Design System `web` v2.0.0 viven **solo** en `src/styles/tokens.css` (lo
importa `src/index.tsx`). No hay otra fuente: `index.css` solo tiene el reset y el `body`, y
ningún otro CSS define variables (lo verifica `src/styles/tokens.test.ts`, que también falla
si algún `var(--x)` no tiene definición).

- Dos niveles: **referencia** (`--ref-*`, nunca se consumen desde componentes) y
  **semánticos / de componente** (`--bg-*`, `--text-*`, `--border-*`, `--radius-*`,
  `--space-*`, `--type-*`, `--shadow-*`, `--button-*`…), que son los que se usan.
- Sin hex ni `rgb()` en código nuevo: el test de reglas estáticas lo comprueba.
- Si el valor que necesitás no existe como token, se agrega al DS (`product-design-system-update`)
  y a `tokens.css`; no se escribe el hex en el componente.

## Responsive: mobile-first

La regla base es **mobile**; `@media (min-width: 768px)` pasa a desktop. **Único corte**
(`--bp-mobile` / `--ref-bp-desktop`). No se usa `max-width` en componentes nuevos ni se
agregan otros breakpoints. Áreas táctiles ≥ 44×44 px en mobile, sin scroll horizontal a 375 px.

## Movimiento

`--ref-motion-*` no se consumen directo. Preferir no animar o respetar
`prefers-reduced-motion: reduce`.

## Botones y avisos

Son componentes del DS: `components/ui/button/Button.tsx` y `components/ui/callout/Callout.tsx`
(no hay clases globales `.btn`/`.alert`). Ver `docs/reusable-code/web/components.md`.
