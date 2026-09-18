# ADR-006: Create React App en lugar de Next.js

**Estado:** Aceptado (implementado)
**Fecha:** 2026-09-18 (documentado retroactivamente)
**Detectado desde:** `web`
**Tags:** stack, frontend, convenciones

---

## Contexto

El frontend es la única interfaz del producto. Tiene 6 rutas y todo su contenido depende de una
sesión autenticada o de datos que la API entrega en runtime.

El único catálogo de convenciones frontend disponible en el workflow es el de **Next.js**.

## Decisión

**Create React App** (`react-scripts` 5.0.1) con **react-router-dom** 7.9.4. SPA client-side pura:
**sin SSR, sin file-based routing, sin Server Components.** Todo el render ocurre en el navegador.
El build es un conjunto de archivos estáticos.

**Implementado en:**
- `web` — `src/App.tsx` declara las 6 rutas; el build se sirve como estáticos

## Consecuencias

### Positivas

- **El despliegue es trivial.** Archivos estáticos: cualquier servidor web o CDN los sirve, sin
  runtime de Node en producción.
- **Un solo modelo mental.** No hay que razonar sobre qué corre en el servidor y qué en el
  cliente, que es la principal fuente de confusión en Next.js.
- **La separación con el backend es nítida.** El frontend no tiene servidor propio, así que no
  existe la tentación de poner lógica de negocio en un route handler.
- **SSR no aportaba nada al producto.** No hay contenido público indexable que importe: la landing
  es placeholder y todo lo demás requiere sesión.

### Negativas

- **El catálogo de convenciones frontend no aplica en absoluto.** Las 9 convenciones del servicio
  son custom. Una story que asuma patrones de Next.js (Server Components, `app/` router, data
  fetching en servidor) está describiendo algo que acá no existe.
- **Create React App está discontinuado.** El equipo de React dejó de recomendarlo y ya no recibe
  desarrollo activo. No es urgente —sigue funcionando— pero es deuda con fecha de vencimiento
  incierta.
- **`target: es5` en `tsconfig.json`** produce bundles más grandes de lo necesario para los
  navegadores que el producto realmente soporta.
- **Sin optimización de carga inicial.** Todo el JS se descarga antes del primer render, sin
  code splitting por ruta.

## Alternativas Consideradas

**No hay registro del rationale original.** Alternativas objetivas:

- **Next.js** (lo que tiene catálogo) — SSR y file-based routing. Habría requerido un runtime de
  Node en producción, para un beneficio (SEO, first paint) que este producto no necesita.
- **Vite + React Router** — El reemplazo actual recomendado para CRA: mismo modelo de SPA
  estática, build mucho más rápido y mantenimiento activo. **Es la migración natural si CRA se
  vuelve un problema**, y no cambiaría ninguna decisión de arquitectura.
- **Remix / TanStack Router** — Habrían traído data loading declarativo por ruta, que resolvería
  el problema de que hoy cada pantalla pide sus datos al montar sin caché.

## Referencias

- Convenciones custom: `docs/architectures/web/conventions/`
- Rutas: `web/src/App.tsx:177-184`
