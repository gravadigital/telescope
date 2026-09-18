# ADR-002: Reglas de negocio implementadas en triggers de PostgreSQL

**Estado:** Aceptado (implementado)
**Fecha:** 2026-09-18 (documentado retroactivamente)
**Detectado desde:** `api`
**Tags:** datos, integridad, invariantes

---

## Contexto

El sistema tiene invariantes que **no pueden violarse nunca**, porque si se violan el resultado
pierde toda legitimidad. La principal: **nadie puede evaluar su propia propuesta**. Otras: una
asignación debe tener exactamente `m` propuestas; solo se puede votar lo que fue asignado; el
`rank_position` no puede exceder `m`.

Validar esto únicamente en la capa de aplicación deja una puerta abierta: cualquier escritura que
no pase por el código Go —un script de corrección, un seed, una migración de datos, un test de
integración— puede dejar la base en un estado que el dominio considera imposible.

## Decisión

Una porción sustancial de las invariantes se implementa en **funciones plpgsql y triggers de
PostgreSQL**, definidas en `internal/storage/migrations/004_constraints_and_triggers.go`.

| Regla | Mecanismo |
|---|---|
| La asignación debe tener exactamente `m` attachments | `validate_assignment_constraints` (BEFORE INSERT/UPDATE) |
| Los attachments deben existir y pertenecer al evento | `validate_assignment_constraints` |
| **Nadie puede evaluar su propia propuesta** | `validate_assignment_constraints` |
| El votante debe tener una asignación en el evento | `validate_vote_constraints` (BEFORE INSERT/UPDATE) |
| Solo se vota lo que está en la propia asignación | `validate_vote_constraints` |
| `rank_position ≤ attachments_per_evaluator` | `validate_vote_constraints` |
| Cálculo del score Borda si viene nulo | `validate_vote_constraints` |
| Marcado de asignación completa | `update_assignment_completion` (AFTER INSERT/DELETE) |
| Mantenimiento de `attachments.vote_count` | `update_attachment_vote_count` (AFTER INSERT/DELETE) |

Se suman CHECK constraints sobre formato de email, tamaño de archivo, rangos de los parámetros de
votación y coherencia de los umbrales (`good > bad` con diferencia ≥ 0.1).

**El conflicto de interés se valida en dos capas independientes:** en Go
(`VotingService.hasConflictOfInterest`) y en el trigger. Es defensa en profundidad deliberada
sobre la invariante que el producto no puede permitirse violar.

**Implementado en:**
- `api` — las migraciones definen los triggers; el dominio Go valida en paralelo

## Consecuencias

### Positivas

- **Las invariantes se cumplen sin importar quién escriba.** Un script de mantenimiento no puede
  romper el conflicto de interés aunque lo intente.
- **Defensa en profundidad sobre lo que más importa.** Un bug en el código Go de asignación no
  produce datos ilegítimos: la base rechaza la escritura.
- **`vote_count` e `is_completed` son siempre consistentes** con los votos reales, sin que la
  aplicación tenga que mantenerlos.

### Negativas

- **Es la decisión más importante y la menos visible del sistema.** Un desarrollador que lea solo
  el código Go **no ve la mitad de las reglas**. Este es el costo principal y es real.
- **Los errores de trigger no tienen la forma de error de la API.** Una violación llega como
  `RAISE EXCEPTION` de plpgsql y se convierte en un **500 genérico** que el frontend no puede
  interpretar ni mostrar de forma útil.
- **La lógica queda repartida en dos lenguajes.** El conflicto de interés existe en Go y en
  plpgsql: **cambiar uno solo deja el sistema inconsistente**, y nada lo detecta automáticamente.
- **Los tests de integración y los seeds tienen que construir datos coherentes** con la
  `voting_configuration` del evento, o chocan contra los triggers. Sube el costo de escribir
  fixtures.
- **Insertar votos manualmente altera `vote_count` e `is_completed`** sin intervención de la
  aplicación, lo que puede sorprender a quien depure un problema de datos.

## Alternativas Consideradas

**No hay registro del rationale original.** Alternativas objetivas para el problema:

- **Validar solo en la aplicación** — Más simple y visible, pero deja la base sin protección ante
  cualquier escritura que no pase por Go. Para el conflicto de interés, que es la invariante que
  sostiene la legitimidad del producto, es un riesgo difícil de aceptar.
- **Validar solo en la base** — Evitaría la duplicación, pero los mensajes de error serían siempre
  `RAISE EXCEPTION` sin contexto de dominio, y toda la lógica quedaría en plpgsql.
- **Constraints declarativos únicamente** (CHECK, UNIQUE, FK) — No alcanzan: "ningún attachment de
  la asignación pertenece al participante" requiere consultar otras tablas, que un CHECK no puede.

## Recomendación para quien trabaje sobre esto

Antes de modificar cualquier regla de asignación o votación, **leer
`internal/storage/migrations/004_constraints_and_triggers.go`**. Si la regla existe en los dos
lados, cambiar los dos en la misma story.

## Referencias

- Implementación: `api/internal/storage/migrations/004_constraints_and_triggers.go`
- Esquema completo: `docs/db-schemas/telescopio_db.md`
- Consecuencia documentada: D-10 en `docs/prd/requirements.md`
