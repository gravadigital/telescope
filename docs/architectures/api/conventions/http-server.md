---
id: http-server
display_name: Servidor HTTP (Gin)
language: golang
description: HTTP server, routing and composed permission middleware with Gin
applies_to: [api]
required_by: []
package: github.com/gin-gonic/gin
---

# HTTP Server (Go, Gin)

> **Reemplaza la convención del catálogo.** El catálogo recomienda chi; este servicio
> usa **Gin**. Escribir un handler estilo chi (`http.HandlerFunc`, `w http.ResponseWriter`)
> produciría código que no compila contra el router existente.

## Paquetes

```
github.com/gin-gonic/gin        # router + binding + render
github.com/gin-contrib/cors     # CORS
```

## Estructura

```
cmd/api/
└── main.go                     # wiring completo + registro de TODAS las rutas
internal/
├── handlers/                   # un archivo por área: {area}_handler.go
│   ├── event_handler.go
│   ├── user_handler.go
│   └── ...
└── middleware/
    ├── auth/                   # jwt.go (autenticación) + permissions.go (autorización)
    └── events/                 # logging de request/response
```

**Todas las rutas se registran en `cmd/api/main.go`.** No hay un `routes.go` por módulo
ni auto-registro: si agregás un endpoint, se declara ahí, en el grupo que corresponda.

## Handlers

Un handler es un método sobre un struct que recibe sus dependencias por constructor:

```go
type EventHandler struct {
    eventRepo      postgres.EventRepository
    userRepo       postgres.UserRepository
    emailService   *email.EmailService
    cfg            *config.Config
    log            *log.Logger
}

func NewEventHandler(eventRepo postgres.EventRepository, /* ... */) *EventHandler {
    return &EventHandler{eventRepo: eventRepo, log: logger.Service("event-handler")}
}

func (h *EventHandler) GetEvent(c *gin.Context) {
    // 1. path params  2. body  3. reglas de negocio  4. respuesta
}
```

Reglas:

- El handler **no** contiene el algoritmo de negocio: parsea, delega y responde. La lógica
  de votación vive en `internal/domain/vote/voting_service.go`.
- El logger se obtiene con `logger.Service("{nombre}-handler")` en el constructor.
- Nunca se usa `panic`. Tampoco `uuid.MustParse` sobre entrada del usuario: parsea con
  `uuid.Parse` y devolvé `400` si falla.

## Grupos de rutas y autorización

Los permisos se componen declarándolos en la ruta, no dentro del handler:

```go
// Público
eventsPublic := api.Group("/events")
eventsPublic.GET("/:event_id", eventHandler.GetEvent)

// Autenticado
events := api.Group("/events")
events.Use(auth.JWTAuthMiddleware())

// Autenticado + permiso específico
events.PATCH("/:event_id/stage",
    auth.RequireEventOwner(eventRepo),
    eventHandler.UpdateEventStage)
```

Middlewares de permisos disponibles (`internal/middleware/auth/permissions.go`):

| Middleware | Permite |
|---|---|
| `RequireRole(roles...)` | Los roles globales indicados |
| `RequireEventOwner(repo)` | El autor del evento, o un `admin` |
| `RequireEventOwnerOrOrganizer(repo)` | Lo anterior, más cualquier `organizer` |
| `RequireParticipantOrOwner(repo)` | El propio participante, el autor del evento, o un `admin` |

> **Cuidado al agregar rutas.** Un endpoint declarado en `api.Group("/api/v1")` en vez de
> en el grupo que tiene `.Use(auth.JWTAuthMiddleware())` queda **público**. Así estuvo
> expuesto `/attachments/:attachment_id/download`, hoy en su propio grupo `attachments`
> con JWT. Verificá en qué grupo estás registrando.

## Respuestas

Éxito — el envelope estándar es `data`:

```go
c.JSON(http.StatusOK, gin.H{
    "data": payload,
})

c.JSON(http.StatusCreated, gin.H{
    "data":    payload,
    "message": "Event created successfully",
    "code":    "EVENT_CREATED",
})
```

**Usá `data` en todo endpoint nuevo.** El código existente tiene envelopes heredados
(`event`, `user`, `assignment`, o payload plano) que no se replican en código nuevo.

Nunca serialices una entidad de dominio directo: construí el payload de respuesta
explícitamente. `GetParticipantAssignment` y `GetDraft` hoy devuelven el struct de dominio
completo, lo que filtra campos internos (`quality_score`, `expertise_match_score`) y ata la
respuesta al esquema de la base.

## CORS

Configurado en `main.go` desde `CORS_ALLOW_ORIGINS`. `*` activa `AllowAllOrigins`; cualquier
otro valor se parsea como lista separada por comas.

## Logging de requests

El middleware `events.CreateEvent()` loguea inicio y fin de cada request con un
`request_id`, method, path, status y latencia. Se aplica globalmente. No agregues logging
de entrada/salida en los handlers: ya está.
