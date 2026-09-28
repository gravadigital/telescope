---
id: testing
display_name: Testing (testify + mocks manuales)
language: golang
description: Table-driven unit tests with hand-written mocks, plus integration tests behind a build tag
applies_to: [api]
required_by: []
package: github.com/stretchr/testify
---

# Testing (api)

Mismo paquete de aserciones que el catálogo (`testify`), pero el enfoque de mocking es
distinto: **mocks escritos a mano**, sin `mockery` ni generación de código, y sin
testcontainers.

## Estructura

```
internal/
├── domain/vote/
│   ├── mocks_test.go              # fakes de VoteRepository, AttachmentRepository, UserRepository
│   └── voting_service_test.go     # el algoritmo de votación
└── handlers/
    ├── mocks_repository_test.go   # fakes de todos los repositorios
    ├── mocks_storage_test.go      # fake de FileStorage
    ├── event_handler_test.go
    ├── distributed_vote_handler_test.go
    ├── attachment_handler_test.go
    ├── user_handler_test.go
    ├── google_auth_handler_test.go
    └── vote_draft_handler_test.go

cmd/api/integration_test.go        # conexión y migraciones, detrás de build tag
```

**Los tests unitarios no necesitan base de datos ni red.** Corren con `go test ./...` en
menos de un segundo.

Desde la raíz del repo:

```bash
make test               # go vet + go test -race ./... (y los tests de web)
make test-integration   # levanta la base del stack local y corre -tags=integration
```

O desde `api/`, con `go test ./...` directo para los unitarios.

## Mocks

Los dobles se escriben a mano en archivos `mocks_*_test.go`, compartidos por todos los tests
del paquete. El patrón es un struct con funciones inyectables:

```go
type mockEventRepository struct {
    GetByIDFunc func(id string) (*event.Event, error)
    CreateFunc  func(e *event.Event) error
}

func (m *mockEventRepository) GetByID(id string) (*event.Event, error) {
    if m.GetByIDFunc != nil {
        return m.GetByIDFunc(id)
    }
    return nil, errors.New("not implemented")
}
```

Cada test define solo los métodos que le importan. **Al agregar un método a una interfaz de
repositorio, hay que agregarlo también al mock** o el paquete de tests deja de compilar.

### Dependencias inyectables para testear

Cuando una dependencia es una llamada de red directa, se expone como campo del handler para
poder sustituirla. `GoogleAuthHandler` lo hace con la verificación del token:

```go
type GoogleAuthHandler struct {
    // ...
    // verifyToken validates a Google access token and returns the caller's
    // profile. Defaults to the real network call (verifyGoogleAccessToken);
    // swappable in tests to avoid hitting Google's API.
    verifyToken func(accessToken string) (*GoogleProfile, error)
}
```

El constructor asigna la implementación real; el test asigna una función propia. **Seguí este
patrón** cuando agregues una integración externa: sin eso, el handler no es testeable.

## Tests de handler

Se prueban contra un router de Gin en modo test, con `httptest`:

```go
gin.SetMode(gin.TestMode)
router := gin.New()
router.POST("/events", handler.CreateEvent)

w := httptest.NewRecorder()
req := httptest.NewRequest(http.MethodPost, "/events", bytes.NewBufferString(body))
router.ServeHTTP(w, req)

assert.Equal(t, http.StatusCreated, w.Code)
```

Table-driven, un subtest por caso con `t.Run`. `assert` para seguir tras el fallo, `require`
cuando el resto del test no tendría sentido.

**Verificá el `code` del error, no solo el status.** Es el identificador estable del contrato
(ver `error-handling`); el mensaje puede cambiar.

## Tests del dominio

`internal/domain/vote/voting_service_test.go` cubre el algoritmo: generación de asignaciones,
Modified Borda Count, cálculo de calidad del evaluador y sistema de incentivos.

Al tocar `voting_service.go`, **estos tests son la red de seguridad principal del producto**.
Dos invariantes que ya están cubiertas y no deben romperse:

1. **Nadie evalúa su propia propuesta** (conflicto de interés).
2. **Nadie recibe más de `m` propuestas.** La fase 1 lleva un contador
   `assignmentsPerParticipant` justamente para respetar el tope; si se rompe, las escrituras
   fallan contra el trigger `validate_assignment_constraints` de Postgres.

## Tests de integración

Detrás de `//go:build integration`, para que `go test ./...` siga siendo rápido y sin
dependencias. Hoy cubren conexión y migraciones. La base de prueba se selecciona con
`TEST_DB_NAME`: `make test-integration` crea `telescope_test` dentro del PostgreSQL del stack
local y la usa, así nunca corre migraciones sobre la base de desarrollo. No corren en CI.

**Ojo con los triggers**: la base impone reglas propias (ver `database`). Los datos de prueba
tienen que ser coherentes con la `voting_configuration` del evento, o el `INSERT` falla con un
error de plpgsql poco descriptivo.

## Qué falta

- Los middlewares de `internal/middleware/auth` (JWT y permisos) no tienen tests.
- Los repositorios de `internal/storage/postgres` tampoco.
