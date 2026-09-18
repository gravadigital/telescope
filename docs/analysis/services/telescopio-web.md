# Análisis de Servicio: telescopio-web

> Documento temporal generado por `/product-analyze-service`.
> Insumo para `/product-consolidate-services`, que produce el PRD consolidado.

## Identificación

| | |
|---|---|
| **Nombre** | `telescopio-web` |
| **Tipo** | Frontend (SPA) |
| **Path** | `web/` (monorepo `telescope`) |
| **Framework** | React 19.1.1 |
| **Lenguaje** | TypeScript 4.9.5 (`strict: true`, `target: es5`) |
| **Build** | Create React App (`react-scripts` 5.0.1) |
| **Routing** | react-router-dom 7.9.4 |
| **Estilos** | CSS plano por componente + variables CSS |

### Propósito

Única interfaz de usuario del producto. Cubre el recorrido del participante (descubrir un
evento, registrarse, subir su propuesta, evaluar las asignadas, ver resultados) y el del
organizador (crear evento, avanzar etapas, configurar la votación, ver resultados).

### Responsabilidad

**No tiene lógica de negocio propia.** El algoritmo de votación, las transiciones de etapa y
los permisos viven en `telescopio-api`. El frontend consume la REST API y refleja lo que
ésta responde.

---

## Features por dominio

### Autenticación

- Registro y login con email y password, en un modal accesible desde el navbar.
- **Google OAuth** en dos pasos: verificación del token y, si el usuario es nuevo, un modal
  para completar el nombre antes de registrar.
- Recuperación de contraseña: solicitud por email y pantalla dedicada para definir la nueva
  con el token de la query.
- Sesión persistida en `localStorage`; se restaura al recargar.
- **Deslogueo automático ante token expirado**, sin recargar la página.

### Eventos

- Listado público de eventos.
- Creación de evento con nombre, descripción, organizador, fechas y cupo.
- Detalle del evento con su etapa actual.
- Registro a un evento.
- Compartir el evento (`ShareButton`).

### Gestión del evento (organizador)

- Pantalla propia en `/events/:eventId/manage`, a la que se redirige automáticamente al
  creador cuando abre el detalle.
- Línea de tiempo de etapas (`EventTimeline`).
- Avance de etapa mediante un modal que pide la fecha estimada (`StageAdvanceModal`).
- Configuración de los parámetros de votación (`VotingConfigurationPanel`).
- Listado de participantes (`Participants`).

### Votación

- Panel de ranking donde el participante ordena las propuestas asignadas
  (`RankingVotePanel`).
- **Guardado de borrador** del ranking antes del envío definitivo.
- Panel de resultados (`VotingResultsPanel`), usado en tres pantallas.

---

## Decisiones técnicas identificadas

### 1. Create React App, no Next.js

SPA client-side pura: sin SSR, sin file-based routing, sin Server Components. Todo el
render ocurre en el navegador.

**Consecuencia:** el catálogo de convenciones frontend disponible (`nextjs/`) no aplica en
absoluto. Las nueve convenciones del servicio son custom.

### 2. CSS plano con variables, sin framework

Un archivo `.css` por componente, importado desde el `.tsx`. Tokens como variables CSS en
`:root`. El lenguaje visual es oscuro con glassmorphism (degradado fijo de fondo,
superficies translúcidas).

Sin Tailwind, sin CSS-in-JS, sin CSS Modules, sin librería de componentes: todo lo visual
está construido a mano.

### 3. Estado con lo que trae React

`useState` local por defecto, un único Context (`AuthContext`) para la sesión. Sin Redux,
Zustand ni librería de estado de servidor.

**Consecuencia:** no hay caché ni deduplicación de requests. Cada pantalla pide sus datos al
montar; navegar y volver reejecuta todo.

### 4. Manejo global de expiración de sesión

Patrón deliberado y bien resuelto: ante un `401`, el cliente HTTP limpia la sesión y emite
un `CustomEvent` `auth:logout` que `AuthContext` escucha para desloguear **sin recargar la
página**. El usuario mantiene el contexto de navegación.

### 5. Servicios por dominio como frontera con la API

`src/services/api.ts` agrupa las llamadas en objetos por dominio y **absorbe la
inconsistencia de envelopes del backend** (`data`, `event`, `user`, payload plano),
devolviendo tipos limpios. Los componentes no saben de eso.

### 6. Una URL, dos pantallas según el rol

`/events/:eventId` redirige al creador hacia `/manage`. La distinción se hace comparando
`event.creator_id === user.id` tras una llamada a la API.

---

## Interfaces

### Expone

| Tipo | Detalle |
|---|---|
| Web UI | 6 rutas, SPA servida como estáticos |

### Consume

| Tipo | Target | Detalle |
|---|---|---|
| REST API | `telescopio-api` | Toda la funcionalidad. `REACT_APP_API_URL`, default `http://localhost:8080` |
| API externa | Google OAuth | Vía `@react-oauth/google`, con `REACT_APP_GOOGLE_CLIENT_ID` |
| Browser storage | `localStorage` | Sesión (`telescopio_user`, `telescopio_token`) |

---

## Flujos detectados (parciales)

1. **`telescopio-web` → `telescopio-api`**: única integración de datos. REST con JWT Bearer.
   Endpoints consumidos: usuarios y auth, Google OAuth, eventos, participantes, attachments,
   configuración de votación, asignaciones, votos, borradores, resultados y estadísticas.
2. **`telescopio-web` → Google**: obtención del token OAuth en el cliente, que luego se
   verifica contra el backend.

**No consume ningún otro servicio del producto.** La arquitectura es un backend y un
frontend, sin bus de eventos ni servicios intermedios.

### Desalineación con la API

El frontend **no declara** el endpoint de descarga de attachments
(`GET /api/v1/attachments/{id}/download`), que el backend sí expone.

Las constantes `EVENT_VOTE` y `EVENT_RESULTS`, que apuntaban a rutas inexistentes, fueron
eliminadas junto con `VoteService` en la sincronización de 2026-09-18.

---

## Información para consolidación en el PRD

### Audiencias visibles en la interfaz

| Audiencia | Evidencia |
|---|---|
| **Participante / investigador** | Recorrido completo en `/events` y `/events/:eventId`: registro, carga de propuesta, ranking, resultados |
| **Organizador / creador** | Pantalla exclusiva `/events/:eventId/manage`, con etapas, configuración y participantes |
| **Visitante anónimo** | Landing, listado de eventos y detalle son públicos |

El rol `admin` que existe en el backend **no tiene representación en la interfaz**: no hay
pantalla de administración.

### Capacidades a consolidar como feature groups

1. Descubrimiento de eventos (landing y listado público).
2. Identidad y acceso (password, Google OAuth, recuperación).
3. Participación (registro y carga de propuesta).
4. Evaluación por pares (asignación, ranking, borradores).
5. Gestión del evento (etapas, configuración, participantes).
6. Resultados.

### Preguntas abiertas para el usuario

- **El idioma**: la interfaz mezcla inglés (landing, navbar) y español (eventos, votación).
  ¿Es una migración a medias o fue deliberado? ¿Cuál es el idioma objetivo?
- **La landing**: las tres secciones tienen texto placeholder. ¿Se va a escribir el
  contenido real o la landing va a desaparecer?
- **El dispositivo prioritario**: el CSS es desktop-first. ¿Los participantes evalúan desde
  escritorio o desde el teléfono? Define si la responsividad actual alcanza.
- **La ausencia de pantalla de admin**: ¿el rol `admin` del backend se opera por base de
  datos, o falta construir esa interfaz?

---

## Relevamiento UX

La interfaz está relevada en detalle en
[`docs/analysis/ux/telescopio-web/`](../ux/telescopio-web/index.md): stack de UI,
breakpoints con su origen, tokens de diseño, inventario de rutas y componentes, y el
relevamiento por pantalla con bloques, microcopy textual, estados implementados y ausentes.

Ese material —no este documento— es el insumo de `/product-consolidate-services` para
construir `docs/ux/` y sembrar el Design System.

---

## Documentación generada

| Documento | Path |
|---|---|
| Arquitectura | `docs/architectures/telescopio-web/` |
| Relevamiento UX | `docs/analysis/ux/telescopio-web/` |

No aplican API spec (no expone API) ni DB schema (no tiene base de datos).
