# Pantalla: Gestión del evento (vista del organizador)

| | |
|---|---|
| **Ruta** | `/events/:eventId/manage` |
| **Componente** | `src/pages/manage-event/ManageEventPage.tsx` |
| **Acceso** | Solo el creador del evento. **Sin guard de ruta**: se valida dentro de la pantalla |
| **Viewports** | `desktop` (base) · `mobile` (≤768px) |

## Bloques

Estados excluyentes previos:

| # | Bloque | Origen | Condición |
|---|---|---|---|
| L | Carga | `:302-311` | Spinner + título |
| E1 | Error de permiso o carga | `:313-325` | `error && !event` |
| E2 | Evento inexistente | `:327-338` | `!event` |

Estado normal:

| # | Bloque | Origen | Contenido |
|---|---|---|---|
| 1 | Header de página | `:346-352` | Botón de retorno, `<h1>` y subtítulo |
| 2 | Alerta de error | `:355-359` | Banner condicional |
| 3 | Ficha del evento | `:362-454` | Título, descripción y grilla de metadatos: fecha de creación, etapa actual con badge (más badge de pausa), contador de participantes, contador de archivos entregados y — según etapa — la fila de deadline con su botón de editar o fijar |
| 4 | Control de etapa | `:457-504` | `<h3>`, el `EventTimeline` completo y una barra con el botón de avance, el de pausa/reanudación y/o el mensaje de evento finalizado |
| 5 | Configuración de votación | `:507-519` | `VotingConfigurationPanel`. Condicional a etapa `voting` y `!votingConfigured` |
| 6 | Aviso de votación en curso | `:522-530` | Banner verde. Condicional a `voting && votingConfigured` |
| 7 | Participantes registrados | `:533-586` | `<h3>` con contador, y o bien el estado vacío, o una tabla de 4 columnas con badges. Oculto en etapa `results` |
| 8 | Resultados | `:589-593` | `VotingResultsPanel`. Solo en etapa `results` |
| 9 | Modal de avance de etapa | `:596-604` | Overlay |
| 10 | Modal de edición de deadline | `:607-623`, definido en `:630-695` | Overlay con fecha actual, campo de fecha, nota y footer |

## Microcopy

Todo en inglés.

**Carga** — `Loading event...` (`:307`)

**Errores de pantalla completa** — `Error` (`:317`) · `Event not found` (`:330`) · botón
`Back to Events` (`:320`, `:333`).

Mensajes de `error`: `Event not found.` (`:56`) ·
**`You do not have permission to manage this event.`** (`:63`) ·
`Error loading event data. Please try again.` (`:127`) ·
`Error updating event. Please try again.` (`:270`)

**Header** — `← Back to Event Details` (`:348`) · `Manage Event` (`:350`) ·
`Control event stages and view participants` (`:351`)

**Ficha del evento** — labels `Created:` (`:368`), `Current Stage:` (`:379`),
`Participants:` (`:394`), `Files Submitted:` (`:399`), `Participation Deadline:` (`:408`),
`Voting Deadline:` (`:432`). Fecha con
`toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric'})` (`:370-374`).
Badge de etapa: `Creation`/`Participation`/`Voting`/**`Results`** (`:289-294`). Badge
`⏸ PAUSED` (`:388`). Botón `✏️` con `title="Edit deadline"` (`:414-417`, `:438-441`) o
`+ Set deadline` (`:420-424`, `:443-447`).

**Fecha relativa** (`formatEstimatedDate`, `:201-230`) — la fecha larga seguida de `(today)`,
`(tomorrow)`, `(in {n} days)`, `(yesterday)` o `({n} days ago)`.

**Control de etapa** — `Event Stage Control` (`:458`); botón `Updating...` o
`Advance to {Stage}` (`:475-482`); botón `Updating...` / `▶ Resume Event` / `⏸ Pause Event`
(`:493`); mensaje `Event has reached final results` con `✓` (`:499-500`).

**Confirmación de pausa** — usa **`window.confirm` nativo** (`:258`):
`⏸️ Pause this event? Participants will not be able to register or upload files while the event is paused.`
o `▶️ Resume this event? ` (con un espacio final sobrante, porque el segundo interpolado es
cadena vacía).

**Validaciones de avance** (`:232-252`) — `Cannot advance: No participants registered yet.`
(`:235`) · `Cannot advance: Only {votedCount} of {totalParticipants} participants have voted.`
(`:247`)

**Votación en curso** (`:525-527`) — `✅ Voting is underway`;
`Reviewers have been assigned their submissions and can now submit their rankings.`;
`Once everyone has voted, advance to "Results" to publish the final ranking.`

> Estos tres textos son **idénticos y están duplicados literalmente** en
> `EventDetailPage.tsx:400-402`.

**Participantes** — `Registered Participants ({n})` (`:535`); vacío:
`No participants have registered yet.` + `Share the event link to invite participants!`
(`:539-540`); headers `Name`, `Email`, `File Status`, `Voting Status` (`:545-548`); badges
`✓ Submitted` / `⏳ Pending` (`:566-567`), `✓ Voted` / `⏳ Not Voted` (`:573-574`), `N/A` (`:576`).

**Modal de deadline** (`:652-691`) — `Edit Participation Deadline` o `Edit Voting Deadline`
(`:656`); cerrar `×` (`:657`); `Current deadline: ` + fecha (`:662`); label `New Deadline` + `*`
(`:666`); hint `Note: You can only postpone the deadline, not bring it forward.` (`:667-669`);
error prefijado con `⚠️ ` (`:678`); botones `Cancel` (`:682`) y `Updating...` /
`Update Deadline` (`:689`); fallbacks `Failed to update deadline` (`:648`) y
`Error updating deadline` (`:194`).

## Estados

| Estado | Presente | Detalle |
|---|---|---|
| **Vacío** | **Sí** | `No participants have registered yet.` + `Share the event link to invite participants!` (`:539-540`), cuando la lista filtrada (excluyendo al creador) está vacía |
| **Cargando** | **Sí** | Pantalla bloqueante (`:302-311`) y `Updating...` en avance (`:478`), pausa (`:493`) y deadline (`:689`) |
| **Error** | **Sí, doble** | Pantalla completa si `error && !event` (`:313-325`); banner inline si el evento cargó (`:355-359`); error local dentro del modal de deadline (`:678`) |
| **Éxito** | **No** | **No hay ningún mensaje de éxito en toda la pantalla.** Tras avanzar de etapa solo queda un `console.log` (`:164`); tras pausar o cambiar el deadline, nada. El único feedback es que los datos se recargan |
| **Deshabilitado** | **Sí** | Avance (`:472`), pausa (`:489`) y, en el modal, cancelar, input y confirmar (`:675`, `:681`, `:687`) |
| **Sin permiso** | **Sí — el único explícito de toda la app** | `You do not have permission to manage this event.` (`:63`) cuando `creator_id !== user.id`, como pantalla completa con botón de salida. Si no hay sesión, redirige a `/events` **sin mensaje** (`:33-36`) |
| **Parcial** | **Sí, y es el núcleo de la pantalla** | Contador `Files Submitted: {n} / {total}` (`:399-402`); badges `⏳ Pending` y `⏳ Not Voted` por participante; y el bloqueo `Cannot advance: Only {x} of {y} participants have voted.` |
| **Offline** | **No** | No hay chequeo de salud ni mensaje de conectividad en esta pantalla |

> **Degradación silenciosa — el hallazgo más importante de la pantalla.** Tres cargas
> secundarias fallan **sin mostrar nada al usuario**: participantes (`catch` → `console.warn`
> + lista vacía, `:74-77`), adjuntos (`:92-96`) y estadísticas de votación (`:116-120`).
>
> Consecuencia concreta: **si la API de participantes cae, la pantalla muestra
> "No participants have registered yet." como si realmente no hubiera ninguno.** Un fallo se
> presenta como un dato — y el organizador podría tomar decisiones sobre esa base.

## Layout por viewport

**Desktop** (base)

**Mobile (≤768px)** (`ManageEventPage.css:389-438`)
- Padding de la página a 1rem; `<h1>` a 2rem; padding de las tarjetas a 1.5rem.
- **`.event-meta` pasa a columna** (`:404-407`): los metadatos se apilan.
- **La tabla de participantes pasa a 1 columna** (`:418-422`).
- `.stage-actions` a columna y botones a ancho completo (`:431-437`).

Sin reglas a 1024px, 600px ni 480px. El `EventTimeline` aporta su propio corte a 600px.

> **Bug de responsive verificado.** Al apilar la tabla, el CSS activa
> `content: attr(data-label)` en el `::before` de headers y celdas (`:424-429`) para etiquetar
> cada valor. **Pero el JSX nunca setea ningún atributo `data-label`**: verificado por grep en
> todo el proyecto — `data-label` aparece **solo en ese archivo CSS, en cero archivos `.tsx`**.
>
> Resultado real: en mobile la tabla se apila **sin ninguna etiqueta**, y los cuatro valores
> (nombre, email, estado de archivo, estado de voto) quedan indistinguibles entre sí.

> **CSS muerto:** las reglas de `.stage-flow` y `.stage-arrow` (`:409-416`) apuntan a un
> stepper que ya no existe; ahora lo provee `EventTimeline` con clases `etl-*`.

## Interacciones

- **Carga en cascada** (`:32-42`): evento → participantes → adjuntos → estadísticas de
  votación (estas últimas solo si la etapa es `voting` o `results`, `:99`).
- **Guards**: redirección a `/events` sin sesión (`:33-36`); bloqueo por `creator_id` (`:62-66`).
- **Avance de etapa**: abre el modal (`:134-139`). Al confirmar, **valida primero** y **lanza**
  si hay error (`:149-152`); el `throw` lo captura `StageAdvanceModal`, que lo muestra en su
  propio bloque de error (`StageAdvanceModal.tsx:63-65`).

| Validación | Regla | Origen |
|---|---|---|
| Sin participantes | Desde `participation` con `participants.length === 0` | `:234-236` |
| Votación incompleta | De `voting` a `results` con `votedCount < totalParticipants` | `:242-249` |

  Un comentario en `:238-239` indica que **se eliminó deliberadamente** la validación de que
  todos hubieran subido archivo antes de votar.

> **Estas validaciones no existen en `EventDetailPage`**, que permite el mismo avance sin
> ningún chequeo. La misma acción tiene reglas distintas según desde dónde se ejecute.

- **Pausa/reanudación** (`:254-274`): usa **`window.confirm` nativo** (`:258`). Es el único
  diálogo de confirmación no-React de la aplicación, visualmente ajeno al resto.
- **Edición de deadline** (`:174-198`): el modal tiene `min={minDate}` = hoy (`:641`, `:674`)
  y deshabilita el confirmar sin fecha (`:687`).

> El hint dice `You can only postpone the deadline, not bring it forward.` **pero no hay
> ninguna validación client-side que lo haga cumplir**: `min` solo impide fechas pasadas, no
> fechas anteriores al deadline actual. La regla anunciada queda librada al backend.

> **Loop de navegación verificado.** `handleBack` navega a `/events/{eventId}`
> (`:298-300`), y `EventDetailPageWrapper` **redirige al creador de vuelta a `/manage`**
> (`App.tsx:86-90`). Para el organizador, `← Back to Event Details` produce un rebote
> inmediato a la misma pantalla: el botón de volver no lo lleva a ningún lado.

## Accesibilidad observada

- Tabla de participantes: `<div>` en grid (`:543-549`), sin semántica de tabla ni roles ARIA.
- El botón `✏️` de editar deadline (`:414-417`): su **contenido accesible es solo el emoji**;
  tiene `title` pero no `aria-label`.
- En el modal de deadline, el `<label>New Deadline</label>` (`:666`) **no tiene `htmlFor`** y
  el `<input type="date">` (`:670-676`) **no tiene `id`**: label sin asociar. Contrasta con
  `StageAdvanceModal`, que sí los asocia.
- Ningún overlay tiene `role="dialog"`, `aria-modal`, gestión de foco ni cierre por Escape.
- Banners de error sin `role="alert"` ni `aria-live` (`:356`, `:678`).
- `window.confirm` (`:258`) sí es accesible por ser nativo, pero rompe la consistencia visual.
- **Los badges de estado son correctos**: transmiten la información por color **y** texto
  (`✓ Submitted`, `⏳ Pending`), no dependen solo del color.

## Observaciones

- La degradación silenciosa de las cargas secundarias es el riesgo funcional más alto: un
  fallo de API se muestra como ausencia de datos.
- El bug de `data-label` deja la tabla ilegible en mobile.
- El botón de volver genera un loop para el propio organizador.
- No hay confirmación de éxito para ninguna de las tres acciones críticas de la pantalla.
