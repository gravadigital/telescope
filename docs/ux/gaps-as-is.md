---
document: Gaps as-is
version: "1.0"
date: 2026-09-18
status: relevado-desde-código
superficies: [web]
---

# Gaps de la interfaz actual

> **Este documento es el contrapeso de haber marcado el as-is como spec.** Las pantallas de
> `docs/ux/surfaces/web/screens/` documentan lo que existe **y son ahora la línea de
> base**. Sin esta lista, esa transcripción convertiría los defectos en "el diseño".
>
> **Las filas describen el gap, no la solución.** La columna Acción es una *categoría* de
> respuesta, nunca una propuesta de diseño: decidir qué hacer es trabajo de producto y de UX, no
> de esta transcripción.

---

## Resumen

**42 gaps en 6 pantallas + 12 transversales.**

| Categoría | Alta | Media | Baja | Total |
|---|---|---|---|---|
| Datos falsos o engañosos | 4 | 0 | 0 | **4** |
| Estado ausente | 3 | 7 | 2 | 12 |
| Accesibilidad | 2 | 9 | 3 | 14 |
| Responsive | 2 | 1 | 0 | 3 |
| Navegación | 2 | 2 | 0 | 4 |
| Contenido / microcopy | 1 | 3 | 2 | 6 |
| Deuda interna | 0 | 2 | 9 | 11 |
| **Total** | **14** | **24** | **16** | **54** |

**Los tres más frecuentes:**
1. **Ningún overlay es accesible** — ninguno de los 8 tiene `role="dialog"`, gestión de foco ni
   cierre por Escape.
2. **Los fallos de API se presentan como datos** — 4 lugares distintos donde un `catch` fabrica
   contenido o silencia el error.
3. **Falta confirmación de éxito** — la pantalla central del organizador no confirma **ninguna** de
   sus tres acciones críticas.

---

## Criterio de severidad

| Severidad | Criterio |
|---|---|
| **Alta** | El usuario queda sin salida, o **toma decisiones sobre información falsa** |
| **Media** | El usuario se confunde o pierde tiempo, pero puede seguir |
| **Baja** | Deuda interna sin impacto directo en el usuario |

---

## Gaps críticos: datos falsos presentados como reales

**Se listan aparte porque no son defectos de interfaz: son defectos de integridad.** Cada uno hace
que el usuario vea como cierto algo que el sistema inventó.

| Pantalla | Gap | Severidad | Acción | Evidencia |
|---|---|---|---|---|
| (login, overlay) | El `catch` externo crea un usuario ficticio con token `demo-token-{ts}` y lo loguea. Como las validaciones usan `throw`, **ese mismo catch las captura**: enviar con email vacío deja al usuario logueado en vez de mostrar el error | **alta** | story | `AuthForm.tsx:132-152` |
| manage-event | `Participants` rellena la lista con **tres personas inventadas** cuando la API falla. La condición de render no excluye `error`: se ven el mensaje de error y los participantes falsos a la vez | **alta** | story | `Participants.tsx:24-56`, `:120` |
| manage-event | Tres cargas secundarias fallan solo a consola. **Si la API de participantes cae, dice `No participants have registered yet.` como si no hubiera ninguno** — y el organizador avanza de etapa sobre esa base | **alta** | story | `ManageEventPage.tsx:74-77`, `:92-96`, `:116-120` |
| (login, overlay) | El health check de `Auth` está **hardcodeado en `true`**. El aviso de API no disponible es código inalcanzable | **alta** | story | `Auth.tsx:30-36` |

---

## Gaps por pantalla

### home

| Gap | Categoría | Severidad | Acción | Evidencia |
|---|---|---|---|---|
| Las tres secciones tienen **texto placeholder autorreferencial** ("This is the WHY section where we explain...") | contenido | **alta** | decisión de producto | `App.tsx:30,40,50` |
| `About` y `See Demo` apuntan ambos a `/`, no a las anclas `#why` / `#demo` que la pantalla define | navegación | media | story | `App.tsx:157-158` vs `:26,36,46` |
| **Tres `<h1>` en la misma página** | accesibilidad | media | story | `App.tsx:28,38,48` |
| Las `<section>` no tienen `aria-labelledby`: no son landmarks nombrados | accesibilidad | baja | story | `App.tsx:26,36,46` |

### events-list

| Gap | Categoría | Severidad | Acción | Evidencia |
|---|---|---|---|---|
| **Tabla falsa**: grid de `<div>` sin `<table>` ni roles ARIA. Un lector de pantalla no la interpreta como tabla | accesibilidad | media | story | `Events.tsx:203-210` |
| **Tabs sin semántica ARIA**: sin `role="tab"`, `aria-selected` ni `role="tablist"`. El estado activo se comunica **solo por color** | accesibilidad | media | story | `Events.tsx:153-172`, `Events.css:64-68` |
| La etapa `results` se muestra como **`Completed`**, distinto del resto de la app | contenido | media | decisión UX | `Events.tsx:66-74` |
| **Doble fetch al montar**: dos `useEffect` superpuestos disparan dos requests | deuda interna | media | story | `Events.tsx:24-32` |
| Sin estado de éxito: tras un `Refresh` exitoso nada lo confirma | estado ausente | media | decisión UX | `Events.tsx:58-60` |
| El `disabled` de `Refresh` es **código inalcanzable**: `loading===true` fuerza el retorno temprano | deuda interna | baja | story | `Events.tsx:105`, `:144` |
| Sin estado offline: el health check solo va a `console.log` | estado ausente | media | story | `Events.tsx:39-45` |
| CSS muerto: el grid define 6 columnas y el JSX renderiza 5; reglas de `.cell-location` sin celda | deuda interna | baja | story | `Events.css:88,112,256` |

### create-event

| Gap | Categoría | Severidad | Acción | Evidencia |
|---|---|---|---|---|
| **La fecha del evento se autogenera (hoy+1día) y no hay campo en el formulario**: el usuario nunca ve ni elige cuándo ocurre su evento | estado ausente | **alta** | decisión de producto | `CreateEventPage.tsx:43-49` |
| El submit se deshabilita **sin explicar por qué**: los umbrales solo están en los textos de ayuda | estado ausente | media | decisión UX | `CreateEventPage.tsx:204` |
| Sin permiso **sin UI**: redirige a `/events` sin ningún mensaje, con pantalla en blanco previa | estado ausente | media | decisión UX | `CreateEventPage.tsx:27-29`, `:72` |
| Los campos siguen editables durante el envío (sin `disabled={creating}`) | estado ausente | media | story | `CreateEventPage.tsx:207` |
| Vaciar "Maximum participants" lo convierte **silenciosamente a 1**, no a 20 ni a vacío | contenido | media | story | `CreateEventPage.tsx:31-37` |
| El `min`/`max` numérico no está en `isFormValid`: se puede escribir 500 y el botón sigue activo | deuda interna | baja | story | `CreateEventPage.tsx:68-70` |
| Los textos de ayuda no están vinculados con `aria-describedby` | accesibilidad | media | story | `CreateEventPage.tsx:115,136,154` |
| El banner de error no tiene `role="alert"` ni `aria-live` | accesibilidad | media | story | `CreateEventPage.tsx:86-90` |

### event-detail

| Gap | Categoría | Severidad | Acción | Evidencia |
|---|---|---|---|---|
| **El avance de etapa no valida nada acá**, mientras que `manage-event` sí valida participantes y votos. La misma acción, dos reglas | navegación | **alta** | story | `EventDetailPage.tsx:284-420` vs `ManageEventPage.tsx:232-252` |
| El banner de éxito **nunca se limpia**: no hay `setTimeout` ni reset al navegar | estado ausente | media | story | `EventDetailPage.tsx:280` |
| Estado offline **inalcanzable**: si `getEventById` tiene éxito hace `setError('')` y el aviso desaparece | estado ausente | baja | story | `EventDetailPage.tsx:59-68` |
| El wrapper renderiza `Loading...` y `Event not found` **con estilos inline**, ajenos al lenguaje visual | contenido | baja | story | `App.tsx:106-116` |
| El `<input type="file">` **no tiene `<label>` asociado** | accesibilidad | media | story | `EventDetailPage.tsx:338-339` |
| Los banners de éxito y error no tienen `role="alert"` ni `aria-live` | accesibilidad | media | story | `EventDetailPage.tsx:280-281` |
| El botón `×` de quitar archivo solo tiene `title`, sin `aria-label`: se lee como símbolo de multiplicación | accesibilidad | media | story | `EventDetailPage.tsx:353` |
| `aria-label` de `EventTimeline` pasa el `status` crudo (`'completed'`/`'active'`): valor de máquina | accesibilidad | baja | story | `EventTimeline.tsx:121` |
| Inconsistencia de microcopy: el error dice `10MB` y los requisitos `Max 10 MB` | contenido | baja | decisión UX | `EventDetailPage.tsx:136` vs `:370` |
| **CSS muerto**: tres bloques responsive (1024/768/480px) apuntan a clases del layout anterior. **Consecuencia: la pantalla no tiene reglas a 480px** | responsive | media | story | `EventDetailPage.css:616-759` |

### manage-event

| Gap | Categoría | Severidad | Acción | Evidencia |
|---|---|---|---|---|
| **La tabla de participantes queda ilegible en mobile**: el CSS activa `content: attr(data-label)` pero **el JSX nunca setea `data-label`** (verificado: 0 archivos `.tsx`). Los cuatro valores quedan sin etiqueta | responsive | **alta** | story | `ManageEventPage.css:424-429` |
| **No hay ningún mensaje de éxito en toda la pantalla**: tras avanzar etapa, pausar o cambiar deadline, el único feedback es que los datos se recargan | estado ausente | **alta** | decisión UX | `ManageEventPage.tsx:164` |
| **Loop de navegación**: `← Back to Event Details` va a `/events/{id}`, que redirige al creador de vuelta acá | navegación | **alta** | story | `ManageEventPage.tsx:298-300` vs `App.tsx:86-90` |
| El hint dice "solo se puede posponer" pero **no hay validación client-side** que lo cumpla: `min` solo impide fechas pasadas | estado ausente | media | story | `ManageEventPage.tsx:641`, `:674` |
| Usa **`window.confirm` nativo** para la pausa: único diálogo no-React, visualmente ajeno | contenido | media | decisión UX | `ManageEventPage.tsx:258` |
| Sin sesión redirige a `/events` **sin mensaje** | estado ausente | media | decisión UX | `ManageEventPage.tsx:33-36` |
| El `<label>New Deadline</label>` **no tiene `htmlFor`** y el input no tiene `id` | accesibilidad | media | story | `ManageEventPage.tsx:666-676` |
| El botón `✏️` de editar deadline tiene **solo el emoji** como contenido accesible | accesibilidad | media | story | `ManageEventPage.tsx:414-417` |
| Tabla de participantes: `<div>` en grid sin semántica de tabla | accesibilidad | media | story | `ManageEventPage.tsx:543-549` |
| Microcopy con espacio sobrante: `▶️ Resume this event? ` | contenido | baja | story | `ManageEventPage.tsx:258` |
| CSS muerto: `.stage-flow` y `.stage-arrow` apuntan a un stepper que ya no existe | deuda interna | baja | story | `ManageEventPage.css:409-416` |

### reset-password

| Gap | Categoría | Severidad | Acción | Evidencia |
|---|---|---|---|---|
| **El estado de token inválido es un callejón sin salida**: muestra el error y no ofrece ningún botón ni link para pedir uno nuevo o volver | navegación | **alta** | decisión UX | `ResetPasswordPage.tsx:45-54` |
| El bloque de error no tiene `role="alert"` ni `aria-live` | accesibilidad | media | story | `ResetPasswordPage.tsx` |
| El emoji `🔭` del título no tiene `aria-hidden` | accesibilidad | baja | story | `ResetPasswordPage.tsx:49,60,78` |
| **Sin ninguna media query propia**: un solo layout para todo ancho | responsive | baja | decisión UX | ninguna `@media` en el archivo |

---

## Gaps transversales

| Gap | Alcance | Severidad | Acción | Evidencia |
|---|---|---|---|---|
| **El enlace de descarga de propuestas tiene `http://localhost:8080` hardcodeado**, ignorando `REACT_APP_API_URL`. En producción el evaluador **no puede abrir las propuestas que evalúa** | panel de ranking | **alta** | story | `RankingVotePanel.tsx:242` |
| **Ningún overlay tiene `role="dialog"`, `aria-modal`, gestión de foco ni cierre por Escape** | los 8 overlays | **alta** | story | `Modal.tsx`, `StageAdvanceModal.tsx:82` |
| **Sin rutas protegidas**: `/events/create` y `/events/:eventId/manage` son alcanzables por URL sin sesión | todas | media | story | `App.tsx:177-184` |
| **Sin ruta 404**: una URL desconocida renderiza la navbar sobre contenido vacío | todas | media | story | `App.tsx:177-184` |
| **Copiar el link puede fallar en silencio**: `navigator.clipboard` exige contexto seguro; si falla solo hace `console.error` | ShareButton (2 usos) | media | story | `ShareButton.tsx:47-50` |
| **Sin estado offline** en ninguna pantalla | todas | media | decisión UX | no se detectó manejo de conectividad |
| **Tema claro a medias**: solo `Auth.css` y `Modal.css` responden a `prefers-color-scheme: light` | todas | media | decisión UX | `Auth.css:290`, `Modal.css:113` |
| **Tres islas en español** en una interfaz en inglés: etiquetas de rol (`Participante`, `Organizador`, `Administrador`), un `aria-label` y datos mock | Participants, GoogleLoginButton | media | decisión de producto | `Participants.tsx:67-70`, `GoogleLoginButton.tsx:29` |
| **Sin i18n**: los textos están embebidos en el JSX | todas | baja | decisión de producto | — |
| **Un tercio de los colores hardcodeado**: 350 hex vs 753 `var()`, con una paleta implícita sin tokens | todas | baja | story | `foundations/color.md` deuda #2 |
| **Fuente de verdad duplicada de tokens**: las 57 variables de `index.css` repetidas en `global.css` | todas | baja | story | `index.css:4-85`, `global.css:9+` |
| **`console.log` de diagnóstico en producción**, incluyendo un preview del token en cada request | todas | baja | story | `config/api.ts`, `AuthContext.tsx` |
| **Código muerto**: `ApiStatusAuth.tsx` y `Voting.tsx` sin referencias; clases CSS referenciadas desde el JSX sin definir (`UsernameModal`, `ForgotPasswordForm`), que se renderizan sin estilos | varias | baja | story | verificado por grep |

---

## Siguiente paso sugerido

Agrupados por causa común, no por pantalla — porque comparten solución:

1. **Integridad de lo que se muestra** — 4 gaps, severidad alta. Los cuatro tienen la misma causa:
   un `catch` que fabrica contenido en vez de informar. Se resuelven con un criterio único
   aplicado a los cuatro lugares. → **Feature Group 1** del PRD.

2. **El enlace de descarga roto** — 1 gap, severidad alta, **corrección de una línea**. Es el gap
   con mejor relación impacto/esfuerzo de toda la lista: hoy invalida el JTBD central del
   participante. **Corregirlo junto con la falta de autenticación de ese endpoint** (D-02 del PRD),
   o se expone la descarga a cualquiera con el UUID. → **Feature Groups 1 y 2**.

3. **Accesibilidad de overlays** — 1 gap transversal + varios por pantalla, severidad alta.
   Corregir el componente `Modal` arregla 4 overlays de una vez; los otros dos (`StageAdvanceModal`
   y el de deadline) hay que migrarlos a ese componente. → **Feature Group 4**.

4. **Responsive que oculta información** — 2 gaps, severidad alta: los deadlines invisibles bajo
   600px y la tabla sin etiquetas. Ambos violan el requisito confirmado de responsive.
   → **Feature Group 4**.

5. **Navegación sin salida** — 3 gaps, severidad alta: el loop del organizador, el token inválido
   sin salida, y la ausencia de 404. → **Feature Groups 3 y 7**.

6. **Confirmación de acciones** — la pantalla central del organizador no confirma ninguna de sus
   tres acciones críticas. → **Feature Group 3**.
