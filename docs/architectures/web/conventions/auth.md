---
id: auth
display_name: Autenticación (Context + JWT en localStorage)
language: react
description: JWT persisted in localStorage, exposed through AuthContext, with global 401 handling
applies_to: [frontend]
required_by: []
package: '@react-oauth/google'
---

# Autenticación

JWT emitido por el backend, guardado en `localStorage` y expuesto a la aplicación mediante
`AuthContext`. No hay Auth.js ni middleware: es todo client-side.

## Almacenamiento

| Clave | Contenido | Cómo se escribe |
|---|---|---|
| `telescopio_user` | El objeto `User` serializado | Vía `useLocalStorage` (hace `JSON.stringify`) |
| `telescopio_token` | El JWT en crudo | **`localStorage` directo**, sin `JSON.stringify` |

La asimetría es deliberada y está comentada en el código (`AuthContext.tsx:101-102`): el
token ya es un string, pasarlo por `JSON.stringify` le agregaría comillas y rompería el
header. **Si tocás esto, respetá la asimetría**: `apiRequest` lee el token con
`localStorage.getItem('telescopio_token')` y lo usa tal cual.

## `AuthContext`

`src/context/AuthContext.tsx` es la fuente de verdad de la sesión. Se consume con `useAuth()`:

```tsx
const { user, token, isAuthenticated, loading, login, logout, updateUser, joinEvent, openAuthModal } = useAuth();
```

| Miembro | Para qué |
|---|---|
| `user` / `token` | La sesión actual, o `null` |
| `isAuthenticated` | `!!user` |
| `loading` | `true` mientras se restaura la sesión al arrancar |
| `login(user, token)` | Persiste y sincroniza los eventos del usuario |
| `logout()` | Limpia todo y redirige a `/` con `window.location.href` |
| `openAuthModal(mode)` | Abre el modal de login/registro desde cualquier componente |

Al montar, restaura la sesión desde `localStorage` y llama a `syncUserEvents` para traer
los eventos del usuario desde el backend.

**`useAuth` lanza si se usa fuera del provider.** Es intencional: falla fuerte y temprano.

## Expiración de sesión

Patrón deliberado, no accidental, y conviene mantenerlo:

1. `apiRequest` recibe un `401`.
2. Borra `telescopio_user` y `telescopio_token`.
3. Emite `window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'token_expired' } }))`.
4. `AuthContext` escucha ese evento (`AuthContext.tsx:81-95`) y limpia su estado.

**No recarga la página**: el usuario mantiene el contexto de navegación y ve el estado
deslogueado de la pantalla en la que estaba.

## Google OAuth

`GoogleOAuthProvider` envuelve la app (`App.tsx`) con `RUNTIME_CONFIG.GOOGLE_CLIENT_ID`, que en
el contenedor sale de `GOOGLE_CLIENT_ID` al arrancar. Vacío oculta el botón de Google.

El flujo tiene dos pasos porque el backend los separa:

1. `GoogleAuthService.verify(token)` — si el usuario existe devuelve `status: "existing_user"`
   con el JWT; si no, `status: "new_user"` con el perfil sugerido.
2. En el segundo caso se abre `UsernameModal` para completar el nombre, y luego
   `GoogleAuthService.register(token, username)`.

## Falta: rutas protegidas

**No existe ningún componente guard.** Las rutas se declaran planas en `App.tsx:177-184`, y
`/events/create` y `/events/:eventId/manage` son alcanzables por URL directa sin sesión.

Hoy la protección real la da el backend (los endpoints exigen JWT), así que un usuario sin
sesión llega a la pantalla y ve errores, en vez de un redirect limpio.

Si se agrega el guard, el patrón natural con este stack es un componente que consuma
`useAuth()`, espere a que `loading` sea `false` y redirija con `<Navigate to="/" replace />`
cuando no haya sesión. **Esperar a `loading` es lo importante**: sin eso, un refresh
desloguea visualmente al usuario antes de que se restaure la sesión.

## Autorización por rol

No hay roles en el frontend. La distinción organizador/participante se hace comparando
`event.creator_id === user.id` (`App.tsx:86`), que además decide la redirección de
`/events/:eventId` hacia `/manage`.
