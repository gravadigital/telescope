---
id: project-structure
display_name: Estructura y convenciones generales (React + CRA)
language: react
description: Base conventions for the React SPA — layout, naming, TypeScript, component shape
applies_to: [frontend]
required_by: []
package: react
---

# Estructura y convenciones generales

Hace las veces de `_base` para este servicio: no hay catálogo `react/`, así que lo que en
otros lenguajes sería la convención base está acá.

## Stack

```
react 19.1.1            react-dom 19.1.1
react-router-dom 7.9.4  @react-oauth/google 0.13.4
react-scripts 5.0.1     typescript 4.9.5
```

**Create React App, no Next.js.** Sin SSR, sin Server Components, sin Server Actions, sin
file-based routing. Todo el código corre en el navegador.

## Estructura

```
src/
├── App.tsx              # rutas, navbar, providers
├── index.tsx            # entry point
├── index.css            # tokens + reset + estilos de botones
├── components/{kebab-case}/
│   ├── Component.tsx
│   └── Component.css
├── pages/{kebab-case}/
│   ├── PageName.tsx
│   └── PageName.css
├── context/             # React Context
├── hooks/               # hooks propios
├── services/api.ts      # llamadas a la API por dominio
├── config/api.ts        # URL base, endpoints, cliente fetch
├── styles/global.css    # tokens + utilidades
└── types/index.ts       # tipos compartidos
```

La organización es **por tipo técnico**, no por dominio. Es la convención vigente: al
agregar un componente nuevo, seguila en vez de introducir una estructura por feature.

- Carpeta en `kebab-case`, archivo del componente en `PascalCase`.
- **Un componente por carpeta, con su CSS al lado**, mismo nombre.
- `pages/` son las pantallas montadas en una ruta; `components/` es todo lo demás.

## Componentes

Componentes de función con tipado explícito de props:

```tsx
interface RankingVotePanelProps {
  eventId: string;
  participantId: string;
  onComplete: () => void;
}

const RankingVotePanel: React.FC<RankingVotePanelProps> = ({ eventId, participantId, onComplete }) => {
  // ...
};

export default RankingVotePanel;
```

- **`export default`** para el componente. Los tipos y helpers van con export nombrado.
- Las props se tipan en una `interface` declarada arriba, o en `src/types/index.ts` si se
  comparte.
- Sin `React.FC` no es un error, pero es el patrón mayoritario: seguilo.

## TypeScript

`strict: true` está activo. Aprovechalo:

- Nada de `any` en código nuevo. `src/services/api.ts` tiene varios `Promise<any>`
  heredados: no los imites, tipá la respuesta.
- Los tipos compartidos (`User`, `Event`, `VotingResults`, …) van en `src/types/index.ts`.

**`target: es5`** en `tsconfig.json` es innecesariamente conservador para React 19. Si se
sube, hay que verificar el navegador mínimo soportado.

## Variables de entorno

**La configuración se resuelve al arrancar el contenedor, no al compilar.** CRA reemplaza cada
`process.env.REACT_APP_*` por su valor literal en el build, lo que ataría la imagen publicada a
una instalación. Por eso:

1. Al iniciar, el contenedor escribe `/config.js` con `window.__CONFIG__` a partir de `API_URL`
   y `GOOGLE_CLIENT_ID` (`web/docker/40-runtime-config.sh`).
2. `public/index.html` lo carga antes que la app.
3. `src/config/runtime.ts` expone `RUNTIME_CONFIG`: toma `window.__CONFIG__` y, si está vacío,
   cae a las `REACT_APP_*` (que es lo que pasa con `npm start` / `make web`).

| En el contenedor | Fuera de Docker | Default | Uso |
|---|---|---|---|
| `API_URL` | `REACT_APP_API_URL` | `http://localhost:8080` | Base de la API |
| `GOOGLE_CLIENT_ID` | `REACT_APP_GOOGLE_CLIENT_ID` | `''` | Google OAuth |

**Leé la configuración siempre de `RUNTIME_CONFIG`** (o de `API_CONFIG.BASE_URL` para la URL
de la api), nunca de `process.env` ni con una URL escrita a mano: cualquiera de las dos cosas
vuelve a atar la imagen a una instalación.

## Logging

**No dejar `console.log` en código nuevo.** El código actual tiene logs de diagnóstico con
emojis en `AuthContext` y en `apiRequest`, incluyendo un preview del token en cada request
(`config/api.ts`). Eso llega a producción. Usá `console.error` solo para errores reales.

## Código muerto

Tres componentes sin referencias: `components/api-status-auth/ApiStatusAuth.tsx`,
`components/voting/Voting.tsx` y `components/event-detail/EventDetail.tsx` (+ ~800 líneas
de CSS). Antes de tomar uno como referencia, verificá que esté vivo — el que se usa para el
detalle del evento es `pages/event-detail/EventDetailPage.tsx`, no el homónimo de
`components/`.
