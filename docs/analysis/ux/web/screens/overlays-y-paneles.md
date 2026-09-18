# Overlays y paneles compartidos

Componentes que no son pantallas propias: overlays montados sobre una ruta, o paneles
embebidos que aportan la mayor parte del contenido de una pantalla.

> Relevamiento del código. Sin rationale: se reporta qué hace, nunca por qué.

---

## `Modal` — contenedor genérico

`components/modal/Modal.tsx:9-22`. Recibe `children` y un `onClose` opcional.

**Bloques** — overlay a pantalla completa que contiene una tarjeta con un botón `×` absoluto
arriba a la derecha y el contenido inyectado (`:11-19`).

**Microcopy** — solo `×` (`:15`).

**Estados** — ninguno propio. Solo la condicional `onClose &&` para mostrar el cierre (`:13`).

**Layout** — `.modal` con `width:90%` y `max-width:420px` (`Modal.css:36-37`): fluido por
construcción. A ≤768px, `index.css:654-663` y `global.css:818-832` lo llevan a
`max-width:100%` con margen.

> **CSS muerto:** las dos media queries propias de `Modal.css` (`:105-110` a 480px y
> `:113-120` para `prefers-color-scheme: light`) apuntan a `.auth-modal`, **una clase que no
> existe en ningún JSX del proyecto**.

**Interacciones** — solo el botón de cierre. **El click en el overlay no cierra**: `.overlay`
no tiene `onClick` (`:11`). Contrasta con `StageAdvanceModal` y `Participants`, que sí.

**Accesibilidad** — **el punto más débil de la aplicación, y afecta a todos los modales que
lo usan**: sin `role="dialog"`, sin `aria-modal`, sin `aria-labelledby`, sin foco inicial,
sin trampa de foco, sin devolución de foco al cerrar y sin cierre por Escape. El `×` no
tiene `aria-label` ni `title`. El contenido detrás del overlay sigue siendo alcanzable por
tabulación.

---

## `Auth` — login y registro

`components/auth/Auth.tsx`, montado en `App.tsx:186-190` dentro de `<Modal onClose>`.

**Bloques** (6) — header con título (`:96-98`); bloque de Google con botón y separador,
condicional a que exista el client id (`:100-112`); error de OAuth (`:114-116`); el
formulario `AuthForm` (`:122-131`); enlaces de cambio de contexto (`:132-144`); aviso de
demo al pie (`:148-153`).

Cuando `showForgotPassword`, los bloques 4 y 5 se reemplazan por `ForgotPasswordForm`. Cuando
el OAuth devuelve `new_user`, **todo el componente se reemplaza** por `UsernameModal`
(`:83-92`).

**Microcopy**

| Elemento | Texto | Origen |
|---|---|---|
| Título | `🔭 Login` / `🔭 Register` | `:97` |
| Botón Google | `Continue with Google` | `GoogleLoginButton.tsx:37` |
| Separador | `or continue with` | `:109` |
| Errores OAuth | `Failed to authenticate with Google` · `Could not connect to Google. Please try again.` | `:71`, `:79` |
| Enlace | `Forgot your password?` | `:135` |
| Alternancia | `Don't have an account? ` / `Already have an account? ` + `Register here` / `Login` | `:140-142` |
| Aviso | `💡 This is a demo project.` | `:150` |

> **Inconsistencia de idioma:** el botón de Google muestra `Continue with Google` en inglés
> pero su `aria-label` está **en español**: `"Continuar con Google"`
> (`GoogleLoginButton.tsx:29`). El texto visible y el accesible no coinciden.

> **Redacción confusa:** el separador `or continue with` aparece **después** del botón de
> Google, de modo que se lee "Continue with Google / or continue with / [formulario de
> email]". Sugiere que siguen más proveedores, pero lo que sigue es el formulario.

**`AuthForm`** (`components/auth-form/AuthForm.tsx`) — labels `Full name` (solo registro),
`Email`, `Password`; placeholders `Your full name`, `your@email.com`, y condicional
`At least 8 characters` en registro / `Your password` en login (`:196`); botón
`Processing...` / `🚀 Login` / `✨ Register`.

Errores: `Email is required` (`:43`) · `Password is required` (`:47`) ·
`Name is required for registration` (`:52`) · `Password must be at least 8 characters` (`:55`)
· `Authentication failed. Please try again.` (`:107`) ·
`This email is already registered. Please login instead.` (`:117`) ·
`Invalid email or password. Please try again.` (`:120`) ·
`Password must be at least 8 characters.` (`:122`)

> Los mensajes de `:55` y `:122` son el mismo texto con y sin punto final: dos variantes.

### Hallazgo grave — el fallback demo anula la validación del formulario

Verificado en `AuthForm.tsx:132-152`. El `catch` externo de `handleSubmit` **crea un usuario
local ficticio y lo loguea**, con un token `"demo-token-" + Date.now()`, cerrando el modal
como si la autenticación hubiera sido exitosa:

```tsx
} catch (err: any) {
  console.warn("Using demo authentication:", err);
  const demoUserData: User = {
    id: `user_${Date.now()}`,
    name: formData.name || formData.email.split("@")[0],
    email: formData.email, /* ... */
  };
  const demoToken = "demo-token-" + Date.now();
  login(demoUserData, demoToken);
```

Las validaciones de `:42-57` se implementan con `throw`, así que **ese mismo `catch` las
captura**. Consecuencia concreta: **si el usuario deja el email vacío y envía, en lugar de
ver `Email is required` queda logueado como usuario demo con email vacío.**

Los errores de la API no llegan acá (se manejan antes, en el catch interno con `return`,
`:126-127`), pero las validaciones locales sí. Es un bypass completo de la validación del
formulario.

### Estado offline: inalcanzable

El texto ` API is not available, running in local mode.` (`Auth.tsx:151`) depende de
`apiAvailable`, pero el `useEffect` lo setea **incondicionalmente a `true` con un literal
hardcodeado** (verificado en `Auth.tsx:30-36`):

```tsx
const checkApi = () => {
  const isHealthy = true;
  setApiAvailable(isHealthy);
};
```

El mensaje nunca se muestra. Por el mismo motivo, la rama
`else { throw new Error("API not available"); }` de `AuthForm.tsx:129-131` nunca se ejecuta.

**Estados** — cargando sí (`Processing...`, y el botón de Google deshabilitado mientras
verifica); error sí, por dos canales independientes; **éxito no** (cierra sin confirmación);
deshabilitado sí.

**Layout** — único corte a 480px (`Auth.css:275-287`): el `<h2>` baja a 1.5rem y se reducen
los paddings de inputs y del submit. Además `Auth.css:290-311` define el bloque
`prefers-color-scheme: light`, **el único soporte de tema claro del proyecto, y es parcial**.

**Validaciones** (`AuthForm.tsx:42-57`) — todas por `throw`, y **todas anuladas por el
fallback demo**: email vacío, password vacía, nombre vacío en registro, y password menor a
**8 caracteres** en registro. Nativas: `required` en los tres campos y **`minLength={8}` en
password en ambos modos** (`:198`), aunque la validación JS solo lo exige en registro.

**Efecto lateral** — si la API responde que el email ya existe, además del mensaje **cambia
el modo a login automáticamente** (`AuthForm.tsx:118`).

**Accesibilidad** — los tres campos tienen `<label htmlFor>` correctamente asociado. El SVG
de Google tiene `aria-hidden="true"` (`GoogleLoginButton.tsx:31`): **la única instancia
correcta de `aria-hidden` en todo el proyecto**. Faltan: `role="alert"` en los errores, foco
inicial, trampa de foco, Escape y `role="dialog"`. El `<p>` con `Don't have an account? `
está **fuera** del `LinkButton` que le sigue, así que `Register here` queda sin contexto para
quien navega por enlaces.

---

## `Participants`

`components/participants/Participants.tsx`. Overlay propio (`:86`), **no usa `Modal`**.
Invocado desde `EventDetailPage.tsx:258`.

**Bloques** (4) — header con título y cierre (`:88-91`); título del evento (`:93-95`); zona
de contenido que según el estado es carga, error con reintento, vacío o la lista con
contador y una tarjeta por participante (`:97-150`); footer con botón de cierre (`:152-156`).

**Microcopy** — `👥 Event Participants` (`:89`) · `Loading participants...` (`:101`) ·
`❌ {error}` (`:106`) · `🔄 Retry` (`:108`) · `🌌 No participants registered yet.` (`:115`) ·
`Be the first to join this astronomical event!` (`:116`) ·
`📊 {n} participant{s} registered` (`:123`, con pluralización) · `Close` (`:154`).

> **El único microcopy en español visible al usuario en toda la aplicación** está acá:
> `getRoleDisplayName` (`:65-73`) devuelve **`Participante`**, **`Organizador`** (para
> `organizer` y para `creator`) y **`Administrador`**, que se renderizan en el badge de cada
> participante (`:138`).

### Hallazgo grave — datos mock que se muestran como reales

Verificado en `Participants.tsx:24-56`. El `catch` de `fetchParticipants` no solo setea el
error: **además rellena la lista con tres participantes ficticios hardcodeados** —
`María González / maria@example.com`, `Carlos Rodríguez / carlos@example.com`,
`Ana López / ana@example.com`.

La condición de render de la lista es `!loading && participants.length > 0` (`:120`),
**sin excluir `error`**. Consecuencia: cuando la API falla **se muestran a la vez el mensaje
de error y los tres participantes falsos**, presentados igual que los reales. Los nombres son
españoles, a diferencia del resto del sistema.

**Estados** — cargando sí; error sí con reintento; vacío sí; el resto no.

**Layout**
- **≤768px** (`Participants.css:299-328`): el modal pierde su `max-width` y toma
  `margin: 0.5rem`; `.participant-card` pasa a columna y se centra; `.participant-info` a
  columna a ancho completo.
- **≤480px** (`:330-344`): padding del overlay a 0.5rem; el `<h2>` a 1.25rem; **avatar
  reducido a 40×40px**.

**Interacciones** — fetch al montar; `🔄 Retry` reejecuta; dos rutas de cierre (`×` del header
y `Close` del footer). **El click en el overlay no cierra** (`:86`).

**Accesibilidad** — sin `role="dialog"`, foco ni Escape; `×` sin `aria-label`; error sin
`role="alert"`; emojis sin `aria-hidden`. El avatar es un `<div>` con la inicial, no una
imagen, y el nombre completo está adyacente en el `<h4>`: redundante y aceptable.

---

## `StageAdvanceModal`

`components/stage-advance-modal/StageAdvanceModal.tsx`. Usado desde `EventDetailPage.tsx:425`
y `ManageEventPage.tsx:597`. **No usa `Modal`**: tiene overlay propio (`:82`).

**Bloques** (4) — header con título y cierre (`:84-87`); cuerpo con la descripción de la
etapa, la transición visual `actual → siguiente` con dos badges y el campo de fecha
condicional (`:89-118`); bloque de error (`:120-124`); footer con dos botones (`:127-142`).

**Microcopy** — `Advance to {Stage}?` (`:85`). Descripciones según etapa destino (`:68-79`):
`Participants will be able to register and upload their files.` ·
`Participants will be able to vote on submitted entries.` ·
`Voting will close and results will be visible.`
Label `📅 Estimated End Date for {Stage}` + `*` (`:103-104`); hint
`This date will be shown to participants so they know when this stage is expected to close.`
(`:106-108`). Errores `Please select an estimated end date` (`:52`) y
`Date cannot be in the past` (`:56`), prefijados con `⚠️ `. Botones `Cancel` y
`Updating...` / `Confirm`.

**Interacciones**
- **Fecha por defecto calculada**: hoy + 7 días si la etapa destino es `participation`,
  hoy + 3 días en cualquier otro caso (`:29-34`).
- `requiresDate` solo para `participation` y `voting` (`:40`): avanzar a `results` no pide
  fecha.
- Validaciones (`:45-66`): fecha vacía y fecha anterior a hoy (comparación de strings ISO),
  reforzado con `min={minDate}` en el input.
- **Los errores lanzados por el padre se capturan acá** (`:63-65`) y se muestran en el mismo
  bloque. Por eso las validaciones de negocio de `ManageEventPage` (como
  `Cannot advance: No participants registered yet.`) aparecen dentro de este modal.
- Cierre por `×`, por `Cancel` y **por click en el overlay** (`:82`), con `stopPropagation`
  en la tarjeta (`:83`).

**Layout** — sin media queries propias (214 líneas revisadas). `.stage-modal` usa
`width:90%; max-width:450px`: fluido.

**Accesibilidad** — `<label htmlFor="estimated-end-date">` correctamente asociado (`:102`,
`:111`). Faltan `role="dialog"`, foco inicial, trampa de foco, Escape, `role="alert"` en el
error y `aria-label` en el `×`.

---

## `UsernameModal`

`components/auth/UsernameModal.tsx`. Usa `Modal` (`:49`). Se renderiza **en lugar de** `Auth`
cuando el OAuth detecta un usuario nuevo.

**Bloques** (3) — header (`:50-52`); cuerpo con descripción, campo y error (`:53-69`); dos
botones apilados (`:70-79`).

**Microcopy** — `Choose a username` (`:51`) ·
`To complete your Google sign-up, choose a username.` (`:53-55`) · label `Username` (`:57`) ·
placeholder `Minimum 3 characters` (`:66`) · errores `This username is already taken` (`:39`)
y `An error occurred. Please try again.` (`:41`) · botones `Creating account...` / `Confirm`
y `Cancel`.

**Validación** — `isValid = /^[a-zA-Z0-9_ -]{3,}$/.test(username.trim())` (`:24`). Mínimo
**3 caracteres**, sin máximo, y solo ASCII, dígitos, guion bajo, espacio y guion.

> **No hay ningún mensaje que explique la restricción de caracteres.** Escribir `José` deja
> el botón deshabilitado sin decir por qué: la tilde no pasa el regex. El placeholder solo
> menciona la longitud.

El campo **viene prellenado** con el `suggestedName` de Google (`:19`).

> **Bug visual verificado:** las clases `.username-modal-description` (`:53`) y
> `.username-modal-cancel-btn` (`:77`) **no están definidas en ningún CSS del proyecto**. El
> párrafo de descripción y el botón `Cancel` se renderizan **sin estilos**, con la apariencia
> por defecto del navegador.

**Accesibilidad** — `<label htmlFor="username">` correctamente asociado. Sin `role="dialog"`,
sin foco inicial (el campo prellenado sería el candidato natural), sin Escape.

---

## `ForgotPasswordForm`

`components/auth/ForgotPasswordForm.tsx`. Reemplaza el formulario dentro del modal de `Auth`,
no es un overlay propio.

**Bloques** — dos estados excluyentes: el formulario (`:41-67`) con descripción, campo de
email, error, botón y enlace de retorno; y el estado enviado (`:28-39`) con la confirmación y
el mismo enlace.

**Microcopy** — `Enter your email and we'll send you a link to reset your password.` (`:43-45`)
· label `Email` · placeholder `your@email.com` · error
`Something went wrong. Please try again.` (`:22`) · botón `Sending...` / `Send reset link`
(`:59`) · `← Back to login` (`:35`, `:63`) · confirmación
`If that email is registered, you'll receive a reset link shortly.` (`:31-33`).

> La confirmación tiene **redacción neutra deliberada**: no revela si el email existe,
> coherente con el comportamiento anti-enumeración del backend.

**Estados** — cargando sí; error sí; **éxito sí, con render dedicado**. El botón **no se
deshabilita por email vacío**: solo lo impide el `required` nativo.

> Las clases `.forgot-password-sent`, `.forgot-password-sent-text`,
> `.forgot-password-description` y `.forgot-password-back` **no están definidas en ningún
> CSS**. Mismo problema que `UsernameModal`.

---

## `VotingConfigurationPanel`

`components/voting-configuration-panel/VotingConfigurationPanel.tsx`. **No es un modal**: es
un panel embebido en `EventDetailPage.tsx:388` y `ManageEventPage.tsx:509`.

**Bloques** (5) — encabezado (`:77-83`); resumen de tres tarjetas numéricas (`:85-98`); aviso
de requisitos no cumplidos (`:100-104`); formulario con un campo principal más un bloque
"avanzado" de cuatro campos (`:106-212`); error y botón de envío (`:214-222`).

**Microcopy** — `Start voting phase` (`:78`); subtítulo
`Each participant will be assigned a set of submissions to review and rank. The system distributes the workload automatically to avoid conflicts of interest.`
(`:79-82`); etiquetas del resumen `Submissions`, `Reviewers`, `Files per reviewer`; aviso
`⚠️ You need at least 2 submissions and 2 participants to start voting.` (`:102`).

Campos y sus hints:

| Campo | Hint |
|---|---|
| `Files per reviewer` | `How many submissions each participant will review. Recommended: {n} (max: {n}). Each participant only reviews files from others — never their own.` |
| `Minimum reviews per file` | `Each submission will be reviewed by at least this many participants. Default: 3.` |
| `Good reviewer threshold` | `Reviewers scoring above this (0–1) get a ranking bonus. Default: 0.6.` |
| `Poor reviewer threshold` | `Reviewers scoring below this (0–1) get a ranking penalty. Default: 0.3.` |
| `Quality adjustment strength` | `How many ranking positions a quality bonus/penalty moves a submission. Default: 3.` |

Botón `Setting up…` / `Start voting — assign reviewers` (`:221`).

> El mensaje de error de suficiencia (`:47-50`) cita `"Min reviews per file"` pero el label
> real dice `Minimum reviews per file` (`:137`): los textos no coinciden.

**Interacciones**
- **Valor recomendado calculado**:
  `recommendedM = min(max(ceil(2 * log2(max(totalAttachments, 2))), 1), maxPossibleM)` (`:25-28`).
  Es la misma fórmula de convergencia del backend.
- **Validación de suficiencia** antes de enviar (`:43-53`): si
  `totalParticipants * m < totalAttachments * min_evaluations`, bloquea con el mensaje
  compuesto.
- **Manejo de conflicto**: si la creación falla con `already exists` o `CONFIG_EXISTS`,
  **traga el error y continúa** a generar asignaciones (`:56-63`) — idempotencia deliberada.

> **Hallazgo:** `parseInt(e.target.value)` sin fallback (`:119`, `:145`, `:205`) — borrar el
> contenido de un campo produce `NaN` en el estado, y el resumen muestra `NaN`.

**Layout** — único corte a 600px (`VotingConfigurationPanel.css:216-224`): `.vcp-field-row`
pasa a columna (los dos umbrales dejan de estar lado a lado).

**Accesibilidad** — los cinco campos tienen `<label htmlFor>` correctamente asociado. Los
hints no están vinculados con `aria-describedby`. La clase `.vcp-advanced` (`:129`) sugiere un
acordeón pero **está siempre expandido**: no hay `<details>` ni toggle.

---

## `VotingResultsPanel`

`components/voting-results-panel/VotingResultsPanel.tsx`. Panel embebido en
`EventDetailPage.tsx:417` y `ManageEventPage.tsx:591`.

**Bloques** (4) — título (`:65`); estadísticas (`:67-78`); nota sobre calidad de reviewers
(`:80-87`); tabla de ranking de 3 columnas (`:89-118`).

**Microcopy** — `🏆 Final Results` (`:65`); etiquetas `Participation` y `Rankings submitted`;
la nota
`The ranking takes reviewer quality into account. Participants who ranked consistently with the rest of the group carry more weight in the final result. This makes the outcome fairer when some reviewers may have ranked carelessly or inconsistently.`
(`:83-86`); headers `Rank`, `File / Author`, `Score`; estados `Loading results…` (`:40`),
`Failed to load voting results: {msg}` (`:32`), `No results available yet.` (`:52`).

Las filas usan medallas `🥇`/`🥈`/`🥉` para los tres primeros y número a partir del cuarto
(`:61`, `:105`); el autor va prefijado con `by `; el score con `toFixed(3)`.

**Estados** — cargando, error y vacío sí, los tres con retorno temprano. El error **no tiene
botón de reintento**. Es una vista de solo lectura sin acciones.

> **Fallback silencioso:** usa `adjusted_ranking` si tiene elementos, si no `global_ranking`
> (`:57-59`), **sin indicarle al usuario cuál está viendo**. Son dos rankings distintos: uno
> con el ajuste por calidad de evaluador aplicado y otro sin él.

**Layout** — único corte a 600px (`VotingResultsPanel.css:204-210`): `.vrp-stats` pasa a
columna. Hay un comentario explícito en el CSS (`:209`):
`/* Score column visible on all sizes — only 3 columns total */`.

**Accesibilidad** — **es el único lugar de la aplicación que usa una `<table>` real** con
`<thead>`/`<th>`/`<tbody>` (`:90-117`). Pero los `<th>` no tienen `scope="col"`, no hay
`<caption>`, y **las medallas reemplazan el número de puesto**: para los tres primeros la
posición se comunica solo por emoji (un lector de pantalla dirá "medalla de oro" en vez de
"1").

---

## `EventTimeline`

`components/event-timeline/EventTimeline.tsx`. Organismo embebido, usado en
`EventDetailPage.tsx:263` y `ManageEventPage.tsx:460`. Tiene un prop `compact` (`:98`) que
**ningún caller usa**.

**Bloques** (2) — stepper horizontal de 4 pasos con conectores (`:112-144`), donde cada paso
lleva marcador, etiqueta, resumen, deadline con urgencia y badge `Current` si es el activo; y
la tarjeta de la etapa activa (`:147-166`) con icono, nombre, descripción larga y la fila
"Up next".

**Microcopy** — todo desde la constante `STAGES` (`:14-47`):

| Etapa | Label | Icono | Resumen |
|---|---|---|---|
| creation | `Creation` | `✦` | `Setup & configuration` |
| participation | `Participation` | `👥` | `Register & submit files` |
| voting | `Voting` | `🗳` | `Peer review & ranking` |
| results | `Results` | `🏆` | `Final rankings revealed` |

La descripción de `voting` (`:37`) es el texto más largo de la aplicación y **es donde se le
explica al participante cómo funciona el algoritmo**: que recibe un subconjunto y no todas
las propuestas, que los evaluadores consistentes con el grupo pesan más, y que quien
califica al azar ve reducido su peso automáticamente.

**Formato de deadline** (`:62-74`) — `{fecha} (closed)` · `{fecha} — closes today` ·
`{fecha} — closes tomorrow` · `{fecha} — {n} days left`.

**Estados** — **ninguno de los 8**. Es puramente presentacional: sin fetch, sin error, sin
carga.

### Layout: el cambio responsive más significativo del producto

Único corte, a **600px** (`EventTimeline.css:239-259`):

- **`.etl-desc` y `.etl-deadline` se ocultan** (`display:none`, `:240-243`). En pantallas
  menores a 600px **los resúmenes de cada etapa y, sobre todo, las fechas límite desaparecen
  por completo del stepper**.
- **`.etl-stage-card-next-hint` también se oculta** (`:258`): la frase que explica qué pasa
  después desaparece, dejando solo `Up next 🗳 Voting`.
- `.etl-label` baja a 0.7rem; `.etl-marker` a 38×38px.

> **Consecuencia concreta:** la única forma de ver un deadline en mobile es la ficha de
> `ManageEventPage`, que es exclusiva del organizador. **Para un participante en un teléfono,
> la fecha límite es invisible.**

**Accesibilidad** — el `aria-label={status}` del marcador (`:121`) es el **único `aria-label`
funcional de la aplicación**, pero pasa el valor crudo del enum (`completed`/`active`/
`pending`): texto de máquina, sin contexto. Sin `role="list"`, sin `<ol>` y sin
`aria-current="step"`: el stepper es una secuencia de `<div>` que no se comunica como
progresión ordenada.

---

## `ShareButton`

`components/ShareButton.tsx`. Renderiza un botón inline y, al abrirse, un menú **vía
`ReactDOM.createPortal` a `document.body`** (`:115-167`). Usado en `EventDetailPage.tsx:235`.

**Bloques** (3) — botón disparador (`:110-113`); overlay de cierre y menú con header
(`:117-122`); cuerpo con seis opciones y la ficha de previsualización del enlace (`:124-163`).

**Microcopy** — `🔗 Share Event` (`:111-112`); `Share this event` (`:120`); opciones
`Link copied!` / `Copy link` (alterna tras copiar, `:128`), `Share on Twitter/X`,
`Share on Facebook`, `Share on LinkedIn`, `Share on WhatsApp`, `Share via Email`;
`Link to share:` (`:160`).

**Estados** — **éxito sí, efímero**: `Link copied!` durante 2000 ms (`:45-46`).
**Error: no.**

> **Doble fallo silencioso.** El fallo de `getShareableEventInfo` se traga en el `catch` y se
> sustituye por datos construidos localmente (`:24-32`), sin avisar. Y el fallo de
> `navigator.clipboard.writeText` solo hace `console.error` (`:47-50`): **si copiar falla, el
> usuario no ve absolutamente nada**, ni siquiera el "Link copied!", que solo se setea en el
> `try`.
>
> Importa porque `navigator.clipboard` **requiere contexto seguro** (HTTPS o localhost): en
> HTTP plano la copia falla en silencio.

**Interacciones** — las cuatro redes abren `window.open` con `'_blank'` y dimensiones fijas
`550×420`, salvo WhatsApp que abre sin dimensiones. El email usa
`window.location.href = 'mailto:...'` (`:105`), que **navega la propia pestaña**. Cierre por
`×` y por click en el overlay; sin Escape.

**Layout** — único corte a 768px (`ShareButton.css:227-248`): el menú pasa a `min-width: 90vw`
y se reducen los paddings.

**Accesibilidad** — sin `role="dialog"`, foco ni Escape; el `×` sin `aria-label`; las opciones
son `<button>` en un `<div>` sin `role="menu"`; **el cambio a `Link copied!` no se anuncia**
(sin `aria-live`), así que un usuario de lector de pantalla no recibe confirmación de la
copia; el carácter `𝕏` (`:133`) es un símbolo matemático Unicode que se verbaliza de forma
impredecible.
