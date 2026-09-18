---
id: validation
display_name: Validación de inputs (binding de Gin + manual)
language: golang
description: Gin binding tags for request bodies, manual validation for path params and business rules
applies_to: [api]
required_by: []
package: github.com/gin-gonic/gin/binding
---

# Validation (api)

> **Reemplaza la convención del catálogo.** El catálogo usa `go-playground/validator`
> directamente; acá se usa a través del **binding de Gin**, que lo envuelve. Además, una
> parte importante de la validación es manual.

## Las tres capas, siempre en este orden

### 1. Path params — manual

Nunca por binding. Siempre presencia y formato:

```go
eventIDStr := c.Param("event_id")
if eventIDStr == "" {
    c.JSON(http.StatusBadRequest, gin.H{"error": "Event ID is required", "code": "MISSING_EVENT_ID"})
    return
}
eventID, err := uuid.Parse(eventIDStr)
if err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID format", "code": "INVALID_EVENT_ID"})
    return
}
```

**Nunca `uuid.MustParse` sobre entrada del usuario**: hace panic. Hay dos usos en
`SubmitRankingVotes` (`distributed_vote_handler.go:661-662`) que hoy no son alcanzables
porque el middleware valida antes, pero no los imites.

### 2. Body — binding tags

```go
type CreateEventRequest struct {
    Name        string `json:"name" binding:"required,min=3,max=200"`
    Description string `json:"description" binding:"required,min=10,max=2000"`
    StartDate   string `json:"start_date" binding:"required"`
    MaxParticipants *int `json:"max_participants"`
}

if err := c.ShouldBindJSON(&req); err != nil {
    c.JSON(http.StatusBadRequest, gin.H{
        "error": "Invalid request payload", "code": "INVALID_PAYLOAD", "details": err.Error(),
    })
    return
}
```

Tags en uso: `required`, `min`, `max`, `email`, `dive`, `excludesall`.

Dos trampas reales:

- **`dive` es obligatorio para validar items de un slice.** `SubmitRankingVotes` usa
  `binding:"required,dive"` y valida cada item; `SaveDraft` usa solo `binding:"required"`,
  así que los tags de los items **no se aplican** y el contrato efectivo es más laxo que
  el declarado. Si validás elementos de una lista, poné `dive`.
- **`min`/`max` sin `required` sobre tipos valor no funcionan como se espera.** Un
  `float64` ausente llega como `0` y el validador lo saltea. El código compensa con
  defaults manuales (`if config.X == 0 { config.X = 0.6 }`). Para campos opcionales con
  default, documentá el default y aplicalo explícitamente — no confíes en el tag.

### 3. Reglas de negocio — manual, siempre

El binding no alcanza para nada que dependa del estado. Se valida a mano:

- Formatos de fecha (`YYYY-MM-DD` con `time.Parse`), rangos y coherencia entre fechas.
- Etapa del evento correcta para la operación.
- Unicidad (nombre de evento duplicado, participante ya registrado, config ya existente).
- Límites (cupo de participantes, mínimo de propuestas para avanzar de etapa).
- Rankings sin duplicados y consecutivos desde 1.

La validación de invariantes del dominio va en la entidad (`event.Validate()`,
`vote.VotingConfiguration.Validate()`), no en el handler. El handler la invoca.

## Validación en el dominio de votación

`VotingService.ValidateVotingConfiguration` valida las restricciones matemáticas
(`m ≤ k-1`, `m ≥ 2·log₂(k)`, cobertura suficiente). Cualquier cambio de parámetros de
votación pasa por ahí antes de tocar la base.

## Qué NO validar de nuevo

Los triggers de Postgres ya imponen varias reglas (ver la convención `database`). Igual
conviene validarlas en Go **antes**, porque el error del trigger llega como `500` crudo.
La validación en Go es para dar un mensaje útil; la de la base es la garantía real.
