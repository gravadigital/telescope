# ADR-004: Gin y GORM en el backend, divergiendo del catálogo de convenciones

**Estado:** Aceptado (implementado)
**Fecha:** 2026-09-18 (documentado retroactivamente)
**Detectado desde:** `api`
**Tags:** stack, backend, convenciones

---

## Contexto

El catálogo de convenciones Go del workflow recomienda **chi** como router y **sqlc + pgx**
(SQL-first, sin ORM) para el acceso a datos. El servicio usa **Gin** y **GORM**.

Esta divergencia explica por qué 9 de las 10 convenciones de `api` son custom, y por
qué una story que asuma los patrones del catálogo va a chocar con el código real.

## Decisión

**Gin 1.10.1** como framework HTTP y **GORM 1.30.2** como ORM.

- **Gin** aporta binding y validación de request integrados (tags `binding:"required"` en los
  DTOs), middlewares componibles y agrupación de rutas. El wiring de dependencias es manual y
  explícito en `cmd/api/main.go`, sin framework de inyección.
- **GORM** aporta `AutoMigrate` (usado en la migración 002 para crear las tablas), mapeo por tags
  y manejo del pool de conexiones (configurado en 100 máximo).

**Implementado en:**
- `api` — `cmd/api/main.go` arma todo el router; `internal/storage/postgres/` contiene
  los repositorios; las entidades de dominio llevan los tags de GORM

## Consecuencias

### Positivas

- **Menos código de infraestructura.** El binding y la validación de request vienen resueltos; los
  repositorios no escriben SQL para las operaciones CRUD.
- **Ecosistema maduro.** Ambas son de las librerías más usadas de Go: documentación abundante y
  respuestas fáciles de encontrar.
- **Las migraciones de creación de tablas se derivan de los modelos** vía `AutoMigrate`, sin
  mantener DDL a mano para el esquema inicial.

### Negativas

- **9 de 10 convenciones del servicio son custom.** El catálogo no aplica, así que cada patrón
  tuvo que documentarse desde cero en `docs/architectures/api/conventions/`.
- **El SQL queda implícito.** Con sqlc las consultas son explícitas y verificadas en tiempo de
  compilación contra el esquema; con GORM se generan en runtime. Un problema de performance
  (N+1, índice no usado) es más difícil de ver leyendo el código.
- **`AutoMigrate` y las migraciones explícitas conviven**, y eso ya produjo deuda concreta: el
  modelo que crea `voting_configurations` declara columnas
  (`use_expertise_matching`, `enable_co_idetection`, `randomization_seed`, …) que la entidad de
  dominio no conoce. **Existen en la base y nadie las lee ni las escribe.** Lo mismo en
  `voting_results`. Ver ADR-005, que documenta la causa raíz.
- **Migrar a chi/sqlc sería un proyecto en sí**, no una refactorización incremental.

## Alternativas Consideradas

**No hay registro del rationale original.** Alternativas objetivas:

- **chi + sqlc/pgx** (lo que recomienda el catálogo) — SQL explícito y verificado en compilación,
  router minimalista sobre `net/http`. Más código de infraestructura a cambio de control y
  visibilidad del SQL.
- **`net/http` de la librería estándar** (con Go 1.22+ el router estándar ya soporta patrones de
  ruta) — Sin dependencias, a costa de escribir binding y validación a mano.
- **Ent o sqlboiler** como ORM alternativo — Mismo trade-off que GORM con otro estilo de API.

## Referencias

- Convenciones custom: `docs/architectures/api/conventions/`
- Manifest: `docs/architectures/api/manifest.yaml`
- Catálogo Go del workflow: `.claude/conventions/`
