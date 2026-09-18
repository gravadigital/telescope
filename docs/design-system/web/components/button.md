---
component: button
version: 1.0.0
last_updated: 2026-09-18
status: relevado-desde-código
---

# Button

> **Relevado desde el código existente.** `[fuente: código-existente — web/src/styles/global.css]`

## Qué es

⚠️ **No existe como componente React.** Es un **sistema de clases CSS** (`.btn`, `.btn-primary`,
etc.) definido en `styles/global.css` y aplicado a `<button>` nativos.

Se documenta acá porque es el elemento interactivo más usado del producto y porque **convertirlo en
componente es una de las decisiones pendientes de mayor impacto**.

## Variantes observadas

| Clase | Uso |
|---|---|
| `.btn` | Base |
| `.btn-primary` | Acción principal (violeta de marca) |
| Secundaria | `Cancel`, `Refresh`, `Back` |
| Peligro | ❌ **No existe.** No hay ninguna acción destructiva con tratamiento visual propio |

`LinkButton` (`components/link-button/LinkButton.tsx`) es un botón con apariencia de link. **Un solo
uso**, en `Auth`.

## Estados observados

| Estado | Presente | Detalle |
|---|---|---|
| Reposo | ✅ | |
| Hover | ✅ | Vía `--color-primary-hover` y `--shadow-button-hover` |
| Deshabilitado | ✅ | Ampliamente usado |
| Cargando | ✅ | **Por cambio de label**, no por spinner estandarizado: `Creating…`, `Updating...`, `Uploading...`, `Registering...` |
| Foco | ⚠️ **Sin verificar** | No se relevó un estilo de `:focus-visible` explícito |

## Patrón de carga

El producto resuelve el estado de carga **cambiando el texto del botón**:

| Reposo | Cargando |
|---|---|
| `Create Event` | `Creating…` |
| `Update Deadline` | `Updating...` |
| `Upload File` | `Uploading...` |
| `Participate` | `Registering...` |

✅ Es **correcto para accesibilidad**: el cambio de texto se anuncia. ⚠️ Pero es inconsistente en el
detalle: `Creating…` usa elipsis tipográfica y el resto usa tres puntos.

## Tokens que consume

- `color.brand.primary` / `.hover` / `.dark`
- `shadow.button` / `.hover`
- `radius.md`
- `motion.base`

## Accesibilidad

- ✅ Todos son `<button>` nativos: alcanzables y operables por teclado.
- ✅ El cambio de label durante la carga es la solución correcta.
- ⚠️ Varios botones tienen **solo un emoji como contenido accesible**: el `✏️` de editar deadline y
  el `×` de quitar archivo tienen `title` pero **no `aria-label`**. El `×` se lee como símbolo de
  multiplicación.
- ⚠️ Sin `:focus-visible` verificado.

## Do / Don't

*Vacío a propósito.* El código no registra guías de uso. Se van a documentar cuando el componente
se cree como tal.

## Deuda conocida

1. ⚠️ **No es un componente.** Es CSS disperso: cambiar la apariencia de los botones exige tocar
   múltiples archivos. **Es el candidato número uno a componentizar.**
2. ⚠️ **Botones de solo emoji sin `aria-label`.**
3. ⚠️ **No hay variante destructiva**, pese a que existen acciones destructivas (cancelar evento —
   que además no tiene control en la interfaz).
4. ⚠️ **Inconsistencia de elipsis** entre los labels de carga.

## Historial

- 2026-09-18 v1.0.0 — Relevado desde el código por `/product-consolidate-services`.
