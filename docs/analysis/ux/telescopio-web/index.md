# Relevamiento UX: telescopio-web

> **Esto es relevamiento, no documentación UX.** Describe la interfaz tal como está
> implementada hoy, leída del código. **No tiene audiencias, ni JTBD, ni rationale**: el
> código no los declara, y escribirlos acá sería inventarlos.
>
> `/product-consolidate-services` releva esos con el usuario y construye `docs/ux/` sobre
> esta base.

| | |
|---|---|
| **Servicio** | `telescopio-web` |
| **Path** | `web/` |
| **Plataforma** | **`web`** — React servido en navegador (`package.json`: `react-scripts`) |
| **Relevado** | 2026-09-18 |

---

## Stack de UI

| Concern | Implementación | Origen |
|---|---|---|
| Framework | React 19.1.1 | `package.json:10` |
| Routing | react-router-dom 7.9.4 | `package.json:13` |
| Build | Create React App (`react-scripts` 5.0.1) | `package.json:14` |
| Lenguaje | TypeScript 4.9.5, `strict: true` | `tsconfig.json` |
| Estilos | **CSS plano, un archivo por componente**. Sin Tailwind, sin CSS-in-JS, sin librería de UI | — |
| Estado | React Context (`AuthContext`) + `useState` local | `src/context/AuthContext.tsx` |
| Persistencia cliente | `localStorage` (`telescopio_user`, `telescopio_token`) | `AuthContext.tsx:9-10` |
| Data fetching | `fetch` nativo envuelto en `apiRequest` | `src/config/api.ts` |
| OAuth | `@react-oauth/google` 0.13.4 | `package.json:4` |
| Testing | Testing Library + Jest (CRA) | `package.json` |

**No hay librería de componentes.** Todo lo visual está construido a mano con CSS propio.
El lenguaje visual es oscuro con glassmorphism (fondo degradado fijo, superficies
translúcidas con borde claro).

---

## Breakpoints

**Todos son `max-width`**, es decir el CSS está escrito **desktop-first**: la regla base
describe el desktop y los `@media` van restando ancho.

| Valor | Ocurrencias | Dónde |
|---|---|---|
| `1024px` | 2 | `pages/event-detail/EventDetailPage.css:616`, `components/events/Events.css:181` |
| `768px` | 13 | El corte dominante — `App.css:105`, `index.css:654`, `styles/global.css:818`, y 10 más |
| `600px` | 3 | `components/event-timeline/EventTimeline.css:239`, `voting-configuration-panel/VotingConfigurationPanel.css:216`, `voting-results-panel/VotingResultsPanel.css:204` |
| `480px` | 6 | `styles/global.css:834`, `components/auth/Auth.css:275`, `components/modal/Modal.css:105`, `components/events/Events.css:275`, `components/participants/Participants.css:330`, `pages/event-detail/EventDetailPage.css:712` |

**No están declarados en ningún lado como escala.** No hay variables CSS de breakpoint ni
un archivo de configuración: cada `@media` repite el número literal. Los cuatro valores
salen de contar las queries, no de una definición.

Hay además dos `@media (prefers-color-scheme: light)` (`components/auth/Auth.css:290`,
`components/modal/Modal.css:113`), pero **solo en esos dos componentes**: el resto de la
aplicación no responde al tema claro.

### Viewports en uso

| Viewport | Corte | Evidencia |
|---|---|---|
| `desktop` | por encima de 768px | Es la regla base de todo el CSS |
| `mobile` | 768px y abajo | 13 de las 24 media queries de ancho |

**El corte real es `768px`.** Los otros tres son ajustes puntuales, no cambios de layout:
`1024px` aparece en 2 archivos, `600px` en 3 y `480px` en 6, casi siempre para reducir
padding o tipografía. Para la fundación de grilla del Design System, **768px es el único
switch estructural**.

---

## Design tokens

Definidos como variables CSS en `:root`, **en dos archivos distintos**:

| Archivo | Variables | Relación |
|---|---|---|
| `src/index.css:4-85` | 57 | Subconjunto |
| `src/styles/global.css:9+` | 79 | **Superconjunto: contiene las 57 de `index.css` con los mismos valores, más 22 propias** |

`index.css` importa `global.css` (`@import './styles/global.css'` en `index.css:95`), así
que las definiciones de `index.css` quedan pisadas o duplicadas según el orden. **Las 57
compartidas tienen valores idénticos**, así que hoy no produce diferencias visibles, pero
es una fuente de verdad duplicada.

### Paleta

| Token | Valor | Uso |
|---|---|---|
| `--color-primary` | `#6a5acd` | Violeta de marca |
| `--color-primary-hover` | `#7b68ee` | |
| `--color-primary-dark` | `#5a4ab3` | |
| `--color-primary-light` | `#9370db` | Solo en `global.css` |
| `--color-secondary` | `#3b82f6` | Azul |
| `--color-success` | `#22c55e` | |
| `--color-warning` | `#f59e0b` | |
| `--color-danger` | `#ef4444` | |
| `--color-info` | `#3b82f6` | Idéntico a `--color-secondary` |
| `--color-gray-50` … `--color-gray-900` | escala de 10 | Escala de grises tipo Tailwind |

### Fondo y superficies

| Token | Valor |
|---|---|
| `--bg-dark-primary` | `#1a1a3a` |
| `--bg-dark-secondary` | `#2d2d5a` |
| `--bg-dark-tertiary` | `#4a4a8a` |
| `--glass-bg` | `rgba(255, 255, 255, 0.05)` |
| `--glass-bg-hover` | `rgba(255, 255, 255, 0.1)` |
| `--glass-border` | `rgba(255, 255, 255, 0.1)` |
| `--glass-border-hover` | `rgba(255, 255, 255, 0.2)` |

El `body` usa `linear-gradient(135deg, …)` entre los tres fondos, con
`background-attachment: fixed` (`index.css:100-107`).

### Escalas

| Grupo | Tokens |
|---|---|
| Espaciado | `--spacing-xs` `0.25rem` · `sm` `0.5rem` · `md` `1rem` · `lg` `1.5rem` · `xl` `2rem` · `2xl` `3rem` · `3xl` (solo `global.css`) |
| Radio | `--radius-sm` `4px` · `md` `8px` · `lg` `12px` · `xl` `16px` · `2xl` `24px` · `full` `9999px` |
| Sombra | `--shadow-sm` … `--shadow-2xl`, más `--shadow-button` y `--shadow-button-hover` (solo `global.css`) |
| Transición | `--transition-fast` `150ms ease` · `base` `200ms ease` · `slow` `300ms ease` |
| Tipografía | `--font-family` (stack de sistema) · `--font-family-mono` |
| Tamaño de texto | `--text-xs` … `--text-3xl` — **solo en `global.css`** |
| Z-index | `--z-dropdown` · `--z-fixed` · `--z-modal` — **solo en `global.css`** |

### Adopción de tokens

| | Ocurrencias |
|---|---|
| Usos de `var(--…)` | 753 |
| Colores hex literales | 350 |

**Aproximadamente un tercio de los colores está hardcodeado.** Los más repetidos son
`#ffffff` (29), `#fca5a5` (13), `#e2e8f0` (12), `#94a3b8` (12), `#86efac` (11),
`#cbd5e1` (10). Varios de esos grises y pasteles **no tienen token equivalente**: son una
segunda paleta implícita, sobre todo para textos secundarios y estados de color suave.

Dato para el Design System: `#3b82f6` aparece 9 veces a mano pese a existir como
`--color-secondary` y `--color-info`.

---

## Inventario de rutas

Declaradas en `src/App.tsx:177-184`.

| Ruta | Componente | Acceso | Notas |
|---|---|---|---|
| `/` | `HomePage` (inline, `App.tsx:22-56`) | Público | Landing con tres secciones placeholder |
| `/events` | `EventsPage` → `Events` | Público | Listado de eventos |
| `/events/create` | `CreateEventPage` | **Sin guard de ruta** | |
| `/events/:eventId` | `EventDetailPageWrapper` → `EventDetailPage` | Público | Redirige al creador a `/manage` |
| `/events/:eventId/manage` | `ManageEventPage` | **Sin guard de ruta** | Vista del organizador |
| `/reset-password` | `ResetPasswordPage` | Público | Toma el token de la query |

**No hay componente de ruta protegida.** Ninguna ruta está envuelta en un guard: el
control de acceso se hace dentro de cada pantalla, o no se hace. `/events/create` y
`/events/:eventId/manage` son alcanzables por URL directa sin sesión.

**No hay ruta 404**: una URL desconocida renderiza el navbar y un área de contenido vacía.

### Redirección por rol

`EventDetailPageWrapper` (`App.tsx:70-119`) hace un fetch del evento al montar y, si
`event.creator_id === user.id`, redirige a `/events/{id}/manage` con `replace: true`.
Mientras resuelve muestra un `<p>Loading...</p>` con estilos inline (`App.tsx:110-116`).

Consecuencia: la misma URL lleva a dos pantallas distintas según quién mire, y el
participante ve un parpadeo de carga antes del contenido.

---

## Inventario de componentes

### Layout y navegación

| Componente | Archivo | Usos | Nota |
|---|---|---|---|
| Navbar | inline en `App.tsx:149-174` | 1 | No es un componente propio |
| `Modal` | `components/modal/Modal.tsx` | 4 | El overlay genérico |
| `LinkButton` | `components/link-button/LinkButton.tsx` | 1 | Solo en `Auth` |

### Autenticación

| Componente | Archivo | Nota |
|---|---|---|
| `Auth` | `components/auth/Auth.tsx` | Contenedor: alterna login/registro |
| `AuthForm` | `components/auth-form/AuthForm.tsx` | El formulario |
| `GoogleLoginButton` | `components/auth/GoogleLoginButton.tsx` | |
| `UsernameModal` | `components/auth/UsernameModal.tsx` | Completar nombre tras OAuth |
| `ForgotPasswordForm` | `components/auth/ForgotPasswordForm.tsx` | |

### Eventos y votación

| Componente | Archivo | Usado en |
|---|---|---|
| `Events` | `components/events/Events.tsx` | `/events` |
| `EventTimeline` | `components/event-timeline/EventTimeline.tsx` | `ManageEventPage:460` |
| `Participants` | `components/participants/Participants.tsx` | |
| `RankingVotePanel` | `components/ranking-vote-panel/RankingVotePanel.tsx` | `EventDetailPage` |
| `VotingConfigurationPanel` | `components/voting-configuration-panel/VotingConfigurationPanel.tsx` | `ManageEventPage:509`, `EventDetailPage` |
| `VotingResultsPanel` | `components/voting-results-panel/VotingResultsPanel.tsx` | 3 pantallas |
| `StageAdvanceModal` | `components/stage-advance-modal/StageAdvanceModal.tsx` | `ManageEventPage` |
| `ShareButton` | `components/ShareButton.tsx` | 2 |

### Candidatos a Design System

Por frecuencia de uso y por ser genéricos, no atados a un dominio:

1. **`Modal`** — 4 usos, ya es un contenedor genérico con su propio CSS.
2. **`LinkButton`** — botón con apariencia de link.
3. **Botones** — no existen como componente: hay clases `.btn`, `.btn-primary`, etc. en
   `styles/global.css`. Son un sistema de clases, no de componentes.
4. **Chips de estado de etapa** — el patrón visual se repite en varias pantallas con CSS
   duplicado por archivo, sin componente común.
5. **Tarjeta glass** — el patrón `--glass-bg` + `--glass-border` + `--radius-lg` se repite
   en casi todos los CSS. Es la superficie base de la aplicación y no está factorizado.

### Código muerto confirmado

Sin ninguna referencia fuera de su propio archivo:

| Archivo | Verificación |
|---|---|
| `components/api-status-auth/ApiStatusAuth.tsx` | Sin importaciones |
| `components/voting/Voting.tsx` | Sin importaciones |

> `components/event-detail/EventDetail.tsx` (+ ~800 líneas de CSS) y `VoteService` **fueron
> eliminados** en la sincronización de 2026-09-18. La pantalla de detalle que sí se usa es
> `pages/event-detail/EventDetailPage.tsx`.

`src/utils/testData.js` se importa dinámicamente solo cuando
`process.env.NODE_ENV === 'development'` (`App.tsx:15-17`).

---

## Integración con la API

Cliente en `src/config/api.ts`, servicios por dominio en `src/services/api.ts` (872 líneas):
`EventService`, `UserService`, `AttachmentService`, `VoteService`,
`DistributedVotingService`, `VoteDraftService`, `ApiHealthService`, `GoogleAuthService`.

- Base URL desde `REACT_APP_API_URL`, default `http://localhost:8080`.
- El JWT se lee de `localStorage` en cada request y va como `Authorization: Bearer`.
- **Manejo global de 401**: `apiRequest` limpia la sesión y emite un `CustomEvent`
  `auth:logout` que `AuthContext` escucha para desloguear sin recargar la página
  (`config/api.ts`, `AuthContext.tsx:81-95`).
- Los errores se normalizan a `new Error(errorData.error || errorData.message || ...)` —
  contempla las dos formas de error del backend, pero **descarta el `code`**, así que la
  UI no puede distinguir casos por código: solo tiene el texto.

### Endpoint no declarado

Falta el de descarga de attachments (`/api/v1/attachments/{id}/download`), que el backend sí
expone.

> Las constantes `EVENT_VOTE` y `EVENT_RESULTS`, que apuntaban a rutas inexistentes, **fueron
> eliminadas** junto con `VoteService` en la sincronización de 2026-09-18.

---

## Gaps detectados

Ordenados por impacto. Son observaciones del código, no juicios de diseño.

### Críticos — datos falsos presentados como reales

Estos cuatro salieron del relevamiento por pantalla y están verificados en el código. No son
detalles de UI: afectan la confianza en lo que el usuario ve.

**A. El fallback demo anula la validación del formulario de login.**
El `catch` externo de `AuthForm.handleSubmit` (`components/auth-form/AuthForm.tsx:132-152`)
crea un usuario ficticio y lo loguea con un token `"demo-token-" + Date.now()`. Como las
validaciones de `:42-57` se implementan con `throw`, **ese mismo `catch` las captura**:
enviar el formulario con el email vacío no muestra `Email is required`, **deja al usuario
logueado como usuario demo con email vacío**.

**B. `Participants` muestra tres personas inventadas cuando la API falla.**
El `catch` de `fetchParticipants` (`components/participants/Participants.tsx:24-56`) rellena
la lista con `María González`, `Carlos Rodríguez` y `Ana López`. La condición de render es
`!loading && participants.length > 0` (`:120`), **sin excluir `error`**: se muestran a la vez
el mensaje de error y los tres participantes falsos, con el mismo aspecto que los reales.

**C. `ManageEventPage` presenta fallos de API como ausencia de datos.**
Tres cargas secundarias fallan solo a consola: participantes (`:74-77`), adjuntos (`:92-96`)
y estadísticas de votación (`:116-120`). Si la API de participantes cae, la pantalla muestra
`No participants have registered yet.` **como si realmente no hubiera ninguno** — y el
organizador decide sobre esa base.

**D. El health check de `Auth` está hardcodeado en `true`.**
`Auth.tsx:30-36` hace `const isHealthy = true;`. El aviso
` API is not available, running in local mode.` es inalcanzable, y también lo es la rama
`else { throw new Error("API not available") }` de `AuthForm.tsx:129-131`.

### Alto impacto en uso real

**E. En mobile desaparecen las fechas límite.**
`EventTimeline.css:239-259` oculta `.etl-desc` y `.etl-deadline` por debajo de 600px. La
única otra forma de ver un deadline es la ficha de `ManageEventPage`, exclusiva del
organizador: **para un participante en un teléfono, la fecha límite es invisible**.

**F. La tabla de participantes queda ilegible en mobile.**
`ManageEventPage.css:424-429` activa `content: attr(data-label)` al apilar la tabla, pero
**el JSX nunca setea `data-label`** (verificado: aparece en ese CSS y en cero archivos
`.tsx`). Los cuatro valores quedan apilados sin etiqueta y son indistinguibles.

**G. El organizador queda en un loop de navegación.**
`ManageEventPage.handleBack` (`:298-300`) navega a `/events/{id}`, y
`EventDetailPageWrapper` redirige al creador de vuelta a `/manage` (`App.tsx:86-90`). Para el
organizador, `← Back to Event Details` rebota a la misma pantalla.

**H. La fecha del evento se genera sola y el usuario nunca la ve.**
`CreateEventPage.tsx:43-49` calcula `hoy + 1 día` y la envía como `date`. **No hay ningún
campo de fecha en el formulario.**

**I. La misma acción tiene reglas distintas según la pantalla.**
`ManageEventPage` valida antes de avanzar de etapa (que haya participantes, que todos hayan
votado, `:232-252`); `EventDetailPage` permite el mismo avance **sin ningún chequeo**.

**J. Copiar el enlace puede fallar sin ningún aviso.**
`ShareButton` usa `navigator.clipboard`, que **exige contexto seguro**; si falla, solo hace
`console.error` (`:47-50`) y el usuario no ve nada — ni siquiera el `Link copied!`.

### Estructurales

1. **Idioma: la interfaz está en inglés, con tres islas en español.** El microcopy visible
   al usuario es inglés de punta a punta (navbar, landing, formularios, mensajes de error).
   El español aparece solo en:
   - Las etiquetas de rol que se muestran en pantalla: `'Participante'`, `'Organizador'`,
     `'Administrador'` (`components/participants/Participants.tsx:67-70`). **Es el único
     texto en español que el usuario realmente lee.**
   - Un `aria-label`: `"Continuar con Google"` (`components/auth/GoogleLoginButton.tsx:29`),
     que solo escucha un lector de pantalla — inconsistente con el resto de la UI.
   - Datos mock (`'María González'`, `Participants.tsx:32`) y comentarios de código.

   No hay i18n: los textos están embebidos en el JSX. La mezcla no es una migración a
   medias generalizada, son tres puntos concretos.

2. **Sin rutas protegidas.** `/events/create` y `/events/:eventId/manage` son accesibles
   por URL sin sesión. No existe un componente guard.

3. **Sin ruta 404.** Una URL desconocida renderiza el navbar sobre contenido vacío.

4. **Landing sin contenido real.** Las tres secciones de `/` tienen texto placeholder
   ("This is the WHY section where we explain...").

5. **Navegación rota en el navbar.** "About" y "See Demo" apuntan ambos a `/`
   (`App.tsx:157-158`), no a las anclas `#why` / `#demo` que existen en la landing.

6. **Fuente de verdad duplicada en tokens.** Las 57 variables de `index.css` están
   repetidas en `global.css`, que además define 22 propias.

7. **Un tercio de los colores hardcodeado** (350 hex contra 753 usos de token), con una
   paleta implícita de grises y pasteles sin token equivalente.

8. **Tema claro a medias.** Solo `Auth.css` y `Modal.css` responden a
   `prefers-color-scheme: light`; el resto de la aplicación queda oscura.

9. **Código muerto**: `ApiStatusAuth.tsx` y `Voting.tsx` siguen sin referencias. Además, hay
   clases CSS referenciadas desde el JSX que no están definidas en ningún archivo
   (`UsernameModal`, `ForgotPasswordForm`), que se renderizan sin estilos.

10. **Sin biblioteca de componentes.** Patrones repetidos (tarjeta glass, chip de etapa,
    botones) viven como CSS duplicado por archivo.

11. **`console.log` de diagnóstico en producción.** `AuthContext` y `apiRequest` loguean
    estado de sesión y un preview del token en cada request (`config/api.ts`).

12. **Sin estado offline.** No se detectó manejo de pérdida de conectividad en ninguna
    pantalla.

---

## No determinable desde el código

- **Audiencias y sus objetivos.** El código distingue creador y participante por
  `creator_id`, pero no dice quiénes son ni qué buscan.
- **Por qué el CSS es desktop-first** ni cuál es el dispositivo prioritario real.
- **Si el idioma mezclado es transitorio** (una migración a medias) o deliberado.
- **Cuál es el recorrido esperado**: se puede inferir de las rutas, pero no está declarado.

---

## Pantallas relevadas

| Pantalla | Ruta | Documento |
|---|---|---|
| Home (landing) | `/` | [home.md](./screens/home.md) |
| Listado de eventos | `/events` | [events-list.md](./screens/events-list.md) |
| Crear evento | `/events/create` | [create-event.md](./screens/create-event.md) |
| Detalle del evento | `/events/:eventId` | [event-detail.md](./screens/event-detail.md) |
| Gestión del evento | `/events/:eventId/manage` | [manage-event.md](./screens/manage-event.md) |
| Definir nueva contraseña | `/reset-password` | [reset-password.md](./screens/reset-password.md) |

Los overlays y los paneles embebidos (modal genérico, login/registro, participantes, avance
de etapa, nombre de usuario, recuperación de contraseña, configuración de votación,
resultados, línea de tiempo y compartir) están en
[overlays-y-paneles.md](./screens/overlays-y-paneles.md).
