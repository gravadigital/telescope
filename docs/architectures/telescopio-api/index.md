# Arquitectura: telescopio-api

API REST en Go 1.26.6 (Gin + GORM + PostgreSQL). Backend del sistema de asignación de
tiempo de telescopio, con motor de votación distribuida por pares.

| | |
|---|---|
| **Manifest** | [manifest.yaml](./manifest.yaml) |
| **Overview** | [overview.md](./overview.md) — propósito, módulos, el algoritmo de votación, reglas en triggers, deuda técnica |
| **Tipo** | `api` · **Lenguaje** `golang` |

## Convenciones activas

`_base` (catálogo) se incluye siempre. `error-handling` se auto-incluye por `required_by`.

| Convención | Origen | Detalle |
|---|---|---|
| [`http-server`](./conventions/http-server.md) | **custom** | Gin en vez de chi. Rutas centralizadas en `main.go`, permisos por middleware compuesto |
| [`database`](./conventions/database.md) | **custom** | GORM + migraciones en Go en vez de sqlc + pgx. **Reglas de negocio en triggers de Postgres** |
| [`error-handling`](./conventions/error-handling.md) | **custom** | `gin.H` inline con `code`, sin tipo `errs`. Cuatro formas heredadas conviviendo |
| [`validation`](./conventions/validation.md) | **custom** | Binding de Gin + validación manual de path params y reglas de negocio |
| [`auth-jwt`](./conventions/auth-jwt.md) | **custom** | Mismo paquete que el catálogo, pero emite tokens y tiene roles en dos niveles |
| [`logging`](./conventions/logging.md) | **custom** | `charmbracelet/log` en vez de zerolog. Salida no-JSON |
| [`config`](./conventions/config.md) | **custom** | `os.Getenv` manual + godotenv, sin validación al arranque |
| [`testing`](./conventions/testing.md) | **custom** | Solo integración con build tag. Sin unit tests del algoritmo |
| [`file-storage`](./conventions/file-storage.md) | **custom** | No existe en el catálogo. Local o MinIO tras una interfaz |
| `dockerfile` | catálogo | Multi-stage, binario estático, `scratch`, usuario no-root |

**Nueve de diez convenciones son custom.** El servicio sigue su propio stack de forma
consistente; lo que no sigue es el stack recomendado por el catálogo Go. Documentarlo así
es lo que permite que `/service-planify-story` planifique contra Gin y GORM, y no contra
chi y sqlc.

## No aplican a este servicio

`messaging` (no hay bus de eventos), `observability` (no hay tracing ni métricas),
`ci-gitlab` (no hay pipeline de CI en el repositorio todavía).

## Documentación relacionada

- [API Specification](../../apis/telescopio-api.yaml) — OpenAPI 3.0, 31 endpoints
- [Database Schema](../../db-schemas/telescopio_db.md) — entidades, relaciones, triggers
- [Análisis del servicio](../../analysis/services/telescopio-api.md) — insumo de consolidación
