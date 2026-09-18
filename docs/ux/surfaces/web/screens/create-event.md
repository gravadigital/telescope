---
name: create-event
surface: web
route: "/events/create"
viewports: [desktop, mobile]
audiences: [organizador]
fidelity: mid
status: as-is-sin-validar
version: "1.0"
date: 2026-09-18
---

# Crear evento

## Identidad

- **Audiencia primaria:** organizador
- **JTBD:** JTBD-01 — abrir una convocatoria y hacer que llegue a quien tiene que llegar
- **Viewports:** `desktop` (base), `mobile` (≤768px)
- **Acceso:** exige sesión — pero **sin guard de ruta**: se controla dentro de la pantalla

> **Transcripta del código existente** (`docs/analysis/ux/web/screens/create-event.md`).
> `status: as-is-sin-validar`.

## Entrada y salida

**Se llega desde:** el botón `Create Event` del listado, o por URL directa.

**Se sale hacia:** `/events/{id}` en el camino feliz (que redirige de inmediato a `/manage`, por
ser el creador), o `/events` por `Cancel` y `← Back to Events`.

## Estructura

| Bloque | Tipo | Contenido |
|---|---|---|
| Header de página | encabezado | Botón de retorno posicionado en absoluto a la izquierda, `<h1>` centrado, subtítulo |
| Alerta de error | banner | Condicional a `error`. Margen inline hardcodeado |
| Sección "Identification" | grupo de campos | `<h3>` + tres campos (nombre, descripción, organizador), cada uno con label, control, marca de obligatorio y texto de ayuda |
| Sección "Configuration" | grupo de campos | `<h3>` + campo numérico con ayuda + caja informativa sobre los deadlines |
| Barra de acciones | acciones | `Cancel` y submit sobre fondo gris, al pie |

La división en dos secciones es explícita en el código: dos `.form-section` con `<h3>` propio.

**Origen:** `web/src/pages/create-event/CreateEventPage.tsx:78-213`.

## Layout por viewport

**desktop** (base)
- El botón de retorno flota en `position: absolute` sobre el header.
- Los dos botones de acción van en fila.

**mobile** (≤768px, `CreateEventPage.css:244-280`)
- Padding de la página 20px→10px, del header 30px→20px.
- **El `.back-button` pasa de `position:absolute` a `static`** y se vuelve `inline-block` con
  margen inferior: deja de flotar y se apila encima del título.
- `<h1>` de 2.5rem→2rem; padding del contenedor 40px→20px, de cada sección 30px→20px.
- `.form-actions` pasa a columna y los botones a `width: 100%`, quedando **`Cancel` arriba** y
  `Create Event` abajo.

Sin reglas a 1024px, 600px ni 480px.

## Contenido

Microcopy transcripto **textual**, en inglés.

### Header
- Botón: `← Back to Events`
- Título: `Create Event`
- Subtítulo: `Fill in the details to set up a new event`

### Sección `Identification`
| Campo | Texto |
|---|---|
| Label | `Event name *` |
| Placeholder | `e.g. Spring Photo Contest 2026` |
| Ayuda | `A short, descriptive title that participants will see in the events list. Between 3 and 200 characters.` |
| Label | `Description *` |
| Placeholder | `Explain what the event is about, what participants are expected to submit, and how the judging works.` |
| Ayuda | `Describe the event purpose, submission guidelines, and evaluation criteria.` + contador dinámico `{n}/2000 characters (minimum 10).` |
| Label | `Organizer name` — sin asterisco |
| Placeholder | `e.g. Photography Club, Science Dept.` |
| Ayuda | `The person, team, or institution responsible for this event. Shown publicly on the event page. Optional.` |

### Sección `Configuration`
| Campo | Texto |
|---|---|
| Label | `Maximum participants` — sin asterisco |
| Ayuda | `How many people can register. Once this limit is reached, new registrations are blocked. Between 1 and 100. Default: 20.` |
| Caja `ℹ️` | `Deadline dates for each stage (Participation, Voting) are set when you advance the event to that stage from the management panel.` |

### Acciones
- `Cancel`
- Submit: `Create Event` (reposo) · **`Creating…`** con spinner (enviando)

> El submit usa la elipsis tipográfica `…` mientras el listado usa tres puntos. Inconsistencia
> menor de microcopy.

### Errores
| Condición | Texto |
|---|---|
| Genérico | `Error creating event. Please try again.` |
| Incluye `DUPLICATE_EVENT_NAME` | `An event with this name already exists. Please choose a different name.` |
| Incluye `INVALID_PAYLOAD` | `Invalid form data. Please check all required fields.` |
| Otro | `err.message` **crudo de la API** — texto no controlado por el frontend |

## Estados

| Estado | Aplica | Detalle |
|---|---|---|
| Vacío | **No** — no aplica | Es un formulario |
| Cargando | **Parcial** | Solo en el submit (`Creating…` + spinner). ⚠️ **Los campos siguen editables durante el envío**: no tienen `disabled={creating}` |
| Error | **Sí** | Banner `.alert-danger` con los cuatro mensajes |
| Éxito | **No** — no implementado | Navega directo a `/events/{id}` sin señal de "recién creado" |
| Deshabilitado | **Sí** | `Cancel`: `disabled={creating}`. Submit: `disabled={creating \|\| !isFormValid}` |
| Sin permiso | **Sí, pero sin UI** | ⚠️ `useEffect` redirige a `/events` sin sesión y `if (!isAuthenticated) return null`. **El usuario no ve ningún mensaje**: pantalla en blanco y redirección silenciosa |
| Parcial | **Parcial** | El contador `{n}/2000 characters (minimum 10)` da feedback continuo, **pero solo para descripción**. El campo `name` no tiene contador |
| Offline | **No** — no implementado | Un fallo de red cae en `err.message` crudo |

> ⚠️ **El submit se deshabilita sin explicar por qué.** Un usuario con un nombre de 2 caracteres ve
> el botón gris sin saber el motivo: los umbrales solo aparecen en los textos de ayuda.

## Interacciones

- **Cambio de campo:** handler genérico. ⚠️ Si `type === 'number'` hace `parseInt(value) || 1`:
  **vaciar "Maximum participants" lo convierte silenciosamente a 1**, no a 20 ni a vacío.
- **Validaciones** (solo como habilitación del botón, sin mensajes propios):

| Campo | Regla | Mensaje |
|---|---|---|
| `name` | `trim().length >= 3 && length <= 200` | **Ninguno** |
| `description` | `trim().length >= 10 && length <= 2000` | **Ninguno** (solo el contador) |

  Asimetría: el mínimo usa `.trim()` y el máximo `.length` sin trim.

- **Validación nativa en paralelo:** `required` en nombre y descripción; `maxLength` 200 y 2000;
  `min={1} max={100}` en participantes. ⚠️ **El `min`/`max` numérico no está en `isFormValid`**: se
  puede escribir 500 y el botón sigue habilitado.

> ⚠️ **La fecha del evento se genera sola.** Antes de llamar a la API, el código calcula
> `tomorrow` = hoy + 1 día y lo envía como `date`. **No hay ningún campo de fecha en el
> formulario:** el usuario nunca ve ni elige cuándo ocurre su evento.

## Accesibilidad

**Es la mejor pantalla del producto en este aspecto:** los cuatro campos tienen `<label htmlFor>`
correctamente asociado a un `id` coincidente.

Ausencias:
- ⚠️ Los textos de ayuda (`<small className="form-help">`) **no están vinculados con
  `aria-describedby`**: un lector de pantalla no los anuncia al enfocar el campo.
- ⚠️ El banner de error no tiene `role="alert"` ni `aria-live`.
- ⚠️ El asterisco de obligatorio es un `<span>` visual sin alternativa textual; el `required`
  nativo es lo que comunica la obligatoriedad.
- ⚠️ El emoji `ℹ️` no tiene `aria-hidden`: será leído literalmente.
- ✅ El spinner cambia el label a `Creating…`, que sí es correcto.
- ✅ Orden de foco coherente: el botón de retorno es el primero del DOM y visualmente el primero.

## Decisiones y descartes

- Pantalla documentada desde el código existente `[fuente: código-existente]`. No hay registro del
  rationale original; las decisiones se van a documentar cuando la pantalla se modifique.
