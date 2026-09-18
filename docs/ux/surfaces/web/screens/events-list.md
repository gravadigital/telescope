---
name: events-list
surface: web
route: "/events"
viewports: [desktop, mobile]
audiences: [participante, organizador]
fidelity: mid
status: as-is-sin-validar
version: "1.0"
date: 2026-09-18
---

# Listado de eventos

## Identidad

- **Audiencia primaria:** participante. **Co-primaria:** organizador (llega acá para entrar a
  gestionar sus eventos y para crear uno nuevo)
- **JTBD:** participante — descubrir a qué convocatorias puede entrar y qué le toca hacer en cada
  una. Organizador — entrar a sus eventos.
- **Viewports:** `desktop` (base), `mobile` (≤768px)
- **Acceso:** público. Algunas acciones exigen sesión

> **Transcripta del código existente** (`docs/analysis/ux/web/screens/events-list.md`).
> `status: as-is-sin-validar`.

## Entrada y salida

**Se llega desde:** el link `Events` de la navbar, el botón `Cancel` o `← Back to Events` de otras
pantallas, o directamente por URL.

**Se sale hacia:** `/events/create` (botón `Create Event`), `/events/{id}` o `/events/{id}/manage`
(botón contextual de cada fila).

## Estructura

Durante la carga hay un **retorno temprano** que reemplaza toda la pantalla.

| Bloque | Tipo | Contenido |
|---|---|---|
| Pantalla de carga | estado excluyente | Spinner + título + subtítulo. Reemplaza todo |
| Cabecera con acciones | encabezado | `<h1>` + grupo de dos botones (`Create Event`, `Refresh`) a la derecha |
| Tabs de filtrado | navegación | Tres tabs con contador. **Condicional:** solo con sesión y si el usuario tiene eventos propios o suscripciones |
| Alerta de error | banner | Mensaje + botón `Retry`. Condicional |
| Estado vacío | estado | Dos párrafos, con texto según el tab activo. Excluyente con la tabla |
| Tabla de eventos | tabla | Header de 5 columnas + una fila por evento. Cada fila: título y descripción truncada, fecha, badge de etapa (+ badges de pausa/cancelación), contador de participantes y **un único botón contextual** |

Máximo 4 bloques visibles a la vez.

**Origen:** `web/src/components/events/Events.tsx:105-345`, vía el wrapper `EventsPage`
(`App.tsx:59-67`).

## Layout por viewport

**desktop** (base)
- Tabla en grid. Cabecera de página en fila, con el grupo de botones a la derecha.
- A ≤1024px (`Events.css:181-190`): la tabla baja su `min-width` de 800px a 700px y las columnas
  pasan de anchos fijos a fracciones. **No es un cambio estructural.**

**mobile** (≤768px, `Events.css:192-273`) — **cambio estructural real**
- El `.table-header` se **oculta** (`display:none`).
- Cada fila pasa de grid a columna y se convierte en una **tarjeta** con fondo, borde y radio
  propios.
- Los `.cell-label` ocultos en desktop se **muestran**, supliendo el header eliminado.
- Las celdas se reordenan explícitamente: título(1), etapa(2), fecha(3), participantes(5),
  acciones(6).
- La cabecera de página pasa a columna centrada; el `<h1>` baja a `--text-xl`.
- A ≤480px: padding del contenedor a `--spacing-sm`, controles al 100%, título del evento a
  `--text-base`.

> ⚠️ **Desajuste verificado:** el grid define **6 columnas** pero el JSX renderiza **5 celdas**.
> `.cell-location` y `.location-text` tienen reglas CSS pero **no existe ninguna celda de location
> en el JSX**: CSS muerto de una versión anterior.

## Contenido

Microcopy transcripto **textual**, en inglés.

### Carga
`Loading events...` · `Connecting to server...`

### Cabecera
- Título: `Browse Events`
- Botón: `Create Event` — con `title="Log in to create events"` cuando no hay sesión
- Botón: `Refresh`

### Tabs (con contador dinámico)
`All Events ({n})` · `My Events ({n})` · `My Subscriptions ({n})`

### Error
`Error loading events. Please try again.` · Botón `Retry`

### Estados vacíos, según el tab
| Tab | Textos |
|---|---|
| `my` | `You have not created any events yet.` + `Click "Create Event" to get started!` |
| `subscriptions` | `You have not subscribed to any events yet.` + `Browse events and register to participate!` |
| `all` | `No events available at this time.` + `Come back soon for new observation opportunities!` |

### Tabla
- Headers: `Event` · `Created` · `Stage` · `Participants` · `Actions`
- Labels de mobile (ocultos en desktop): `Created:` · `Stage:` · `Participants:`
- Nombres de etapa: `Creation` · `Participation` · `Voting` · **`Completed`**
- Badges: `⏸ PAUSED` · `CANCELLED`
- Fecha: formato `en-US` (`{year:'numeric', month:'short', day:'numeric'}`). Fallback `—` si es
  inválida, `TBD` si el constructor lanza
- Participantes: `{n} / {max}` (max default 20)

### Botón contextual, uno por fila
| Condición | Texto | `title` |
|---|---|---|
| Es el creador | `Manage` | `Manage event stages and settings` |
| `participation` + registrado | `Upload File` | `Upload your file` |
| `participation` + no registrado | `Participate` | `Participate in this event` |
| `voting` + registrado | `Vote` | `Submit your votes` |
| `results` + registrado | `See Results` | `See final rankings` |
| Fallback | `View Event` | `View event details` |

> ⚠️ **La etapa `results` se muestra acá como `Completed`**, pero como `Results` en el resto de la
> aplicación. Inconsistencia de nomenclatura.

## Estados

| Estado | Aplica | Detalle |
|---|---|---|
| Vacío | **Sí** | Tres variantes según tab. Condición: `displayEvents.length === 0 && !loading && !error` |
| Cargando | **Sí** | Retorno temprano bloqueante que reemplaza toda la pantalla |
| Error | **Sí** | Banner con `Retry` |
| Éxito | **No** — no implementado | Tras un `Refresh` exitoso nada lo confirma |
| Deshabilitado | **Parcial** | `Refresh` tiene `disabled={loading}`, pero como `loading===true` fuerza el retorno temprano, **ese estado nunca es visible: código inalcanzable**. `Create Event` **no** se deshabilita sin sesión: se renderiza activo y al click abre el modal de login |
| Sin permiso | **Parcial** | Sin estado visual. Se manifiesta solo como apertura del modal de auth y como el `title` del botón |
| Parcial | **No** — no aplica | — |
| Offline | **No** — no implementado | `ApiHealthService.checkHealth()` se llama pero **su resultado solo va a `console.log`**. El usuario nunca se entera de que la API está caída |

## Interacciones

- ⚠️ **Doble fetch al montar:** dos `useEffect`, uno sin dependencias y otro por
  `location.pathname === '/events'`. Al cargar `/events` **ambos disparan**: dos requests.
- `Create Event` → con sesión navega a `/events/create`; sin sesión abre el modal de login.
- `Refresh` → reejecuta el fetch.
- Tabs → **el filtrado es client-side**, sobre los datos ya cargados.
- Botón contextual → navega según rol y etapa.
- **Feedback:** solo el spinner y la alerta de error. Ninguna acción da confirmación positiva.

## Accesibilidad

**Observado en el código:**
- ⚠️ **Tabla falsa**: es un grid de `<div>`, sin `<table>` ni roles `table`/`row`/`columnheader`.
  Un lector de pantalla no la interpreta como tabla.
- ⚠️ **Tabs sin semántica ARIA**: `<button>` sin `role="tab"`, sin `aria-selected`, sin
  `role="tablist"`. El estado activo se comunica **solo por color**.
- ⚠️ Los `title` son la única ayuda contextual; no hay `aria-label`.
- ✅ Los badges de etapa llevan texto además del color: son legibles sin distinguir colores.
- ✅ Todos los controles son `<button>` nativos, alcanzables por teclado.

## Decisiones y descartes

- Pantalla documentada desde el código existente `[fuente: código-existente]`. No hay registro del
  rationale original; las decisiones se van a documentar cuando la pantalla se modifique.
