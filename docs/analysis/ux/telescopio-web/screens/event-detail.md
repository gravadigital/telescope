# Pantalla: Detalle del evento (vista del participante)

| | |
|---|---|
| **Ruta** | `/events/:eventId` |
| **Componente** | `EventDetailPageWrapper` (`App.tsx:70-119`) → `src/pages/event-detail/EventDetailPage.tsx` |
| **Acceso** | Público. Las acciones exigen sesión y registro |
| **Viewports** | `desktop` (base) · `mobile` (≤768px) |

> **El creador del evento nunca ve esta pantalla.** El wrapper hace un fetch propio y, si
> `event.creator_id === user.id`, redirige a `/events/:id/manage` con `replace: true`
> (`App.tsx:77-100`).

## Bloques

Estados excluyentes previos (retornos tempranos):

| # | Bloque | Origen | Contenido |
|---|---|---|---|
| W | Carga del wrapper | `App.tsx:110-116` | `<p>Loading...</p>` con estilos **inline**. No usa las clases de carga del resto de la app |
| W2 | Evento sin id | `App.tsx:106-108` | `<div>Event not found</div>` **sin estilo ni layout** |
| L | Carga de la página | `:178-189` | Spinner + título, reemplaza la pantalla |
| E | Fallo de carga | `:191-207` | Botón de retorno + tarjeta de error con dos vías de recuperación |

Estado normal:

| # | Bloque | Origen | Contenido |
|---|---|---|---|
| 1 | Barra de navegación | `:226-228` | `<nav>` con el botón de volver |
| 2 | Presentación del evento | `:231-255` | Título y `ShareButton` en la misma fila; descripción; fila de metadatos con organizador y contador de participantes con su toggle |
| 3 | Modal de participantes | `:257-259` | Overlay condicional |
| 4 | Estado del evento | `:262-277` | El `EventTimeline` (stepper de 4 pasos + tarjeta de la etapa activa) y, condicional, el aviso de pausa |
| 5 | Mensajes de feedback | `:280-281` | Dos banners condicionales: éxito y error |
| 6 | Zona de acción de la etapa | `:284-420` | **Un único contenedor cuyo contenido varía por etapa y rol** |
| 7 | Modal de avance de etapa | `:424-432` | Overlay |
| 8 | Modal de confirmación de subida | `:435-450` | Overlay con la ficha del archivo y dos botones |

El bloque 6 es deliberadamente uno solo: el código lo estructura como una única
`<section className="edp-action">` con `min-height: 80px` (`EventDetailPage.css:1409-1416`),
y su contenido es mutuamente excluyente. Según etapa y rol puede mostrar: el botón de avance
del organizador, el aviso de evento en preparación, el bloque de participación (registro o
carga de archivo con preview y lista de tipos permitidos), el panel de configuración de
votación, el aviso de votación en curso, el panel de ranking o el panel de resultados.

## Microcopy

Todo en inglés.

**Wrapper** — `Event not found` (`App.tsx:107`) · `Loading...` (`App.tsx:113`)

**Carga** — `Loading event details...` (`:184`)

**Error de carga** (`:195-202`) — botón `← Back to Events`; `⚠️ Unable to Load Event`; el
mensaje de `error` o el literal `Event not found`; botones `← Back to Events List` y
`🔄 Try Again`.

Mensajes de `error` posibles: `Unable to connect to the server. Using cached data if available.`
(`:60`) · `Event with ID "{eventId}" was not found.` (`:82`) · `Failed to load event details: {mensaje}.`
(`:86`, con texto crudo de la API).

**Presentación** — organizador dinámico con fallback literal `Not specified` (`:242`);
contador `{n} / {max} participants` (`:246`); toggle `Hide` / `View` (`:249`).

**Estado** — `This event is currently paused` con icono `⏸` (`:273-274`)

**Feedback de éxito** (`:280`), cinco mensajes:

| Texto | Origen |
|---|---|
| `Stage updated to: {etapa}` | `:99` |
| `Successfully registered! You can now upload your file.` | `:122` |
| `File uploaded successfully!` | `:156` |
| `✅ Voting configuration completed! Participants can now submit their rankings.` | `:394` |
| `✅ Your rankings have been submitted successfully!` | `:411` |

**Feedback de error** — `Error updating event stage` (`:103`) ·
`Failed to register for the event. Please try again.` (`:127`) · `File cannot exceed 10MB` (`:136`) ·
`File type not allowed. Use: JPEG, PNG, GIF, WebP, PDF, TXT, DOC, DOCX` (`:138`) ·
`Upload failed: {msg}` (`:161`)

**Zona de acción** según etapa y rol:

| Situación | Textos |
|---|---|
| Organizador | `⏳ Updating...` o `▶️ Advance to {Stage}` (`:294`) |
| `creation`, no organizador | `🔭` + `This event is being set up. Come back when it opens for participation.` (`:301-304`) |
| `participation`, no registrado | `📝 Event Participation`; `Register to participate and upload your file.`; botón `Registering...` / `Participate` (`:311-320`) |
| Ya subió archivo | `✅` + `Submission received` + `You've already uploaded your file. Only one submission is allowed per participant.` (`:326-330`) |
| Puede subir | Badge `✅ Registered` (`:336`) + `Upload your submission for this event.`; botón `Uploading...` / `Upload File`; botón `×` con `title="Remove selected file"` |
| Requisitos | `Accepted: JPEG, PNG, GIF, WebP, PDF, TXT, DOC, DOCX · Max 10 MB` (`:370`) — una sola línea |
| Evento pausado | `⏸ Registration and file submissions are not available while the event is paused.` (`:382`) |
| Votación configurada | `✅ Voting is underway`; `Reviewers have been assigned their submissions and can now submit their rankings.`; `Once everyone has voted, advance to "Results" to publish the final ranking.` (`:400-402`) |

**Modal de confirmación de subida** (`:438-446`) — `Confirm upload`;
`Are you sure you want to upload this file?`; nombre y tamaño dinámicos; `Cancel` y `Upload`.

**Nombres de etapa** (`:167-172`) — `Creation` · `Participation` · `Voting` · **`Results`**
(acá sí `Results`, a diferencia de `Completed` en el listado).

## Estados

| Estado | Presente | Detalle |
|---|---|---|
| **Vacío** | **Parcial** | El único propio es el de etapa `creation` para no-organizadores (`:303`). Los paneles hijos traen los suyos |
| **Cargando** | **Sí, múltiple** | Página bloqueante (`:178-189`), wrapper (`App.tsx:110-116`), y por botón: `Registering...`, `Uploading...`, `⏳ Updating...` |
| **Error** | **Sí, doble vía** | Pantalla completa cuando `!event` (`:191-207`) y banner inline para errores de acción (`:281`) |
| **Éxito** | **Sí** | Banner con cinco mensajes. **Nunca se limpia por tiempo ni al navegar**: no hay `setTimeout` que resetee `success`, queda hasta el próximo cambio de estado |
| **Deshabilitado** | **Sí** | Avance (`:292`), participar (`:318`), input de archivo (`:342`), subir (`:359`) |
| **Sin permiso** | **Implícito** | No hay mensaje de "no tenés permiso": se expresa como **ausencia de bloques**. `canUploadAttachment` (`:217`) exige etapa `participation`, sesión, estar registrado, no haber subido, no ser el creador y que el evento no esté pausado. Sin sesión, `Participate` sí se muestra y abre el modal de login (`:316`) |
| **Parcial** | **Sí** | `✅ You have already submitted your file...` (`:331`). El chequeo compara `att.participant_id === user.id \|\| att.author_id === user.id` (`:73-75`) y **solo corre si la etapa es `participation`** (`:70`): en otras etapas el flag conserva su valor previo |
| **Offline** | **Inalcanzable** | Si el health check falla se setea `Unable to connect to the server...` (`:59-61`), **pero si `getEventById` tiene éxito hace `setError('')` (`:68`)** y el aviso desaparece. Solo sobreviviría si además falla el fetch, y en ese caso se pisa con otro error. En la práctica no se ve nunca |

## Layout por viewport

**Desktop** (base)

**Mobile (≤768px)** — el bloque que aplica es `EventDetailPage.css:1443-1472`
- Padding de `.edp-presentation` a `--spacing-lg`.
- Título de 2.2rem → **1.6rem**.
- **`.edp-meta-row` pasa a columna**: organizador y participantes se apilan.
- Padding de `.edp-status` y `.edp-action` reducidos.
- `.edp-action-advance` pasa a `justify-content: stretch`: **el botón de avance ocupa todo
  el ancho**.

Además `:1201-1220` lleva `.header-badges` a columna y `.stage-advance-btn` a `width:100%`.

El `EventTimeline` embebido tiene su **propio corte a 600px** donde oculta descripciones y
deadlines (`EventTimeline.css:239-259`).

> **CSS muerto verificado.** Los bloques `:616-628` (1024px), `:630-710` (768px) y `:712-759`
> (480px) apuntan a clases del layout anterior (`.event-title-row`, `.stats-grid`, `.tabs`,
> `.info-grid`, `.stat-card`, `.participant-card`) que **el JSX actual ya no usa** — ahora usa
> el prefijo `.edp-*`. Consecuencia real: **el bloque EDP actual no tiene reglas a 480px**,
> así que entre 480px y 0 no cambia nada respecto de 768px.

## Interacciones

- **Carga**: `fetchEventDetails()` al montar y ante cambio de `eventId` (`:40-43`), con
  chequeo de salud de la API antes (`:58`).
- **Registro** (`:115-131`): registra, marca como registrado, actualiza el contexto y
  refetchea. Sin sesión, el botón abre el modal de login (`:316`).
- **Selección de archivo**, validación client-side (`:133-141`):

| Regla | Umbral | Mensaje |
|---|---|---|
| Tamaño | `10 * 1024 * 1024` (10 MiB) | `File cannot exceed 10MB` |
| Tipo MIME | Lista blanca de 8 tipos | `File type not allowed. Use: JPEG, PNG, GIF, WebP, PDF, TXT, DOC, DOCX` |

  Reforzado en el input con `accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.doc,.docx"`.
  **Inconsistencia**: el error dice `10MB` (`:136`) y la línea de requisitos dice `Max 10 MB`
  (`:370`).

- **Subida**: el botón abre primero el modal de confirmación (`:358`); el modal ejecuta la
  subida (`:148-165`), muestra éxito, limpia el input y refetchea.
- **Avance de etapa**: abre `StageAdvanceModal` (`:291`) y al confirmar actualiza (`:92-107`).

> **Inconsistencia funcional entre pantallas:** acá el avance de etapa **no tiene ninguna
> validación previa**, mientras que `ManageEventPage` sí valida que haya participantes y que
> todos hayan votado (ver esa pantalla). La misma acción tiene reglas distintas según desde
> dónde se ejecute.

## Accesibilidad observada

- **Modales sin gestión de foco**: ninguno pone foco al abrir, atrapa el foco ni lo devuelve
  al cerrar.
- **Sin `role="dialog"` ni `aria-modal`** en ningún overlay.
- **Sin cierre por Escape**: `Modal.tsx` no tiene `onKeyDown`; `StageAdvanceModal` cierra
  solo por click en el overlay (`StageAdvanceModal.tsx:82`).
- El `<input type="file" id="attachment-file">` (`:338-339`) **no tiene `<label>` asociado**:
  el `<h3>📎 Upload File` no está vinculado.
- Banners de éxito y error (`:280-281`) **sin `role="alert"` ni `aria-live`**.
- El botón de quitar archivo tiene contenido `×` (`:353`) y solo `title`, sin `aria-label`:
  se leerá como símbolo de multiplicación.
- Emojis como portadores de significado (`⏸`, `✅`, `📎`, `📝`, `🔭`, `▶️`, `⏳`) sin
  `aria-hidden` ni alternativa textual.
- El único `aria-label` del árbol es el de `EventTimeline` (`EventTimeline.tsx:121`), que
  además pasa el `status` crudo (`'completed'|'active'|'pending'`): valor de máquina, no
  texto para personas.

## Observaciones

- El estado de éxito no se limpia solo: puede quedar visible indefinidamente.
- El estado offline es código inalcanzable.
- El wrapper tiene dos renders (`Loading...` y `Event not found`) sin estilos, ajenos al
  lenguaje visual del resto.
- Hay tres bloques completos de CSS responsive apuntando a un layout que ya no existe.
