---
id: routing
display_name: Routing (react-router-dom v7)
language: react
description: Client-side routing declared in App.tsx, no route guards, no 404 route
applies_to: [frontend]
required_by: []
package: react-router-dom
---

# Routing

`react-router-dom` 7.9.4 con `BrowserRouter`. Todas las rutas se declaran en un solo lugar:
`src/App.tsx:177-184`.

```tsx
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/events" element={<EventsPage />} />
  <Route path="/events/create" element={<CreateEventPage />} />
  <Route path="/events/:eventId/manage" element={<ManageEventPage />} />
  <Route path="/events/:eventId" element={<EventDetailPageWrapper />} />
  <Route path="/reset-password" element={<ResetPasswordPage />} />
</Routes>
```

**El orden importa**: `/events/:eventId/manage` va antes que `/events/:eventId`.

## Navegación

```tsx
import { Link, useNavigate, useParams } from 'react-router-dom';

<Link to="/events" className="nav-link">Events</Link>   // declarativa

const navigate = useNavigate();
navigate(`/events/${eventId}`);                          // imperativa
navigate('/events', { replace: true });                  // sin entrada en el historial

const { eventId } = useParams<{ eventId: string }>();    // parámetros
```

**Usá `<Link>` para navegación de usuario**, no `<a href>`: un `<a>` recarga la aplicación
entera y pierde el estado.

**Excepción documentada**: `AuthContext.logout()` usa `window.location.href = '/'`
deliberadamente, para forzar una recarga limpia y descartar todo el estado en memoria al
cerrar sesión (`AuthContext.tsx:115`).

## Redirección por rol

`EventDetailPageWrapper` (`App.tsx:70-119`) es un envoltorio, no una pantalla: al montar
pide el evento y, si `event.creator_id === user.id`, redirige a `/events/{id}/manage` con
`replace: true`. Mientras resuelve, muestra un "Loading..." con estilos inline.

Consecuencia: **la misma URL lleva a dos pantallas distintas según quién la abra**, y el
participante ve un parpadeo de carga antes del contenido, porque el chequeo necesita una
llamada a la API.

## Lo que falta

### Rutas protegidas

**No existe ningún guard.** `/events/create` y `/events/:eventId/manage` son alcanzables por
URL directa sin sesión. La protección efectiva la da el backend, así que el usuario llega a
la pantalla y ve errores en vez de un redirect.

El patrón natural acá sería un componente que consuma `useAuth()`, **espere a que `loading`
sea `false`** y devuelva `<Navigate to="/" replace />` si no hay sesión. Esperar a `loading`
es lo crítico: sin eso, un refresh expulsa al usuario antes de que se restaure la sesión
desde `localStorage`.

### Ruta 404

No hay `<Route path="*">`. Una URL desconocida renderiza el navbar sobre un área vacía, sin
mensaje.

### Scroll restoration

No hay manejo de scroll entre navegaciones. La landing define anclas `#why`, `#how` y
`#demo` (`App.tsx:26,36,46`) que **ningún link usa**: "About" y "See Demo" del navbar
apuntan los dos a `/` (`App.tsx:157-158`).
