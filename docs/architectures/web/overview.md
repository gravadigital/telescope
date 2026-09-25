# web — Overview

## Propósito

Frontend del sistema de asignación de tiempo de telescopio. Es la única interfaz de usuario
del producto: cubre el recorrido del participante (descubrir un evento, registrarse, subir
su propuesta, evaluar las asignadas, ver resultados) y el del organizador (crear el evento,
avanzar etapas, configurar la votación, ver resultados).

**No tiene lógica de negocio propia.** El algoritmo de votación, las reglas de transición de
etapas y los permisos viven en `api`; el frontend consume la REST API y refleja
lo que ésta responde.

## Tipo de servicio

Single Page Application (`type: frontend`), React 19 con Create React App, servida como
estáticos. Sin SSR, sin backend propio, sin API routes.

## Por qué el catálogo no aplica

El único catálogo frontend disponible es `nextjs/`, construido sobre App Router, Server
Components, Server Actions y Tailwind. Este servicio no tiene nada de eso: es React
client-side puro con CSS plano.

Declarar las convenciones de Next.js sería peor que no declarar ninguna — un developer que
siguiera `forms` o `mutations` escribiría Server Actions en un proyecto donde no existen.
Por eso `language: react` y **las nueve convenciones son custom**, escritas desde los
patrones que el código ya usa.

Si en el futuro se suman más frontends React al ecosistema, estas convenciones son el
insumo natural para crear un catálogo `react/` compartido.

## Módulos

La organización es **por tipo técnico** (`components/`, `pages/`, `hooks/`, `services/`,
`context/`), no por dominio. Los módulos de abajo son agrupaciones lógicas, no carpetas:

| Módulo | Archivos principales |
|---|---|
| `auth` | `components/auth/*`, `components/auth-form/`, `context/AuthContext.tsx` |
| `events` | `components/events/`, `pages/create-event/`, `pages/event-detail/` |
| `event-management` | `pages/manage-event/`, `components/event-timeline/`, `components/stage-advance-modal/`, `components/participants/` |
| `voting` | `components/ranking-vote-panel/`, `components/voting-configuration-panel/`, `components/voting-results-panel/` |

## Rutas

Seis, declaradas en `src/App.tsx:177-184`:

| Ruta | Pantalla |
|---|---|
| `/` | Landing (tres secciones, contenido placeholder) |
| `/events` | Listado de eventos |
| `/events/create` | Creación de evento |
| `/events/:eventId` | Detalle del evento (vista del participante) |
| `/events/:eventId/manage` | Gestión del evento (vista del organizador) |
| `/reset-password` | Definir nueva contraseña con token |

**`/events/:eventId` redirige a `/manage` si el usuario autenticado es el creador**
(`App.tsx:70-119`): la misma URL lleva a dos pantallas distintas según quién la abra.

## Integración con la API

`src/config/api.ts` centraliza la URL base (`REACT_APP_API_URL`, default
`http://localhost:8080`) y el catálogo de endpoints. `src/services/api.ts` (872 líneas)
agrupa las llamadas en servicios por dominio.

El JWT se lee de `localStorage` en cada request. **Manejo global de expiración**: ante un
`401`, `apiRequest` limpia la sesión y emite un `CustomEvent` `auth:logout` que
`AuthContext` escucha para desloguear sin recargar la página. Es un patrón deliberado y
funciona bien; mantenerlo.

## Deuda técnica conocida

Relevada del código:

1. **No hay rutas protegidas.** `/events/create` y `/events/:eventId/manage` son accesibles
   por URL directa sin sesión. No existe un componente guard; el control queda dentro de
   cada pantalla o no se hace.
2. **No hay ruta 404.** Una URL desconocida renderiza el navbar sobre contenido vacío.
3. **Interfaz en dos idiomas.** Landing y navbar en inglés, pantallas de eventos y votación
   en español. No hay i18n: los textos están embebidos en el JSX.
4. **Tokens de diseño duplicados.** Las 57 variables CSS de `index.css` están repetidas con
   los mismos valores en `styles/global.css`, que además define 22 propias.
5. **Un tercio de los colores hardcodeado**: 350 hex literales contra 753 usos de `var()`.
6. **Código muerto**: `components/api-status-auth/ApiStatusAuth.tsx` y
   `components/voting/Voting.tsx` no tienen ninguna referencia.
7. **`console.log` de diagnóstico en producción**, incluyendo un preview del token en cada
   request (`config/api.ts`).
9. **Navegación rota**: "About" y "See Demo" del navbar apuntan ambos a `/`
   (`App.tsx:157-158`), sin usar las anclas `#why` y `#demo` que la landing define.
10. **Poca cobertura de tests.** Cuatro suites (auth y capa de servicios), que corren en CI. Nada de votación ni de `AuthContext`.
11. **`target: es5`** en `tsconfig.json`, innecesariamente conservador para React 19.

## Relevamiento UX

La interfaz está relevada pantalla por pantalla en
[`docs/analysis/ux/web/`](../../analysis/ux/web/index.md): bloques,
microcopy textual, estados implementados y ausentes, comportamiento responsive y tokens.
Ese material es el insumo de `/product-consolidate-services` para construir `docs/ux/`.
