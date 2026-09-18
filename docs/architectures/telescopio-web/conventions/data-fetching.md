---
id: data-fetching
display_name: Obtención de datos (fetch + useEffect)
language: react
description: Client-side fetching with a shared apiRequest wrapper, per-screen loading/error state, no cache layer
applies_to: [frontend]
required_by: []
package: null
---

# Obtención de datos

Todo el fetching es client-side. No hay React Query, SWR ni caché: cada pantalla pide sus
datos al montar y los guarda en estado local.

## Las tres capas

### 1. `src/config/api.ts` — el cliente

`apiRequest<T>(endpoint, options)` envuelve `fetch` y resuelve lo transversal:

- Antepone `API_CONFIG.BASE_URL`.
- Lee el JWT de `localStorage` y lo manda como `Authorization: Bearer`.
- Omite `Content-Type` cuando el body es `FormData` (para que el browser ponga el boundary).
- **Ante un `401`, limpia la sesión y emite un `CustomEvent` `auth:logout`** que
  `AuthContext` escucha para desloguear sin recargar la página.
- Normaliza el error a `new Error(errorData.error || errorData.message || 'HTTP error! status: N')`.

Para subir archivos está `uploadFile(endpoint, formData)`.

**Nunca llames a `fetch` directo desde un componente**: perdés el token, el manejo de 401 y
la normalización del error.

### 2. `src/services/api.ts` — los servicios

Objetos agrupados por dominio, cada método mapea a un endpoint y devuelve tipos del dominio:

```ts
export const EventService = {
  async getEventById(id: string): Promise<Event | null> { /* ... */ },
  async createEvent(eventData: CreateEventRequest): Promise<Event> { /* ... */ },
};
```

Servicios existentes: `EventService`, `UserService`, `AttachmentService`, `VoteService`,
`DistributedVotingService`, `VoteDraftService`, `ApiHealthService`, `GoogleAuthService`.

**Acá va la traducción entre la forma de la API y la del frontend.** El backend tiene
envelopes inconsistentes (`data`, `event`, `user`, o payload plano): el servicio desenvuelve
y devuelve el tipo limpio, para que el componente no sepa de eso.

Al agregar un endpoint: sumá la constante en `config/api.ts` y el método en el servicio del
dominio. No armes URLs en el componente.

### 3. El componente — estado y ciclo

El patrón vigente es tres `useState` y un `useEffect`:

```tsx
const [event, setEvent] = useState<Event | null>(null);
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<string>('');

useEffect(() => {
  loadEvent();
}, [eventId]);

const loadEvent = async () => {
  setLoading(true);
  setError('');
  try {
    const data = await EventService.getEventById(eventId);
    if (data) setEvent(data);
    else setError(`Event with ID "${eventId}" was not found.`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    setError(`Failed to load event details: ${errorMessage}.`);
  } finally {
    setLoading(false);
  }
};
```

Reglas:

- **Siempre las tres**: `loading`, `error` y el dato. Una pantalla que hace fetch sin estado
  de error deja al usuario mirando una pantalla vacía cuando la API falla.
- `setError('')` al empezar, para que no quede el error anterior.
- `setLoading(false)` en `finally`, nunca solo en el camino feliz.
- El texto del error se arma en el componente. `err.message` viene del backend y no siempre
  es mostrable a un usuario final: envolvelo.

## Limitaciones conocidas

- **Sin caché ni deduplicación.** Dos componentes que necesitan el mismo evento lo piden dos
  veces. Navegar y volver reejecuta todo.
- **Sin cancelación.** Los fetch de las pantallas no usan `AbortController`: si el
  componente se desmonta antes de que resuelva, se intenta un `setState` sobre un
  componente desmontado.
- **`src/hooks/useFetch.ts` existe y sí implementa `AbortController`**, pero **ninguna
  pantalla lo usa**. Antes de "arreglar" el fetching, decidí si se adopta ese hook o se
  elimina: hoy es una tercera forma de hacer lo mismo.
- **No hay estado offline.** Una pérdida de conectividad se ve como un error genérico.

## Endpoint no declarado

Falta declarar la descarga de attachments (`GET /api/v1/attachments/{id}/download`), que el
backend sí expone. Si alguna pantalla necesita ofrecer la descarga, agregá la constante en
`config/api.ts` y el método en `AttachmentService` en vez de armar la URL a mano.
