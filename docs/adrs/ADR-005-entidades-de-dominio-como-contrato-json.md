# ADR-005: Las entidades de dominio son a la vez modelo de persistencia y contrato JSON

**Estado:** Aceptado (implementado)
**Fecha:** 2026-09-18 (documentado retroactivamente)
**Detectado desde:** `api`
**Tags:** backend, acoplamiento, api

---

## Contexto

Un servicio REST con base de datos tiene tres representaciones posibles de una entidad: el modelo
de persistencia (cómo se guarda), la entidad de dominio (cómo se razona sobre ella) y el DTO de
respuesta (qué se expone por HTTP). Mantener las tres separadas cuesta una capa de mapeo;
unificarlas la ahorra a cambio de acoplamiento.

## Decisión

**Las structs de dominio llevan los tags de GORM y los de JSON en el mismo campo.** La misma
estructura es modelo de persistencia y contrato de la API:

```go
ID   uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
Name string    `json:"name" gorm:"not null"`
```

No hay capa de DTOs de respuesta ni mapeo entre representaciones.

**Implementado en:**
- `api` — `internal/domain/{event,participant,attachment,vote}/`
- `web` — lo absorbe: `src/services/api.ts` normaliza las respuestas y devuelve tipos
  limpios a los componentes

## Consecuencias

### Positivas

- **El código es compacto.** Una sola definición por entidad, sin mapeo que mantener sincronizado.
- **No hay clase de bug de "el DTO se olvidó de un campo nuevo"**, porque no hay DTO.
- **La documentación del esquema y la de la API describen lo mismo**, lo que las mantiene
  coherentes sin esfuerzo.

### Negativas

- **Cambiar una columna cambia la respuesta HTTP.** Renombrar un campo en la base es un cambio
  incompatible del contrato de la API, aunque nadie lo haya pensado así.
- **Lo que no se quiere exponer hay que excluirlo explícitamente** con `json:"-"`. Es una decisión
  por omisión peligrosa: agregar una columna sensible la expone por defecto.
- **Produjo deuda real y verificable.** Como el modelo que crea las tablas
  (`migrations/models.go`) es distinto de la entidad de dominio, ambos divergieron:
  `voting_configurations` y `voting_results` tienen columnas que **existen en la base y el dominio
  no lee ni escribe** (`use_expertise_matching`, `statistical_metrics`, `good_evaluator_count`, …).
  El CHECK `valid_evaluator_counts` referencia dos de ellas, que quedan en 0 y hacen que **el
  CHECK pase trivialmente**.
- **El frontend tuvo que construir una capa de normalización de todos modos.** Como el backend
  devuelve cuatro formas de envelope distintas (`data`, `event`, `user`, payload plano), el ahorro
  de no mapear en el backend se pagó con un mapeo en el frontend (`src/services/api.ts`, 872
  líneas).

## Alternativas Consideradas

**No hay registro del rationale original.** Alternativas objetivas:

- **DTOs de request y response separados de la entidad** — La opción convencional. Cuesta una capa
  de mapeo y da libertad para evolucionar el esquema sin romper la API.
- **Entidad de dominio pura + modelo de persistencia + DTO** (tres capas) — Lo que pediría una
  arquitectura hexagonal estricta. Para el tamaño de este dominio, probablemente
  sobredimensionado.
- **Solo separar los DTOs de respuesta**, manteniendo entidad y persistencia unificadas — Un punto
  intermedio que habría evitado la consecuencia más grave (que cambiar una columna cambie la API)
  con poco costo.

## Referencias

- Entidades: `api/internal/domain/`
- Deuda derivada: sección "Columnas huérfanas" en `docs/db-schemas/telescopio_db.md`
- Capa de normalización del frontend: `web/src/services/api.ts`
