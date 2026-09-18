---
id: state-management
display_name: Estado client-side (Context + useState)
language: react
description: Local useState by default, a single Context for the session; no state library
applies_to: [frontend]
required_by: []
package: null
---

# Estado client-side

Sin Redux, Zustand, Jotai ni nada parecido. Solo lo que trae React.

## El árbol de decisión

| Alcance | Mecanismo |
|---|---|
| Una pantalla o componente | `useState` local |
| Sesión del usuario | `AuthContext` |
| Persistente en el navegador | `localStorage` vía `useLocalStorage` |
| Identificadores de recurso | Parámetros de ruta (`useParams`) |

**El default es `useState` local.** Solo subí algo a Context si lo necesitan ramas distintas
del árbol.

## Context

Hay **uno solo**: `AuthContext` (`src/context/AuthContext.tsx`), con la sesión y sus
operaciones. Ver la convención `auth`.

No crees un Context nuevo sin una razón concreta: con una sola SPA de seis pantallas, pasar
props alcanza casi siempre.

### El patrón del modal de auth

`AuthContext` expone `openAuthModal(mode)` para que cualquier componente pueda abrir el
modal de login, que vive en `App.tsx`. Se resuelve registrando un callback:
`App` llama a `registerAuthModalHandler(...)` al montar y el contexto lo invoca después
(`AuthContext.tsx:139-148`, `App.tsx:137-144`).

Es indirecto, pero funciona y evita subir todo el estado del modal. **Si necesitás otro
overlay global, seguí este patrón** en vez de duplicar el estado del modal en cada pantalla.

## Estado local: el patrón de pantalla

Las pantallas con datos remotos llevan al menos tres:

```tsx
const [data, setData] = useState<T | null>(null);
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<string>('');
```

Más los suyos de UI (`showModal`, `selectedFile`, …). Ver `data-fetching`.

**`EventDetailPage` tiene 14 `useState`** (`pages/event-detail/EventDetailPage.tsx:24-38`).
Es mucho y hace difícil seguir el flujo. En pantallas nuevas de esa complejidad, evaluá
`useReducer` antes de sumar el décimo `useState`.

## `localStorage`

El hook `src/hooks/useLocalStorage.ts` expone `setItem` / `getItem` / `removeItem`, con
`JSON.stringify`/`parse` y `try/catch`.

**Excepción documentada**: el JWT se escribe y lee con `localStorage` directo, sin el hook,
porque ya es un string. Ver `auth`.

## Estado de servidor

No hay capa de caché ni sincronización: cada pantalla trae lo suyo y lo guarda en `useState`.
Dos pantallas que muestran el mismo evento hacen dos requests, y navegar y volver reejecuta
todo.

`AuthContext.syncUserEvents` es la única sincronización: trae los eventos del usuario al
login y al restaurar la sesión, y los guarda dentro del objeto `user`.
