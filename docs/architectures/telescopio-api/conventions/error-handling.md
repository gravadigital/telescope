---
id: error-handling
display_name: Manejo de errores
language: golang
description: Inline gin.H error responses with a code field; four legacy shapes coexist
applies_to: [api]
required_by: [http-server, validation, auth-jwt]
package: null
---

# Error Handling (telescopio-api)

> **Reemplaza la convención del catálogo.** El catálogo modela errores con un tipo
> `errs.Error` (Kind + constructores) traducido en el borde. Este servicio construye la
> respuesta de error **inline en cada handler** con `gin.H`. No existe el paquete `errs`.

## Estado actual: cuatro formas conviviendo

Esto es deuda, no diseño. Un cliente no puede parsear los errores de forma uniforme.

### Forma A — la de los handlers (dominante, y la correcta para código nuevo)

```json
{ "error": "Invalid request payload", "code": "INVALID_PAYLOAD", "details": "..." }
```

`error` es el mensaje legible, `code` el identificador estable en `SCREAMING_SNAKE`,
`details` opcional. Usada en `user_handler`, `google_auth_handler`, `event_handler`,
`attachment_handler`, `vote_draft_handler` y la mayoría de `distributed_vote_handler`.

### Forma B — la de los middlewares (invertida)

```json
{ "error": "UNAUTHORIZED", "message": "Missing Authorization header" }
```

Acá `error` es el **código** y el mensaje va en `message`. Es **semánticamente inversa a
la forma A**, y aplica a todos los `401/403/404/400` que emiten `JWTAuthMiddleware` y los
middlewares de permisos — es decir, a todo endpoint protegido antes de entrar al handler.
Nunca incluye `code`.

### Forma C — degradada, sin `code`

```json
{ "error": "Event not found" }
```

En `GetParticipantAssignment`, `SubmitRankingVotes`, `GetDistributedResults` y
`GetVotingStatistics`. A veces suma claves sueltas (`current_stage`, `details`).

### Forma D — health check

```json
{ "status": "error", "service": "telescopio-api", "error": "database ping failed" }
```

## Reglas para código nuevo

1. **Usá la forma A**, siempre con `code`.
2. **No inventes `code` nuevos si ya existe uno equivalente.** Revisá los existentes antes.
3. **`details` es string.** Hay una sola excepción histórica (`INVALID_STAGE_FOR_EDIT`, que
   lo devuelve como objeto); no la repitas.
4. **No reuses un `code` entre éxito y error.** Hoy `EVENT_PAUSED` es éxito 200 en
   `PauseEvent` y error 403 en `RegisterParticipant`; `EVENT_CANCELLED` tiene la misma
   colisión. Es un defecto.
5. **El status HTTP tiene que coincidir con la semántica**: `401` solo para credenciales
   ausentes o inválidas, `403` para autenticado sin permiso, `404` para inexistente, `409`
   para conflicto de estado, `400` para entrada inválida.
6. **No expongas errores internos crudos.** Logueá el error real y devolvé un mensaje
   controlado.

```go
if err != nil {
    h.log.Error("failed to create event", "error", err)
    c.JSON(http.StatusInternalServerError, gin.H{
        "error": "Failed to create event",
        "code":  "DB_CREATE_ERROR",
    })
    return
}
```

## Wrapping interno

Entre capas se usa el wrapping estándar de Go, como pide `_base`:

```go
return fmt.Errorf("failed to get votes: %w", err)
```

Inspección con `errors.Is` / `errors.As`. No hay errores centinela definidos por módulo
todavía; cuando necesites distinguir un caso (típicamente "no encontrado"), definí un
`ErrNotFound` en el paquete del módulo antes que comparar strings.

## Errores que vienen de la base

Las violaciones de los triggers de Postgres (ver la convención `database`) llegan como
error crudo del driver, **sin forma de API**, y terminan en un `500` genérico con un
mensaje de plpgsql. Si un caso es alcanzable por el usuario, validalo en Go antes de
llegar a la base para poder devolver un `400` con `code` útil.
