# Pantalla: Listado de eventos

| | |
|---|---|
| **Ruta** | `/events` |
| **Componente** | `src/components/events/Events.tsx`, vía el wrapper `EventsPage` (`App.tsx:59-67`) |
| **Acceso** | Público. Algunas acciones exigen sesión |
| **Viewports** | `desktop` (base) · `mobile` (≤768px) |

## Bloques

Durante la carga hay un **retorno temprano** que reemplaza toda la pantalla:

| # | Bloque | Origen | Contenido |
|---|---|---|---|
| L | Pantalla de carga | `Events.tsx:105-117` | Spinner + título + subtítulo. Excluyente |

Estado normal:

| # | Bloque | Origen | Contenido |
|---|---|---|---|
| 1 | Cabecera con acciones | `Events.tsx:123-149` | `<h1>` más un grupo de dos botones (`Create Event`, `Refresh`) a la derecha |
| 2 | Tabs de filtrado | `Events.tsx:152-173` | Tres tabs con contador. **Condicional**: solo si hay sesión y el usuario tiene eventos propios o suscripciones |
| 3 | Alerta de error | `Events.tsx:175-182` | Banner rojo con el mensaje y botón `Retry`. Condicional |
| 4a | Estado vacío | `Events.tsx:184-200` | Dos párrafos, con texto según el tab activo. Excluyente con 4b |
| 4b | Tabla de eventos | `Events.tsx:202-345` | Header de 5 columnas y una fila por evento. Cada fila lleva título y descripción truncada, fecha, badge de etapa (más badges de pausa/cancelación), contador de participantes y **un único botón contextual** resuelto por rol y etapa |

Máximo 4 bloques visibles a la vez (4a y 4b son excluyentes).

## Microcopy

Todo en inglés.

**Carga** (`Events.tsx:111-112`) — `Loading events...` · `Connecting to server...`

**Cabecera** — `Browse Events` (`:124`); botón `Create Event` (`:138`), con
`title="Log in to create events"` cuando no hay sesión (`:136`); botón `Refresh` (`:146`).

**Tabs**, con contador dinámico — `All Events ({n})` (`:158`) · `My Events ({n})` (`:164`) ·
`My Subscriptions ({n})` (`:170`).

**Error** — `Error loading events. Please try again.` (`:52`); botón `Retry` (`:179`).

**Vacíos**, según el tab (`:186-199`):

| Tab | Textos |
|---|---|
| `my` | `You have not created any events yet.` + `Click "Create Event" to get started!` |
| `subscriptions` | `You have not subscribed to any events yet.` + `Browse events and register to participate!` |
| `all` | `No events available at this time.` + `Come back soon for new observation opportunities!` |

**Headers de tabla** (`:205-209`) — `Event` · `Created` · `Stage` · `Participants` · `Actions`

**Labels de mobile**, ocultos en desktop (`Events.css:134-135`) — `Created:` (`:223`),
`Stage:` (`:241`), `Participants:` (`:261`)

**Nombres de etapa** (`getStageDisplayName`, `:66-74`) — `Creation` · `Participation` ·
`Voting` · **`Completed`**

> La etapa `results` se muestra acá como **`Completed`**, pero como **`Results`** en el resto
> de la aplicación (`EventDetailPage.tsx:171`, `ManageEventPage.tsx:293`,
> `StageAdvanceModal.tsx:18`). Inconsistencia de nomenclatura.

**Badges** — `⏸ PAUSED` (`:250`) · `CANCELLED` (`:255`)

**Fecha** — formateada con `toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric'})`
(`:229-233`). Fallback `—` si la fecha es inválida (`:228`) y `TBD` si el constructor lanza
(`:235`).

**Contador de participantes** — dinámico: `{participant_ids?.length || 0} / {max_participants || 20}` (`:263`)

**Botón de acción**, uno solo por fila según rol y etapa (`:269-338`):

| Condición | Texto | `title` |
|---|---|---|
| Es el creador | `Manage` | `Manage event stages and settings` |
| `participation` + registrado | `Upload File` | `Upload your file` |
| `participation` + no registrado | `Participate` | `Participate in this event` |
| `voting` + registrado | `Vote` | `Submit your votes` |
| `results` + registrado | `See Results` | `See final rankings` |
| Fallback | `View Event` | `View event details` |

El título y la descripción del evento son dinámicos desde la API (`:217-218`).

## Estados

| Estado | Presente | Detalle |
|---|---|---|
| **Vacío** | **Sí** | Tres variantes según tab. Condición: `displayEvents.length === 0 && !loading && !error` (`:184`) |
| **Cargando** | **Sí** | Retorno temprano bloqueante que reemplaza toda la pantalla (`:105-117`) |
| **Error** | **Sí** | Banner con `Retry`. Se setea en el `catch` de `checkApiAndFetchEvents` (`:50-53`) |
| **Éxito** | **No** | Tras un `Refresh` exitoso el spinner desaparece y nada más lo confirma |
| **Deshabilitado** | **Parcial** | `Refresh` tiene `disabled={loading}` (`:144`), pero como `loading===true` fuerza el retorno temprano (`:105`), **ese estado nunca es visible**: código inalcanzable. `Create Event` **no** se deshabilita sin sesión: se renderiza activo y al click abre el modal de login (`:129-134`) |
| **Sin permiso** | **Parcial** | No hay estado visual. La falta de permiso se manifiesta solo como apertura del modal de auth (`:132`, `:309`) y como el `title` del botón (`:136`) |
| **Parcial** | **No** | — |
| **Offline** | **No** | `ApiHealthService.checkHealth()` se llama (`:39`) pero **su resultado solo va a `console.log`** (`:42,45`). El usuario nunca se entera de que la API está caída; si el fetch falla, cae en el error genérico |

## Layout por viewport

**Desktop** (base)
- Tabla en grid. Cabecera de página en fila, con el grupo de botones a la derecha.

**≤1024px** (`Events.css:181-190`)
- La tabla baja su `min-width` de 800px a 700px.
- Las columnas pasan de anchos fijos a fracciones (`2fr 1fr 1fr 1fr 0.8fr 0.8fr`).

**Mobile (≤768px)** (`Events.css:192-273`) — **cambio estructural**
- El `.table-header` se **oculta** (`display:none`, `:215-217`).
- Cada `.table-row` pasa de grid a columna y se convierte en una **tarjeta** con fondo,
  borde y radio propios (`:219-228`).
- Los `.cell-label` ocultos se **muestran** (`:239-242`), supliendo el header eliminado.
- Las celdas se reordenan explícitamente: título(1), etapa(2), fecha(3), location(4),
  participantes(5), acciones(6) (`:244-267`).
- La cabecera de página pasa a columna centrada y el `<h1>` baja a `--text-xl` (`:197-204`).

**≤480px** (`Events.css:275-296`)
- Padding del contenedor a `--spacing-sm`; `.events-controls` al 100% y centrado; el título
  del evento baja a `--text-base`.

> **Desajuste verificado:** el grid define **6 columnas** (`Events.css:88`, `:112`) pero el
> JSX renderiza **5 celdas** (`:205-209`). Además `.cell-location` (`Events.css:256-258`) y
> `.location-text` (`:161-163`) tienen reglas pero **no existe ninguna celda de location en
> el JSX**: CSS muerto de una versión anterior.

## Interacciones

- **Doble fetch al montar**: hay dos `useEffect`, uno sin dependencias (`:30-32`) y otro por
  `location.pathname === '/events'` (`:24-28`). Al cargar `/events` **ambos disparan**
  `checkApiAndFetchEvents()`: dos requests.
- `Create Event` → con sesión, `navigate('/events/create')`; sin sesión,
  `openAuthModal('login')` (`:131-133`).
- `Refresh` → reejecuta el fetch (`:58-60`).
- Tabs → `setActiveTab`. **El filtrado es client-side** (`:77-103`).
- `Manage` → `navigate('/events/{id}/manage')` (`:280`).
- Botones de participante → `goToEvent()` (`:289-295`). `Participate` sin sesión abre el
  modal de login (`:309`).
- Sin formularios ni validaciones en esta pantalla.
- **Feedback**: solo el spinner y la alerta de error. Ninguna acción da confirmación
  positiva.

## Accesibilidad observada

- **Tabla falsa**: es un grid de `<div>` (`:203-210`), sin `<table>` ni roles
  `table`/`row`/`columnheader`. Un lector de pantalla no la interpreta como tabla.
- **Tabs sin semántica ARIA**: `<button>` sin `role="tab"`, sin `aria-selected`, sin
  `role="tablist"` (`:153-172`). El estado activo se comunica **solo por color**
  (`Events.css:64-68`).
- Los `title` son la única ayuda contextual; no hay `aria-label`.
- Los badges de etapa llevan texto además del color, así que son legibles.
- Todos los controles son `<button>` nativos: alcanzables por teclado, sin gestión explícita
  de foco.

## Observaciones

- La etiqueta `Completed` para la etapa `results` contradice al resto de la aplicación.
- El doble fetch al montar es observable y desperdicia una request.
- El estado `disabled` del botón `Refresh` es inalcanzable por diseño del retorno temprano.
- Hay CSS de una columna "location" que el JSX ya no renderiza.
