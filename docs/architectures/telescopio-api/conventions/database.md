---
id: database
display_name: Acceso a base de datos (GORM + migraciones en Go)
language: golang
description: ORM-based data access with GORM, repositories per entity, and business rules enforced by Postgres triggers
applies_to: [api]
required_by: []
package: gorm.io/gorm
---

# Database (Go, GORM)

> **Reemplaza la convención del catálogo.** El catálogo recomienda sqlc + pgx (SQL-first,
> sin ORM). Este servicio usa **GORM**. Escribir queries con sqlc produciría código
> incompatible con el resto del repositorio.

## Paquetes

```
gorm.io/gorm                    # ORM
gorm.io/driver/postgres         # driver
github.com/lib/pq               # pq.StringArray para columnas uuid[]
github.com/google/uuid          # UUIDs
```

## Estructura

```
internal/
├── domain/{módulo}/            # entidades con tags gorm + json
└── storage/
    ├── postgres/
    │   ├── database.go         # conexión, pool, health check
    │   ├── repository.go       # interfaces de todos los repositorios
    │   └── {entidad}_repository.go
    └── migrations/
        ├── migrations.go       # registro ordenado
        ├── models.go           # AllModels() para AutoMigrate
        └── NNN_{descripción}.go
```

## Entidades

Las entidades de dominio llevan los tags de GORM **y** de JSON en el mismo campo:

```go
type Event struct {
    ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
    Name        string    `json:"name" gorm:"not null"`
    Stage       Stage     `json:"stage" gorm:"type:event_stage;not null;default:'creation'"`
    MaxParticipants *int  `json:"max_participants,omitempty" gorm:"default:null"`
    CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (Event) TableName() string { return "events" }

func (e *Event) BeforeCreate(tx *gorm.DB) error {
    if e.ID == uuid.Nil { e.ID = uuid.New() }
    return nil
}
```

Reglas:

- `TableName()` explícito siempre. No se confía en la pluralización automática.
- `BeforeCreate` que asigna UUID si viene nulo, en toda entidad.
- Campos opcionales como puntero (`*int`, `*time.Time`, `*string`), no como valor cero.
- Los enums de Postgres se modelan como un tipo `string` con `Scan`/`Value`
  (`driver.Valuer` + `sql.Scanner`). Ver `event.Stage`.
- Los campos JSONB se modelan con un tipo propio que implementa `Scan`/`Value`.
  Ver `vote.AttachmentResultSlice`, `vote.ParticipantQualityMap`, `vote.DraftRankings`.
- Los arrays de UUID usan `pq.StringArray` con `gorm:"type:uuid[]"`.

**Nota:** estas structs son a la vez modelo de persistencia y contrato JSON de la API.
Es compacto pero acopla las dos cosas: cambiar un nombre de columna cambia la respuesta
HTTP. En handlers nuevos, construí el payload de respuesta aparte en vez de serializar
la entidad.

## Repositorios

La interfaz se declara en `internal/storage/postgres/repository.go` y la implementación
en `{entidad}_repository.go`:

```go
type EventRepository interface {
    Create(event *event.Event) error
    GetByID(id string) (*event.Event, error)
    UpdateStage(eventID string, stage event.Stage) error
    // ...
}

func NewPostgresEventRepository(db *gorm.DB) EventRepository { /* ... */ }
```

Los IDs se pasan como `string`, no como `uuid.UUID` — es la convención del repositorio
existente. Las firmas **no reciben `context.Context`**, a diferencia de lo que pide el
catálogo.

## Migraciones

Son Go, no SQL. Cada una es un par `Up`/`Down` registrado en orden en `GetMigrations()`:

```go
func migration016Up(db *gorm.DB) error {
    return db.Exec(`CREATE TABLE vote_drafts (...)`).Error
}
func migration016Down(db *gorm.DB) error {
    return db.Exec(`DROP TABLE IF EXISTS vote_drafts`).Error
}
```

- Se ejecutan automáticamente al arrancar (`postgres.AutoMigrate`).
- La migración `002` crea las tablas vía `db.AutoMigrate(AllModels()...)`; el resto son
  ALTERs explícitos. **Si agregás un campo a una entidad, agregá también su migración** —
  no alcanza con el tag de GORM para una base ya existente.
- Numeración correlativa de tres dígitos: `NNN_descripción.go`.
- `Down` siempre implementado.

### Ejecutarlas a mano

Además del arranque automático, existe un CLI dedicado en `cmd/migrate/`:

```bash
go run ./cmd/migrate              # aplica las migraciones pendientes
go run ./cmd/migrate -rollback    # revierte la última
```

Usa la misma configuración de entorno que la API. Sirve para preparar una base sin levantar
el servidor, y para revertir en desarrollo — el arranque de la API solo aplica hacia
adelante, nunca revierte.

## Reglas de negocio en triggers — leer antes de tocar votación

**Una parte central de las invariantes vive en PostgreSQL**
(`migrations/004_constraints_and_triggers.go`), no en Go:

| Trigger | Sobre | Qué impone |
|---|---|---|
| `validate_assignment_constraints` | `assignments` | Exactamente `m` attachments; que existan y sean del evento; **nadie evalúa lo propio** |
| `validate_vote_constraints` | `votes` | Que exista asignación; que el attachment esté asignado; `rank_position ≤ m`; calcula `score` si viene nulo |
| `update_assignment_completion` | `votes` | Marca/desmarca `is_completed` según la cantidad de votos |
| `update_attachment_vote_count` | `votes` | Mantiene `attachments.vote_count` |

Más CHECK constraints: formato de email, `file_size ≤ 100MB`, `attachments_per_evaluator`
entre 1 y 50, `quality_good_threshold − quality_bad_threshold ≥ 0.1`, `rank_position > 0`.

Implicancias concretas:

1. **El conflicto de interés se valida dos veces** — en `VotingService.hasConflictOfInterest`
   y en el trigger. Si cambiás la regla, cambiá las dos.
2. **`attachments.vote_count` no se toca desde Go.** Lo mantiene el trigger.
3. **Un trigger que falla llega como error crudo de Postgres**, sin la forma de error de
   la API. Si necesitás un mensaje útil, validá antes en Go.
4. **Los tests de integración que insertan directo van a chocar con los triggers.** Los
   datos de prueba tienen que ser coherentes con la configuración de votación del evento.

## Conexión

`postgres.Connect(cfg)` con pool (100 abiertas, 10 idle, 1h de vida), 3 reintentos con
backoff exponencial, `PrepareStmt` activado y timestamps en UTC. El logger de GORM está
en `Info` cuando `GIN_MODE=debug` y en `Silent` en el resto.

Existe una variable global `postgres.DB` que se setea al conectar. **No la uses**: las
dependencias se inyectan por constructor. Está ahí por razones históricas y `_base`
prohíbe el estado global mutable.
