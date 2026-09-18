---
component: modal
version: 1.0.0
last_updated: 2026-09-18
status: relevado-desde-código
---

# Modal

> **Relevado desde el código existente**, no diseñado. `[fuente: código-existente — web/src/components/modal/Modal.tsx]`
> Las secciones que el código no puede responder están explícitamente vacías.

## Qué es

El contenedor de overlay genérico del producto. **4 usos directos**, y es la base sobre la que se
montan varios de los overlays específicos.

## Variantes observadas

Una sola: overlay centrado con backdrop. No hay variantes de tamaño ni de posición en el código.

## Anatomía

| Parte | Presente |
|---|---|
| Backdrop | Sí — cierra al click |
| Contenedor | Sí — superficie glass con `--radius-lg` |
| Botón de cierre `×` | Según el consumidor, no lo provee el Modal |
| Header / footer | No estandarizados: cada consumidor los arma |

## Dónde se usa

| Consumidor | Pantalla |
|---|---|
| Auth (login/registro) | navbar, events-list, event-detail |
| `UsernameModal` | tras Google OAuth |
| Modal de participantes | event-detail |
| Modal de confirmación de subida | event-detail |

`StageAdvanceModal` y el modal de deadline de `manage-event` **no usan este componente**: arman su
propio overlay. Es la principal inconsistencia del patrón.

## Tokens que consume

- `bg.glass` + `border.glass` + `radius.lg` — la superficie
- `z.modal` — la capa

## Accesibilidad

⚠️ **Deficiente. Este es el hallazgo más importante del componente.**

| Requisito | Estado |
|---|---|
| `role="dialog"` | ❌ Ausente |
| `aria-modal="true"` | ❌ Ausente |
| Foco al abrir | ❌ No se gestiona |
| Trampa de foco | ❌ Ausente |
| Devolver foco al cerrar | ❌ Ausente |
| Cierre por `Escape` | ❌ Ausente — `Modal.tsx` no tiene `onKeyDown` |
| Cierre por click en backdrop | ✅ Presente |

**Un usuario de teclado o de lector de pantalla no puede operar ningún overlay del producto.**
Corregirlo acá lo corrige en los 4 consumidores a la vez, que es el argumento más fuerte para
tratar este componente como parte del DS.

⚠️ `Modal.css` es uno de los dos únicos archivos que responden a `prefers-color-scheme: light`, en
una aplicación cuyo resto queda oscuro: **en modo claro, el modal desentona con todo lo demás.**

## Do / Don't

*Vacío a propósito.* El código no registra guías de uso, y escribirlas acá sería inventar
intención. Se van a documentar cuando el componente se modifique.

## Deuda conocida

1. **Accesibilidad completa** — ver arriba.
2. **Dos overlays no lo usan** (`StageAdvanceModal`, modal de deadline), duplicando el patrón.
3. **`window.confirm` nativo** en la pausa de evento (`manage-event`): un tercer patrón de diálogo.
4. **Tema claro parcial**, inconsistente con el resto de la app.

## Historial

- 2026-09-18 v1.0.0 — Relevado desde el código por `/product-consolidate-services`.
