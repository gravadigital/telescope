---
name: manage-event
surface: web
route: "/events/:eventId/manage"
viewports: [desktop, mobile]
audiences: [organizador]
fidelity: mid
status: as-is-sin-validar
version: "1.0"
date: 2026-09-18
---

# Gestión del evento (vista del organizador)

## Identidad

- **Audiencia primaria:** organizador
- **JTBD:** JTBD-02 — conducir el proceso hasta un resultado, sabiendo si va bien. **Es la pantalla
  central del rol**
- **Viewports:** `desktop` (base), `mobile` (≤768px)
- **Acceso:** solo el creador del evento. **Sin guard de ruta**: se valida dentro de la pantalla

> **Transcripta del código existente** (`docs/analysis/ux/web/screens/manage-event.md`).
> `status: as-is-sin-validar`.

## Entrada y salida

**Se llega desde:** el botón `Manage` del listado, o por redirección automática desde
`/events/:eventId` cuando el usuario es el creador.

**Se sale hacia:** ⚠️ **a ningún lado útil.** `← Back to Event Details` navega a `/events/{id}`, y
el wrapper **redirige al creador de vuelta acá**: loop de navegación verificado.

## Estructura

Estados excluyentes previos:

| Bloque | Tipo | Condición |
|---|---|---|
| Carga | estado excluyente | Spinner + título |
| Error de permiso o carga | estado excluyente | `error && !event` |
| Evento inexistente | estado excluyente | `!event` |

Estado normal:

| Bloque | Tipo | Contenido |
|---|---|---|
| Header de página | encabezado | Botón de retorno, `<h1>` y subtítulo |
| Alerta de error | banner | Condicional |
| Ficha del evento | panel de datos | Título, descripción y grilla de metadatos: fecha de creación, etapa actual con badge (+ badge de pausa), contador de participantes, contador de archivos entregados y — según etapa — la fila de deadline con su botón de editar o fijar |
| Control de etapa | panel de acciones | `<h3>`, el `EventTimeline` completo y una barra con el botón de avance, el de pausa/reanudación y/o el mensaje de evento finalizado |
| Configuración de votación | panel embebido | `VotingConfigurationPanel`. Condicional a etapa `voting` y `!votingConfigured` |
| Aviso de votación en curso | banner | Condicional a `voting && votingConfigured` |
| Participantes registrados | tabla | `<h3>` con contador, y o bien el estado vacío, o una tabla de 4 columnas con badges. Oculto en etapa `results` |
| Resultados | panel embebido | `VotingResultsPanel`. Solo en etapa `results` |
| Modal de avance de etapa | overlay | Condicional |
| Modal de edición de deadline | overlay | Fecha actual, campo de fecha, nota y footer |

**Origen:** `web/src/pages/manage-event/ManageEventPage.tsx:302-695`.

## Layout por viewport

**desktop** (base)
- Ficha del evento con metadatos en grilla.
- Tabla de participantes en 4 columnas.
- Acciones de etapa en fila.

**mobile** (≤768px, `ManageEventPage.css:389-438`)
- Padding de la página a 1rem; `<h1>` a 2rem; padding de las tarjetas a 1.5rem.
- **`.event-meta` pasa a columna**: los metadatos se apilan.
- **La tabla de participantes pasa a 1 columna.**
- `.stage-actions` a columna y botones a ancho completo.

Sin reglas a 1024px, 600px ni 480px. El `EventTimeline` aporta su propio corte a 600px, donde
**oculta deadlines**.

> ⚠️ **Bug de responsive verificado.** Al apilar la tabla, el CSS activa `content: attr(data-label)`
> en el `::before` de headers y celdas para etiquetar cada valor. **Pero el JSX nunca setea ningún
> atributo `data-label`**: verificado por grep — aparece **solo en ese archivo CSS, en cero
> archivos `.tsx`**. Resultado real: en mobile la tabla se apila **sin ninguna etiqueta**, y los
> cuatro valores (nombre, email, estado de archivo, estado de voto) quedan indistinguibles.

> ⚠️ **CSS muerto:** las reglas de `.stage-flow` y `.stage-arrow` apuntan a un stepper que ya no
> existe; ahora lo provee `EventTimeline` con clases `etl-*`.

## Contenido

Microcopy transcripto **textual**, en inglés.

### Carga y errores de pantalla completa
- `Loading event...`
- `Error` · `Event not found` · botón `Back to Events`
- Mensajes: `Event not found.` · **`You do not have permission to manage this event.`** ·
  `Error loading event data. Please try again.` · `Error updating event. Please try again.`

### Header
`← Back to Event Details` · `Manage Event` · `Control event stages and view participants`

### Ficha del evento
- Labels: `Created:` · `Current Stage:` · `Participants:` · `Files Submitted:` ·
  `Participation Deadline:` · `Voting Deadline:`
- Fecha: formato `en-US` (`{year:'numeric', month:'long', day:'numeric'}`)
- Badge de etapa: `Creation`/`Participation`/`Voting`/**`Results`**
- Badge: `⏸ PAUSED`
- Botón `✏️` con `title="Edit deadline"`, o `+ Set deadline`
- Fecha relativa: la fecha larga seguida de `(today)`, `(tomorrow)`, `(in {n} days)`,
  `(yesterday)` o `({n} days ago)`

### Control de etapa
- `Event Stage Control`
- Botón: `Updating...` o `Advance to {Stage}`
- Botón: `Updating...` / `▶ Resume Event` / `⏸ Pause Event`
- Mensaje: `Event has reached final results` con `✓`

### Confirmación de pausa
⚠️ Usa **`window.confirm` nativo**:
`⏸️ Pause this event? Participants will not be able to register or upload files while the event is paused.`
o `▶️ Resume this event? ` (con un espacio final sobrante).

### Validaciones de avance
- `Cannot advance: No participants registered yet.`
- `Cannot advance: Only {votedCount} of {totalParticipants} participants have voted.`

### Votación en curso
`✅ Voting is underway`; `Reviewers have been assigned their submissions and can now submit their rankings.`;
`Once everyone has voted, advance to "Results" to publish the final ranking.`

> Estos tres textos están **duplicados literalmente** en `EventDetailPage.tsx:400-402`.

### Participantes
- `Registered Participants ({n})`
- Vacío: `No participants have registered yet.` + `Share the event link to invite participants!`
- Headers: `Name`, `Email`, `File Status`, `Voting Status`
- Badges: `✓ Submitted` / `⏳ Pending` · `✓ Voted` / `⏳ Not Voted` · `N/A`

### Modal de deadline
`Edit Participation Deadline` o `Edit Voting Deadline`; cerrar `×`; `Current deadline: ` + fecha;
label `New Deadline *`; hint `Note: You can only postpone the deadline, not bring it forward.`;
error prefijado con `⚠️ `; botones `Cancel` y `Updating...` / `Update Deadline`; fallbacks
`Failed to update deadline` y `Error updating deadline`.

## Estados

| Estado | Aplica | Detalle |
|---|---|---|
| Vacío | **Sí** | `No participants have registered yet.` + `Share the event link to invite participants!` |
| Cargando | **Sí** | Pantalla bloqueante y `Updating...` en avance, pausa y deadline |
| Error | **Sí, doble** | Pantalla completa si `error && !event`; banner inline si el evento cargó; error local dentro del modal de deadline |
| Éxito | **No** — no implementado | ⚠️ **No hay ningún mensaje de éxito en toda la pantalla.** Tras avanzar de etapa solo queda un `console.log`; tras pausar o cambiar el deadline, nada. El único feedback es que los datos se recargan |
| Deshabilitado | **Sí** | Avance, pausa y, en el modal, cancelar, input y confirmar |
| Sin permiso | **Sí — el único explícito de toda la app** | `You do not have permission to manage this event.` como pantalla completa con botón de salida. ⚠️ Si no hay sesión, redirige a `/events` **sin mensaje** |
| Parcial | **Sí, y es el núcleo de la pantalla** | Contador `Files Submitted: {n} / {total}`; badges `⏳ Pending` y `⏳ Not Voted` por participante; y el bloqueo `Cannot advance: Only {x} of {y} participants have voted.` |
| Offline | **No** — no implementado | Sin chequeo de salud ni mensaje de conectividad |

> ⚠️ **Degradación silenciosa — el hallazgo más importante de la pantalla.** Tres cargas
> secundarias fallan **sin mostrar nada al usuario**: participantes (`catch` → `console.warn` +
> lista vacía), adjuntos y estadísticas de votación.
>
> **Si la API de participantes cae, la pantalla muestra `No participants have registered yet.` como
> si realmente no hubiera ninguno.** Un fallo se presenta como un dato — y el organizador toma
> decisiones irreversibles sobre esa base.

## Interacciones

- **Carga en cascada:** evento → participantes → adjuntos → estadísticas de votación (estas
  últimas solo si la etapa es `voting` o `results`).
- **Guards:** redirección a `/events` sin sesión; bloqueo por `creator_id`.
- **Avance de etapa:** abre el modal. Al confirmar, **valida primero** y **lanza** si hay error; el
  `throw` lo captura `StageAdvanceModal`, que lo muestra en su propio bloque.

| Validación | Regla |
|---|---|
| Sin participantes | Desde `participation` con `participants.length === 0` |
| Votación incompleta | De `voting` a `results` con `votedCount < totalParticipants` |

  Un comentario en el código indica que **se eliminó deliberadamente** la validación de que todos
  hubieran subido archivo antes de votar.

> ⚠️ **Estas validaciones no existen en `EventDetailPage`**, que permite el mismo avance sin ningún
> chequeo.

- **Pausa/reanudación:** usa **`window.confirm` nativo**. Es el único diálogo no-React de la
  aplicación, visualmente ajeno al resto.
- **Edición de deadline:** el modal tiene `min` = hoy y deshabilita el confirmar sin fecha.

> ⚠️ El hint dice `You can only postpone the deadline, not bring it forward.` **pero no hay ninguna
> validación client-side que lo haga cumplir**: `min` solo impide fechas pasadas, no fechas
> anteriores al deadline actual. La regla anunciada queda librada al backend.

> ⚠️ **Loop de navegación verificado.** `handleBack` navega a `/events/{eventId}`, y
> `EventDetailPageWrapper` **redirige al creador de vuelta a `/manage`**. Para el organizador,
> `← Back to Event Details` produce un rebote inmediato a la misma pantalla.

## Accesibilidad

**Observado en el código:**
- ⚠️ Tabla de participantes: `<div>` en grid, sin semántica de tabla ni roles ARIA.
- ⚠️ El botón `✏️` de editar deadline: su **contenido accesible es solo el emoji**; tiene `title`
  pero no `aria-label`.
- ⚠️ En el modal de deadline, el `<label>New Deadline</label>` **no tiene `htmlFor`** y el
  `<input type="date">` **no tiene `id`**: label sin asociar. Contrasta con `StageAdvanceModal`,
  que sí los asocia.
- ⚠️ Ningún overlay tiene `role="dialog"`, `aria-modal`, gestión de foco ni cierre por Escape.
- ⚠️ Banners de error sin `role="alert"` ni `aria-live`.
- ✅ `window.confirm` sí es accesible por ser nativo, pero rompe la consistencia visual.
- ✅ **Los badges de estado son correctos**: transmiten la información por color **y** texto
  (`✓ Submitted`, `⏳ Pending`), no dependen solo del color.

## Decisiones y descartes

- Pantalla documentada desde el código existente `[fuente: código-existente]`. No hay registro del
  rationale original; las decisiones se van a documentar cuando la pantalla se modifique.
