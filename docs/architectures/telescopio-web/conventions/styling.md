---
id: styling
display_name: Estilado (CSS plano + variables)
language: react
description: Plain CSS file per component, design tokens as CSS custom properties, dark glassmorphism, desktop-first
applies_to: [frontend]
required_by: []
package: null
---

# Estilado

CSS plano, un archivo por componente, importado desde el `.tsx`. **Sin Tailwind, sin
CSS-in-JS, sin CSS Modules, sin librería de componentes.**

```tsx
import './RankingVotePanel.css';
```

Los nombres de clase son globales: no hay scoping automático. Se evitan colisiones por
convención de nombres, prefijando con el nombre del componente.

## Tokens

Variables CSS en `:root`. **Están definidas en dos archivos**:

| Archivo | Variables |
|---|---|
| `src/index.css:4-85` | 57 |
| `src/styles/global.css:9+` | 79 — incluye las mismas 57 con idénticos valores, más 22 propias |

`index.css` importa `global.css` en la línea 95. Las 57 compartidas tienen el mismo valor,
así que hoy no hay diferencia visible, pero **es una fuente de verdad duplicada**.

**Al agregar un token, ponelo solo en `styles/global.css`** — es el superconjunto. No
dupliques en `index.css`.

### Grupos disponibles

| Grupo | Ejemplos |
|---|---|
| Marca | `--color-primary` `#6a5acd`, `--color-primary-hover`, `--color-primary-dark`, `--color-primary-light` |
| Estado | `--color-success` `#22c55e`, `--color-warning` `#f59e0b`, `--color-danger` `#ef4444`, `--color-info` `#3b82f6` |
| Grises | `--color-gray-50` … `--color-gray-900` |
| Fondo | `--bg-dark-primary` `#1a1a3a`, `--bg-dark-secondary` `#2d2d5a`, `--bg-dark-tertiary` `#4a4a8a` |
| Glass | `--glass-bg`, `--glass-bg-hover`, `--glass-border`, `--glass-border-hover` |
| Espaciado | `--spacing-xs` `0.25rem` … `--spacing-3xl` |
| Radio | `--radius-sm` `4px` … `--radius-full` `9999px` |
| Sombra | `--shadow-sm` … `--shadow-2xl`, `--shadow-button` |
| Texto | `--text-xs` … `--text-3xl` (solo en `global.css`) |
| Transición | `--transition-fast` `150ms ease`, `base` `200ms`, `slow` `300ms` |
| Z-index | `--z-dropdown`, `--z-fixed`, `--z-modal` (solo en `global.css`) |

### Usá los tokens

Hoy hay **350 colores hex literales contra 753 usos de `var()`**: cerca de un tercio está
hardcodeado. Peor, algunos valores frecuentes (`#e2e8f0`, `#94a3b8`, `#cbd5e1`, `#fca5a5`,
`#86efac`) **no tienen token equivalente**: son una segunda paleta implícita para textos
secundarios y estados suaves.

En código nuevo: usá el token. Si el color que necesitás no existe como token, **agregalo a
`global.css`** en vez de escribir el hex. `#3b82f6` aparece 9 veces a mano existiendo como
`--color-secondary`.

## Lenguaje visual

Tema oscuro con glassmorphism. El `body` lleva un degradado fijo entre los tres fondos
(`index.css:100-107`), y las superficies son translúcidas:

```css
.panel {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(10px);
}
```

Ese patrón de tarjeta se repite en casi todos los CSS **sin estar factorizado**. Es el
primer candidato del Design System.

## Responsive: desktop-first

**Todas las media queries son `max-width`**: la regla base describe el desktop y los
`@media` van restando ancho.

| Corte | Queries | Rol |
|---|---|---|
| `1024px` | 2 | Ajuste puntual |
| **`768px`** | **13** | **El switch de layout real** |
| `600px` | 3 | Ajuste puntual |
| `480px` | 6 | Ajuste puntual (padding, tipografía) |

**No están declarados como escala.** No hay variables de breakpoint: cada `@media` repite
el número. Al escribir uno nuevo, usá uno de esos cuatro valores; no introduzcas un quinto.

Los viewports reales son dos: **desktop** (base) y **mobile** (≤768px).

## Tema claro: incompleto

Solo `components/auth/Auth.css:290` y `components/modal/Modal.css:113` responden a
`prefers-color-scheme: light`. El resto de la aplicación queda oscura siempre. **No agregues
soporte parcial de tema claro a un componente suelto**: o se resuelve globalmente o se deja
como está.

## Botones

No existen como componente React: son clases en `styles/global.css` (`.btn`, `.btn-primary`,
`.btn-secondary`, …). Al necesitar un botón, usá las clases existentes antes de escribir CSS
nuevo.
