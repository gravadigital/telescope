---
name: event-detail
surface: web
route: "/events/:eventId"
viewports: [desktop, mobile]
audiences: [participante]
fidelity: mid
status: as-is-sin-validar
version: "1.0"
date: 2026-09-18
---

# Detalle del evento (vista del participante)

## Identidad

- **Audiencia primaria:** participante
- **JTBD:** JTBD-01 (entregar), JTBD-02 (evaluar) y JTBD-03 (ver resultados). **Las tres pasan por
  esta pantalla**
- **Viewports:** `desktop` (base), `mobile` (≤768px)
- **Acceso:** público. Las acciones exigen sesión y registro

> **El creador del evento nunca ve esta pantalla.** `EventDetailPageWrapper` hace un fetch propio y,
> si `event.creator_id === user.id`, redirige a `/events/:id/manage` con `replace: true`.

> **Transcripta del código existente** (`docs/analysis/ux/web/screens/event-detail.md`).
> `status: as-is-sin-validar`.

## Entrada y salida

**Se llega desde:** el link compartible del evento, el botón contextual del listado, o por URL.

**Se sale hacia:** `/events` por `← Back to Events`. El organizador es redirigido a `/manage` antes
de ver nada.

## Estructura

Estados excluyentes previos (retornos tempranos):

| Bloque | Tipo | Contenido |
|---|---|---|
| Carga del wrapper | estado excluyente | `<p>Loading...</p>` con **estilos inline**. No usa las clases de carga del resto de la app |
| Evento sin id | estado excluyente | `<div>Event not found</div>` **sin estilo ni layout** |
| Carga de la página | estado excluyente | Spinner + título |
| Fallo de carga | estado excluyente | Botón de retorno + tarjeta de error con dos vías de recuperación |

Estado normal:

| Bloque | Tipo | Contenido |
|---|---|---|
| Barra de navegación | navegación | `<nav>` con el botón de volver |
| Presentación del evento | encabezado | Título y `ShareButton` en la misma fila; descripción; fila de metadatos con organizador y contador de participantes con su toggle |
| Modal de participantes | overlay | Condicional |
| Estado del evento | panel | `EventTimeline` (stepper de 4 pasos + tarjeta de la etapa activa) y, condicional, el aviso de pausa |
| Mensajes de feedback | banners | Dos condicionales: éxito y error |
| **Zona de acción de la etapa** | contenedor variable | **Un único contenedor cuyo contenido cambia por completo según etapa y rol.** Ver abajo |
| Modal de avance de etapa | overlay | Condicional |
| Modal de confirmación de subida | overlay | Ficha del archivo + dos botones |

**La zona de acción es deliberadamente un solo bloque:** el código la estructura como una única
`<section className="edp-action">` con `min-height: 80px`, y su contenido es mutuamente excluyente.
Puede mostrar: el botón de avance del organizador, el aviso de evento en preparación, el bloque de
participación (registro o carga con preview), el panel de configuración de votación, el aviso de
votación en curso, el panel de ranking o el panel de resultados.

**Origen:** `web/src/pages/event-detail/EventDetailPage.tsx:226-450`, `App.tsx:70-119`.

## Layout por viewport

**desktop** (base)
- Presentación con título y botón de compartir en fila; metadatos en fila.
- La zona de acción ocupa el ancho del contenedor.

**mobile** (≤768px, `EventDetailPage.css:1443-1472`)
- Padding de `.edp-presentation` a `--spacing-lg`.
- Título de 2.2rem → **1.6rem**.
- **`.edp-meta-row` pasa a columna**: organizador y participantes se apilan.
- Padding de `.edp-status` y `.edp-action` reducidos.
- `.edp-action-advance` pasa a `justify-content: stretch`: **el botón de avance ocupa todo el
  ancho**.
- `.header-badges` a columna; `.stage-advance-btn` a `width:100%`.

El `EventTimeline` embebido tiene su **propio corte a 600px**, donde **oculta descripciones y
deadlines** (`EventTimeline.css:239-259`).

> ⚠️ **CSS muerto verificado.** Los bloques a 1024px, 768px (`:630-710`) y 480px apuntan a clases
> del layout anterior (`.event-title-row`, `.stats-grid`, `.tabs`, `.info-grid`, `.stat-card`,
> `.participant-card`) que **el JSX actual ya no usa** — ahora usa el prefijo `.edp-*`.
> **Consecuencia real: el bloque EDP actual no tiene reglas a 480px**, así que entre 480px y 0 no
> cambia nada respecto de 768px.

## Contenido

Microcopy transcripto **textual**, en inglés.

### Estados de carga y error
- Wrapper: `Event not found` · `Loading...`
- Carga: `Loading event details...`
- Error: `← Back to Events`; `⚠️ Unable to Load Event`; el mensaje de `error` o el literal
  `Event not found`; botones `← Back to Events List` y `🔄 Try Again`
- Mensajes de `error` posibles: `Unable to connect to the server. Using cached data if available.` ·
  `Event with ID "{eventId}" was not found.` · `Failed to load event details: {mensaje}.`

### Presentación
- Organizador dinámico con fallback literal `Not specified`
- Contador: `{n} / {max} participants`
- Toggle: `Hide` / `View`

### Estado
- `This event is currently paused` con icono `⏸`

### Feedback de éxito (cinco mensajes)
- `Stage updated to: {etapa}`
- `Successfully registered! You can now upload your file.`
- `File uploaded successfully!`
- `✅ Voting configuration completed! Participants can now submit their rankings.`
- `✅ Your rankings have been submitted successfully!`

### Feedback de error
`Error updating event stage` · `Failed to register for the event. Please try again.` ·
`File cannot exceed 10MB` ·
`File type not allowed. Use: JPEG, PNG, GIF, WebP, PDF, TXT, DOC, DOCX` · `Upload failed: {msg}`

### Zona de acción, según etapa y rol
| Situación | Textos |
|---|---|
| Organizador | `⏳ Updating...` o `▶️ Advance to {Stage}` |
| `creation`, no organizador | `🔭` + `This event is being set up. Come back when it opens for participation.` |
| `participation`, no registrado | `📝 Event Participation`; `Register to participate and upload your file.`; botón `Registering...` / `Participate` |
| Ya subió archivo | `✅` + `Submission received` + `You've already uploaded your file. Only one submission is allowed per participant.` |
| Puede subir | Badge `✅ Registered` + `Upload your submission for this event.`; botón `Uploading...` / `Upload File`; botón `×` con `title="Remove selected file"` |
| Requisitos | `Accepted: JPEG, PNG, GIF, WebP, PDF, TXT, DOC, DOCX · Max 10 MB` |
| Evento pausado | `⏸ Registration and file submissions are not available while the event is paused.` |
| Votación configurada | `✅ Voting is underway`; `Reviewers have been assigned their submissions and can now submit their rankings.`; `Once everyone has voted, advance to "Results" to publish the final ranking.` |

### Modal de confirmación de subida
`Confirm upload`; `Are you sure you want to upload this file?`; nombre y tamaño dinámicos;
`Cancel` y `Upload`.

### Nombres de etapa
`Creation` · `Participation` · `Voting` · **`Results`** (acá sí `Results`, a diferencia de
`Completed` en el listado).

## Estados

| Estado | Aplica | Detalle |
|---|---|---|
| Vacío | **Parcial** | El único propio es el de etapa `creation` para no-organizadores. Los paneles hijos traen los suyos |
| Cargando | **Sí, múltiple** | Página bloqueante, wrapper, y por botón: `Registering...`, `Uploading...`, `⏳ Updating...` |
| Error | **Sí, doble vía** | Pantalla completa cuando `!event`, y banner inline para errores de acción |
| Éxito | **Sí** | Banner con cinco mensajes. ⚠️ **Nunca se limpia por tiempo ni al navegar**: queda hasta el próximo cambio de estado |
| Deshabilitado | **Sí** | Avance, participar, input de archivo, subir |
| Sin permiso | **Implícito** | ⚠️ No hay mensaje: se expresa como **ausencia de bloques**. `canUploadAttachment` exige etapa `participation`, sesión, estar registrado, no haber subido, no ser el creador y que el evento no esté pausado |
| Parcial | **Sí** | `✅ You have already submitted your file...`. ⚠️ El chequeo **solo corre si la etapa es `participation`**: en otras etapas el flag conserva su valor previo |
| Offline | **Inalcanzable** | ⚠️ Si el health check falla se setea el aviso, **pero si `getEventById` tiene éxito hace `setError('')`** y el aviso desaparece. En la práctica no se ve nunca |

## Interacciones

- **Carga:** `fetchEventDetails()` al montar y ante cambio de `eventId`, con chequeo de salud antes.
- **Registro:** registra, marca como registrado, actualiza el contexto y refetchea. Sin sesión, el
  botón abre el modal de login.
- **Selección de archivo**, validación client-side:

| Regla | Umbral | Mensaje |
|---|---|---|
| Tamaño | 10 MiB | `File cannot exceed 10MB` |
| Tipo MIME | Whitelist de 8 tipos | `File type not allowed. Use: ...` |

  ⚠️ **Inconsistencia:** el error dice `10MB` y la línea de requisitos dice `Max 10 MB`.

- **Subida:** abre primero el modal de confirmación; el modal ejecuta la subida, muestra éxito,
  limpia el input y refetchea.
- **Avance de etapa:** abre `StageAdvanceModal` y al confirmar actualiza.

> ⚠️ **Inconsistencia funcional entre pantallas:** acá el avance de etapa **no tiene ninguna
> validación previa**, mientras que `ManageEventPage` sí valida que haya participantes y que todos
> hayan votado. La misma acción tiene reglas distintas según desde dónde se ejecute.

## Accesibilidad

**Observado en el código:**
- ⚠️ **Modales sin gestión de foco**: ninguno pone foco al abrir, atrapa el foco ni lo devuelve al
  cerrar.
- ⚠️ **Sin `role="dialog"` ni `aria-modal`** en ningún overlay.
- ⚠️ **Sin cierre por Escape**: `Modal.tsx` no tiene `onKeyDown`; `StageAdvanceModal` cierra solo
  por click en el overlay.
- ⚠️ El `<input type="file" id="attachment-file">` **no tiene `<label>` asociado**.
- ⚠️ Banners de éxito y error **sin `role="alert"` ni `aria-live`**.
- ⚠️ El botón de quitar archivo tiene contenido `×` y solo `title`, sin `aria-label`: se leerá como
  símbolo de multiplicación.
- ⚠️ Emojis portadores de significado (`⏸`, `✅`, `📎`, `📝`, `🔭`, `▶️`, `⏳`) sin `aria-hidden` ni
  alternativa textual.
- ⚠️ El único `aria-label` del árbol es el de `EventTimeline`, que además pasa el `status` crudo
  (`'completed'|'active'|'pending'`): valor de máquina, no texto para personas.

## Decisiones y descartes

- Pantalla documentada desde el código existente `[fuente: código-existente]`. No hay registro del
  rationale original; las decisiones se van a documentar cuando la pantalla se modifique.
