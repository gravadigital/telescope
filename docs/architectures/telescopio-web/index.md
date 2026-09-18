# Arquitectura: telescopio-web

SPA en React 19 con Create React App y TypeScript. Única interfaz de usuario del producto;
consume la REST API de `telescopio-api` y no tiene lógica de negocio propia.

| | |
|---|---|
| **Manifest** | [manifest.yaml](./manifest.yaml) |
| **Overview** | [overview.md](./overview.md) — propósito, módulos, rutas, deuda técnica |
| **Tipo** | `frontend` · **Lenguaje** `react` |

## Atención: sin catálogo de convenciones

`react` **no tiene carpeta en `.claude/conventions/`**. El único catálogo frontend es
`nextjs/`, construido sobre App Router, Server Components, Server Actions y Tailwind — nada
de lo cual existe acá.

Declarar las convenciones de Next.js habría sido peor que no declarar ninguna: un developer
siguiendo `forms` o `mutations` escribiría Server Actions en un proyecto que no las tiene.
**Por eso las nueve convenciones son custom**, escritas desde los patrones observados.

El servicio funciona igual, pero no se beneficia de un catálogo compartido. Si se suman más
frontends React al ecosistema, estas convenciones son el insumo natural para crear
`.claude/conventions/react/`.

## Convenciones activas

Todas custom, en [`conventions/`](./conventions/).

| Convención | Qué fija |
|---|---|
| [`project-structure`](./conventions/project-structure.md) | Hace de `_base`: estructura, naming, forma del componente, TypeScript, variables de entorno |
| [`routing`](./conventions/routing.md) | react-router v7, rutas centralizadas en `App.tsx`, redirección por rol. **Sin guards ni 404** |
| [`state-management`](./conventions/state-management.md) | `useState` por defecto, un solo Context para la sesión |
| [`data-fetching`](./conventions/data-fetching.md) | `apiRequest` → servicios por dominio → `useState` triple. Sin caché |
| [`auth`](./conventions/auth.md) | JWT en `localStorage`, `AuthContext`, manejo global del 401 por `CustomEvent` |
| [`styling`](./conventions/styling.md) | CSS plano por componente, tokens en `:root`, glassmorphism oscuro, **desktop-first** |
| [`forms`](./conventions/forms.md) | Controlados con un `formData`, validación nativa de HTML + manual |
| [`error-handling`](./conventions/error-handling.md) | `try/catch` con estado local. **Sin error boundaries**; el `code` del backend se descarta |
| [`testing`](./conventions/testing.md) | Testing Library + Jest vía CRA. Hoy: un solo smoke test |

## No aplican

`api-routes`, `mutations`, `data-fetching` de Next.js (no hay servidor), `dockerfile` (el
frontend se sirve como estáticos; hay un `docker/` sin integrar), `ci-gitlab` (no hay
pipeline en el repositorio).

## Documentación relacionada

- [Relevamiento UX](../../analysis/ux/telescopio-web/index.md) — pantallas, microcopy, estados, tokens y gaps
- [Análisis del servicio](../../analysis/services/telescopio-web.md) — insumo de consolidación
- [API que consume](../../apis/telescopio-api.yaml) — OpenAPI de `telescopio-api`
