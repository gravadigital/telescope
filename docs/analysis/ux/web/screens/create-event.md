# Pantalla: Crear evento

| | |
|---|---|
| **Ruta** | `/events/create` |
| **Componente** | `src/pages/create-event/CreateEventPage.tsx` |
| **Acceso** | Exige sesión — pero **sin guard de ruta**: se controla dentro de la pantalla |
| **Viewports** | `desktop` (base) · `mobile` (≤768px) |

## Bloques

| # | Bloque | Origen | Contenido |
|---|---|---|---|
| 1 | Header de página | `:78-84` | Botón de retorno posicionado en absoluto a la izquierda, `<h1>` centrado y subtítulo |
| 2 | Alerta de error | `:86-90` | Banner rojo. Condicional a `error`. Margen inline hardcodeado |
| 3 | Sección "Identification" | `:96-158` | `<h3>` + tres campos (nombre, descripción, organizador), cada uno con label, control, marca de obligatorio y texto de ayuda |
| 4 | Sección "Configuration" | `:161-191` | `<h3>` + campo numérico con ayuda, más una caja informativa sobre los deadlines |
| 5 | Barra de acciones | `:193-213` | `Cancel` y submit sobre fondo gris, al pie del contenedor |

Cinco bloques. La división en dos secciones es explícita en el código (dos `.form-section`
con `<h3>` propio).

## Microcopy

Todo en inglés.

**Header** — `← Back to Events` (`:80`) · `Create Event` (`:82`) ·
`Fill in the details to set up a new event` (`:83`)

**Sección `Identification`** (`:97`)

| Elemento | Texto | Origen |
|---|---|---|
| Label | `Event name ` + `*` | `:100-102` |
| Placeholder | `e.g. Spring Photo Contest 2026` | `:111` |
| Ayuda | `A short, descriptive title that participants will see in the events list. Between 3 and 200 characters.` | `:115-117` |
| Label | `Description ` + `*` | `:121-123` |
| Placeholder | `Explain what the event is about, what participants are expected to submit, and how the judging works.` | `:131` |
| Ayuda | `Describe the event purpose, submission guidelines, and evaluation criteria.` + contador dinámico `{n}/2000 characters (minimum 10).` | `:136-137` |
| Label | `Organizer name` — sin asterisco | `:143` |
| Placeholder | `e.g. Photography Club, Science Dept.` | `:152` |
| Ayuda | `The person, team, or institution responsible for this event. Shown publicly on the event page. Optional.` | `:154-156` |

**Sección `Configuration`** (`:162`)

| Elemento | Texto | Origen |
|---|---|---|
| Label | `Maximum participants` — sin asterisco | `:166` |
| Ayuda | `How many people can register. Once this limit is reached, new registrations are blocked. Between 1 and 100. Default: 20.` | `:178-181` |
| Caja `ℹ️` | `Deadline dates for each stage (Participation, Voting) are set when you advance the event to that stage from the management panel.` | `:185-189` |

**Acciones** — `Cancel` (`:200`); submit `Create Event` en reposo y **`Creating…`** con
spinner mientras envía (`:208-210`).

> El submit usa la elipsis tipográfica `…`, mientras que el listado usa tres puntos
> (`Loading events...`). Inconsistencia menor de microcopy.

**Errores** (`:53-61`)

| Condición | Texto |
|---|---|
| Genérico | `Error creating event. Please try again.` |
| El error incluye `DUPLICATE_EVENT_NAME` | `An event with this name already exists. Please choose a different name.` |
| El error incluye `INVALID_PAYLOAD` | `Invalid form data. Please check all required fields.` |
| Otro | Se muestra `err.message` **crudo de la API** — texto no controlado por el frontend |

## Estados

| Estado | Presente | Detalle |
|---|---|---|
| Vacío | N/A | Es un formulario |
| **Cargando** | **Parcial** | Solo en el submit (`Creating…` + spinner, `:207-208`). **Los campos siguen editables durante el envío**: no tienen `disabled={creating}` |
| **Error** | **Sí** | Banner `.alert-danger` (`:86-90`) con los cuatro mensajes de arriba |
| **Éxito** | **No** | No hay mensaje. En el camino feliz navega directo a `/events/{id}` (`:51`) y la pantalla destino no recibe señal de "recién creado" |
| **Deshabilitado** | **Sí** | `Cancel`: `disabled={creating}` (`:198`). Submit: `disabled={creating \|\| !isFormValid}` (`:204`) |
| **Sin permiso** | **Sí, pero sin UI** | `useEffect` redirige a `/events` si no hay sesión (`:27-29`) y `if (!isAuthenticated) return null` (`:72`). **El usuario no ve ningún mensaje**: pantalla en blanco y redirección silenciosa |
| **Parcial** | **Parcial** | El contador `{n}/2000 characters (minimum 10)` (`:137`) da feedback continuo, pero **solo para descripción**. El campo `name` no tiene contador |
| **Offline** | **No** | Un fallo de red cae en `err.message` crudo |

> **El submit se deshabilita sin explicar por qué** (`:204`). Un usuario con un nombre de 2
> caracteres ve el botón gris sin saber el motivo: los umbrales solo aparecen en los textos
> de ayuda.

## Layout por viewport

**Desktop** (base)
- El botón de retorno flota en absoluto sobre el header (`CreateEventPage.css:24-26`).
- Los dos botones de acción van en fila.

**Mobile (≤768px)** (`CreateEventPage.css:244-280`)
- Padding de la página 20px→10px, del header 30px→20px.
- **El `.back-button` pasa de `position:absolute` a `static`** y se vuelve `inline-block`
  con margen inferior (`:253-257`): deja de flotar y se apila encima del título.
- `<h1>` de 2.5rem→2rem; padding del contenedor 40px→20px y de cada sección 30px→20px.
- `.form-actions` pasa a columna y los botones a `width: 100%` (`:271-279`), quedando
  `Cancel` **arriba** y `Create Event` abajo.

Sin reglas a 1024px, 600px ni 480px.

## Interacciones

- **Cambio de campo**: `handleChange` genérico (`:31-37`). Si `type === 'number'` hace
  `parseInt(value) || 1`: **vaciar "Maximum participants" lo convierte silenciosamente a 1**,
  no a 20 ni a vacío.
- **Submit** (`:39-66`).

> **Hallazgo de producto: la fecha del evento se genera sola.** Antes de llamar a la API, el
> código calcula `tomorrow` = hoy + 1 día y lo envía como `date` (`:43-49`). El comentario
> dice `// Generate tomorrow as the event date — backend requires a future date`.
> **No hay ningún campo de fecha en el formulario** (verificado: cero inputs de tipo fecha):
> el usuario nunca ve ni elige cuándo ocurre su evento. Los deadlines de cada etapa se piden
> después, al avanzar de etapa, que es lo que explica la caja informativa `ℹ️`.

**Validaciones** (`:68-70`), todas client-side y **solo como habilitación del botón**, sin
mensajes propios:

| Campo | Regla | Mensaje asociado |
|---|---|---|
| `name` | `trim().length >= 3 && length <= 200` | **Ninguno**. El umbral solo aparece en la ayuda (`:117`) |
| `description` | `trim().length >= 10 && length <= 2000` | **Ninguno**. Solo el contador `(minimum 10)` (`:137`) |

> Asimetría: el mínimo usa `.trim()` y el máximo usa `.length` sin trim (`:68-69`).

**Validación nativa en paralelo** — `required` en nombre y descripción (`:110`, `:130`);
`maxLength` 200 y 2000 (`:112`, `:133`); `min={1} max={100}` en participantes (`:175-176`).
**El `min`/`max` numérico no está reflejado en `isFormValid`**: se puede escribir 500 y el
botón sigue habilitado, quedando la validación al navegador y al backend.

**Navegación** — `Cancel` y `← Back to Events` van a `/events` (`:79`, `:196`); el éxito va a
`/events/{id}` (`:51`).

## Accesibilidad observada

**Es la mejor pantalla de la aplicación en este aspecto**: los cuatro campos tienen
`<label htmlFor>` correctamente asociado a un `id` coincidente (`:100/104`, `:121/126`,
`:142/146`, `:165/169`).

Ausencias:

- Los textos de ayuda (`<small className="form-help">`) **no están vinculados con
  `aria-describedby`**: un lector de pantalla no los anuncia al enfocar el campo.
- El banner de error **no tiene `role="alert"` ni `aria-live`**: al aparecer no se anuncia.
- El asterisco de obligatorio es un `<span>` visual sin alternativa textual (`:101`, `:122`);
  el `required` nativo es lo que comunica la obligatoriedad.
- El spinner (`:208`) es decorativo sin `aria-hidden`; el cambio de label a `Creating…` sí
  es correcto.
- El emoji `ℹ️` (`:185`) no tiene `aria-hidden`: será leído literalmente.
- Orden de foco coherente: el botón de retorno es el primero del DOM y visualmente el primero.

## Observaciones

- La autogeneración de la fecha es el hallazgo más relevante: hay un dato de negocio que el
  usuario no controla ni ve.
- Los campos quedan editables mientras se envía el formulario.
- El máximo de participantes se valida por HTML y backend, pero no por `isFormValid`.
