# ADR-007: CSS plano con variables, sin framework ni librería de componentes

**Estado:** Aceptado (implementado) · **Enmendado** por REQ-003 (2026-10-02, ver [Enmienda](#enmienda-req-003))
**Fecha:** 2026-09-18 (documentado retroactivamente)
**Detectado desde:** `web`
**Tags:** frontend, estilos, design-system

---

## Contexto

El producto tiene un lenguaje visual propio y específico: fondo oscuro con degradado fijo,
superficies translúcidas con borde claro (glassmorphism). No es un estilo que una librería de
componentes traiga por defecto.

## Decisión

**Un archivo `.css` por componente**, importado desde su `.tsx`. Los tokens de diseño son
variables CSS en `:root`.

Sin Tailwind, sin CSS-in-JS, sin CSS Modules, sin librería de componentes: **todo lo visual está
construido a mano.**

**Implementado en:**
- `web` — `src/styles/global.css` (79 variables) y `src/index.css` (57); un `.css` por
  componente junto a su `.tsx`

## Consecuencias

### Positivas

- **Control total sobre el lenguaje visual.** El glassmorphism está implementado exactamente como
  se quiso, sin pelear contra los defaults de una librería.
- **Sin dependencias de UI que mantener ni actualizar**, y sin el riesgo de que una major version
  de una librería de componentes rompa la apariencia.
- **Bundle sin CSS muerto de una librería**: solo entra lo que se escribió.
- **La adopción de tokens es mayoritaria**: 753 usos de `var(--…)` en el proyecto.

### Negativas

- **Fuente de verdad duplicada.** Las 57 variables de `index.css` están **repetidas en
  `global.css`** con los mismos valores, y `index.css` importa `global.css`. Hoy no produce
  diferencias visibles, pero son dos lugares donde cambiar un token.
- **Un tercio de los colores está hardcodeado**: 350 hex literales contra 753 usos de token.
  Varios de esos grises y pasteles (`#fca5a5`, `#e2e8f0`, `#94a3b8`, `#86efac`) **no tienen token
  equivalente**: son una segunda paleta implícita. `#3b82f6` aparece 9 veces a mano pese a existir
  como `--color-secondary`.
- **Patrones repetidos sin factorizar.** La tarjeta glass (`--glass-bg` + `--glass-border` +
  `--radius-lg`) se repite en casi todos los archivos CSS; los chips de estado de etapa y los
  botones son sistemas de clases, no componentes. Cambiar el aspecto de un botón es tocar CSS
  disperso.
- **CSS muerto acumulado.** Hay bloques completos de reglas responsive apuntando a clases que el
  JSX ya no usa (el layout anterior de `EventDetailPage`, `.stage-flow` en `ManageEventPage`), y
  clases referenciadas desde el JSX que no están definidas en ningún archivo (`UsernameModal`,
  `ForgotPasswordForm`) y se renderizan sin estilos.
- **Tema claro a medias.** Solo `Auth.css` y `Modal.css` responden a `prefers-color-scheme: light`;
  el resto de la aplicación queda oscura.
- **Los breakpoints no existen como escala.** No hay variables ni configuración: cada `@media`
  repite el número literal. Los cuatro valores (1024, 768, 600, 480) salen de contar queries.

## Alternativas Consideradas

**No hay registro del rationale original.** Alternativas objetivas:

- **Tailwind** — Habría dado una escala de espaciado y color impuesta y purga automática, a costa
  de que un lenguaje visual muy propio se expresa peor en utilidades. Configurable, pero con
  fricción.
- **CSS Modules** — Mismo CSS plano con scoping automático de clases. **Habría evitado la clase de
  bug de "clase referenciada pero no definida"** sin cambiar nada del enfoque. Es la alternativa
  más cercana y de menor costo.
- **Librería de componentes** (MUI, Chakra, shadcn) — Habría traído accesibilidad resuelta en los
  overlays, que hoy es una de las deficiencias más grandes del frontend (ningún modal tiene
  `role="dialog"`, gestión de foco ni cierre por Escape).

## Relación con el Design System

El Design System sembrado en `docs/design-system/web/` toma sus fundaciones de estos
tokens reales. La consolidación de esa deuda —unificar la fuente de verdad, dar token a la paleta
implícita, factorizar los patrones repetidos— es trabajo del Design System, no de este ADR.

## Referencias

- Tokens: `web/src/styles/global.css`, `web/src/index.css`
- Relevamiento completo: `docs/analysis/ux/web/index.md`
- Design System: `docs/design-system/web/`

## Enmienda (REQ-003)

**Fecha:** 2026-10-02 · **Stories:** S-010 (y todas las de pantalla, S-011 a S-018)

El rediseño de REQ-003 **mantiene la técnica** (CSS plano por componente, tokens en `:root`, sin
librería de componentes) y corrige la deuda listada arriba:

- **Una sola fuente de tokens:** `web/src/styles/tokens.css`, con los tokens del DS `web` v2.0.0.
  Se elimina la copia de `index.css`. Las variables viejas quedan en un bloque *legacy* de
  `global.css` hasta que se reemplace la última pantalla (S-016 / S-017) y entonces se borran.
- **Sin hex literales** en los componentes nuevos.
- **Lenguaje visual nuevo:** de glassmorphism oscuro a "bandas oscuras + contenido claro" (paleta
  `#4B3FA8` / `#6E5BF2`, acento `#35D6F2`). Cambio breaking del DS → `web` v2.0.0.
- **Breakpoints como escala nombrada** (`--bp-mobile: 768px` documentado; en `@media` se usa el
  literal) y **mobile-first** en los componentes nuevos.
- **Componentes en vez de sistemas de clases:** `web/src/components/ui/` con los primitivos del DS
  (`Button`, `TextField`, `Dialog`, `DataTable`, …) y compuestos de dominio en
  `web/src/components/{dominio}/`. `Dialog` reemplaza las tres implementaciones de overlay con
  `role="dialog"`, foco atrapado y Escape (resuelve la deuda de accesibilidad de los overlays).
- **Prefijo de clase por componente** para evitar colisiones.

*Alternativa considerada:* CSS Modules (la que este ADR señala como mejor). Se descarta **en este
REQ** para no cambiar la técnica a la vez que el lenguaje visual y todas las pantallas; sigue
siendo la evolución natural.

