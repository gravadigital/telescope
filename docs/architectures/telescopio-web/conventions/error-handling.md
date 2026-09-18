---
id: error-handling
display_name: Manejo de errores
language: react
description: try/catch with local error state per screen; no error boundaries, error codes are discarded
applies_to: [frontend]
required_by: []
package: null
---

# Manejo de errores

Cada pantalla maneja sus propios errores con `try/catch` y estado local. **No hay error
boundaries** en toda la aplicación: un error de render no capturado deja la pantalla en
blanco.

## El patrón

```tsx
const [error, setError] = useState<string>('');

try {
  const data = await EventService.getEventById(eventId);
  // ...
} catch (err) {
  const errorMessage = err instanceof Error ? err.message : 'Unknown error';
  setError(`Failed to load event details: ${errorMessage}.`);
} finally {
  setLoading(false);
}
```

Y el render muestra el error de forma condicional.

Reglas:

- **`setError('')` al empezar** cualquier operación, para no arrastrar el error anterior.
- **`err instanceof Error` antes de leer `.message`.** En TypeScript el `catch` es `unknown`.
- **Envolvé el mensaje del backend** en una frase con contexto. El texto crudo del backend
  suele ser técnico.
- **Toda pantalla que hace fetch necesita estado de error.** Sin él, la API falla y el
  usuario ve una pantalla vacía sin explicación.

## Normalización en el cliente

`apiRequest` (`src/config/api.ts`) convierte cualquier respuesta no-OK en un `Error`:

```ts
throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
```

El `||` contempla las dos formas de error del backend: la de los handlers (`error` es el
mensaje) y la de los middlewares (`error` es el código y `message` el texto). Ver
`docs/architectures/telescopio-api/conventions/error-handling.md`.

**Efecto colateral importante: se pierde el `code`.** El backend manda un identificador
estable (`EVENT_NOT_FOUND`, `MAX_PARTICIPANTS_REACHED`, …) y el cliente se queda solo con el
texto. Por eso los componentes terminan haciendo `err.message.includes('INVALID_PAYLOAD')`
para distinguir casos: frágil y dependiente del idioma del mensaje.

**Si se mejora una sola cosa del manejo de errores, que sea preservar el `code`** — por
ejemplo con una clase `ApiError` que lleve `code`, `message` y `status`. Habilita mensajes
por caso sin buscar substrings.

## El 401 es especial

No se maneja pantalla por pantalla. `apiRequest` limpia la sesión y emite un `CustomEvent`
`auth:logout`; `AuthContext` lo escucha y desloguea. Ver `auth`.

**No agregues manejo de 401 en los componentes**: ya está resuelto globalmente.

## Lo que falta

- **Error boundaries**: cero. Un error de render tumba la pantalla entera sin fallback.
  Un `<ErrorBoundary>` alrededor de `<Routes>` sería la mejora de menor esfuerzo.
- **Estado offline**: no se detecta pérdida de conectividad. Se ve como un error genérico.
- **Errores por campo** en formularios: todo va a un único mensaje.
- **Foco en el error**: el mensaje aparece pero no recibe foco ni tiene `role="alert"`, así
  que un lector de pantalla no lo anuncia.
- **Reintento**: no hay forma de reintentar sin recargar o volver a navegar.
