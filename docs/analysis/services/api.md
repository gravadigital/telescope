# Análisis de Servicio: api

> Documento temporal generado por `/product-analyze-service`.
> Insumo para `/product-consolidate-services`, que produce el PRD consolidado.

## Identificación

| | |
|---|---|
| **Nombre** | `api` |
| **Módulo Go** | `github.com/gravadigital/api` |
| **Tipo** | Backend (API REST) |
| **Path** | `api/` (monorepo `telescope`) |
| **Lenguaje** | Go 1.26.6 |
| **Framework HTTP** | Gin 1.10.1 |
| **Base de datos** | PostgreSQL (vía GORM 1.30.2) |
| **Storage de archivos** | Local o MinIO (intercambiable por configuración) |

### Propósito

Backend del sistema de asignación de tiempo de telescopio. Gestiona eventos de
convocatoria, la participación de los investigadores, la carga de propuestas
(attachments) y — el núcleo del producto — un **sistema de votación distribuida
por pares** que produce un ranking de las propuestas.

### Responsabilidad

Es el único servicio que posee estado. Concentra:

- El ciclo de vida de los eventos y sus transiciones de etapa.
- La identidad de los usuarios (password propio y Google OAuth).
- El almacenamiento de las propuestas.
- **El algoritmo de votación distribuida y el cálculo de resultados.**

El frontend (`web`) no tiene lógica de negocio propia: consume esta API.

---

## El núcleo: votación distribuida con Modified Borda Count

Esta es la razón de existir del producto y la parte que más importa entender.
Implementado en `internal/domain/vote/voting_service.go`, siguiendo el modelo de
**Merrifield & Saari (2009)** para revisión por pares distribuida.

El problema que resuelve: cuando hay muchas propuestas y ningún comité puede
leerlas todas, se reparte la evaluación entre los propios participantes. Eso
abre dos problemas — que alguien evalúe su propia propuesta, y que alguien
evalúe mal (por desinterés o por conveniencia). El algoritmo ataca los dos.

### 1. Asignación (`GenerateAssignments`)

Reparte `m` propuestas a cada uno de los `n` participantes, sobre un total de `k`
propuestas.

- **Conflicto de interés duro**: nadie recibe su propia propuesta. Por eso el
  máximo posible es `m ≤ k-1` (`voting_service.go:38-46`).
- **Cobertura mínima con tope por participante**: primero se busca que cada propuesta reciba
  al menos `min_evaluations_per_file` evaluaciones, después se completa hasta `m` por
  participante. La fase 1 lleva un contador `assignmentsPerParticipant` y **saltea a quien ya
  llegó a `m`**, de modo que un archivo puede quedar por debajo del mínimo si no hay
  suficientes evaluadores elegibles bajo el tope. Es un trade-off deliberado: exceder `m`
  haría fallar el trigger `validate_assignment_constraints` de Postgres.
- **Validación de convergencia**: se exige `m ≥ 2·log₂(k)`, la condición de
  convergencia del paper. Para `k ≤ 10` se relaja al 60% del máximo posible,
  porque la fórmula está pensada para volúmenes grandes (`voting_service.go:48-69`).

### 2. Puntaje de la propuesta (`CalculateModifiedBordaCount`)

```
MBC(f_j) = (1 / (m(m-1))) · Σ (m − R_i(f_j))
```

Donde `R_i(f_j)` es la posición que el evaluador `i` le dio a la propuesta `f_j`
(1 = mejor). La normalización por `m(m-1)` deja el resultado en `[0,1]`. El orden
resultante es el **ranking global G**. Los empates se rompen por cantidad de votos
y, si persisten, por UUID — para que el orden sea determinístico
(`voting_service.go:212-222`).

### 3. Calidad del evaluador (`calculateParticipantQualities`)

```
Q_i = 1 − (2 / (m(m-1))) · Σ |R_i(f_j) − RelativeRank_G(f_j, A(p_i))|
```

Mide cuánto se aparta el ranking de un evaluador del ranking global **restringido
al subconjunto que le tocó evaluar**. Un evaluador que coincide con el consenso
tiene `Q_i` cercano a 1. El resultado se recorta a `[0,1]`.

Quien no completó su asignación recibe `Q_i = 0` (`voting_service.go:278-281`).

### 4. Incentivos (`applyIncentiveSystem`)

El ranking global `G` se ajusta a `G'`: la propuesta de un evaluador con
`Q_i ≥ quality_good_threshold` sube `n` posiciones; la de uno con
`Q_i ≤ quality_bad_threshold` baja `n`. Es decir, **evaluar bien mejora la
posición de tu propia propuesta**. Ese es el mecanismo que hace que convenga
evaluar en serio.

### Parámetros configurables por evento

| Parámetro | Campo | Default |
|---|---|---|
| Propuestas por evaluador (`m`) | `attachments_per_evaluator` | — (obligatorio) |
| Umbral de buen evaluador | `quality_good_threshold` | `0.6` |
| Umbral de mal evaluador | `quality_bad_threshold` | `0.3` |
| Magnitud del ajuste (`n`) | `adjustment_magnitude` | `3` |
| Evaluaciones mínimas por propuesta | `min_evaluations_per_file` | `3` |

---

## Features principales por dominio

### Eventos (`internal/domain/event`)

- Creación de evento con nombre, descripción, fechas, organizador y cupo opcional.
- **Máquina de estados de etapas**: `creation → participation → voting → results`.
  Las transiciones están validadas en el dominio y no admiten retroceso ni saltos
  (`events.go:69-92`).
- Cancelación y pausa/reanudación del evento (flags independientes de la etapa).
- Link compartible (`/events/{id}`) generado al crear.
- Fechas estimadas de fin de participación y de votación.
- Notificación por email al cambiar de etapa y al cancelar.

### Usuarios y autenticación (`internal/domain/participant`)

- Registro con email y password (bcrypt, mínimo 8 caracteres).
- Login que devuelve JWT HS256 con vigencia de 24 horas.
- **Google OAuth**: verificación de token y registro de usuario Google.
  Un usuario Google puede no tener password (`password_hash` es nullable).
- Recuperación de password: token aleatorio de 32 bytes con expiración de 1 hora.
- **Dos niveles de rol**:
  - Rol global (`users.role`): `admin`, `organizer`, `participant`.
  - Rol por evento (`event_participants.role`): `creator`, `participant`.

### Participación

- Registro público a un evento vía link compartible: si el email no existe, se
  crea el usuario en el acto.
- Listado de participantes del evento con su rol.
- Listado de eventos en los que participa un usuario.

### Propuestas / Attachments (`internal/domain/attachment`)

- Upload de archivo por participante dentro de un evento.
- Descarga por id.
- Storage intercambiable mediante la interfaz `FileStorage`: backend **local**
  (filesystem) o **MinIO** (S3-compatible), elegido por `STORAGE_PROVIDER`.

### Votación (`internal/domain/vote`)

- Configuración de los parámetros matemáticos por evento.
- Generación de asignaciones.
- Consulta de la asignación de un participante.
- Envío del ranking de votos.
- **Borradores de voto**: guardado parcial del ranking antes de enviarlo, para no
  perder el progreso al abandonar la página. Uno por par (asignación, participante).
- Resultados distribuidos y estadísticas de votación.

---

## Decisiones técnicas identificadas

### 1. Gin como framework HTTP

Router maduro con binding y validación integrados. El wiring es manual y explícito
en `cmd/api/main.go`, sin framework de inyección de dependencias.

**Consecuencia documentada:** diverge del catálogo de convenciones Go, que
recomienda chi.

### 2. GORM como ORM

Las entidades de dominio llevan los tags de GORM directamente: las mismas structs
son modelo de persistencia y contrato JSON de la API (tags `json` y `gorm` en el
mismo campo). Esto acopla el esquema de base de datos con la forma de la respuesta
HTTP, pero mantiene el código compacto.

**Consecuencia documentada:** diverge del catálogo, que recomienda sqlc + pgx
(SQL-first, sin ORM).

### 3. Lógica de negocio en triggers de PostgreSQL

**Esta es la decisión arquitectónica más importante y la menos visible.**

Una porción sustancial de las reglas no está en Go sino en funciones plpgsql y
triggers (`internal/storage/migrations/004_constraints_and_triggers.go`):

| Regla | Dónde vive |
|---|---|
| La asignación debe tener exactamente `m` attachments | trigger `validate_assignment_constraints` |
| Nadie puede evaluar su propia propuesta | trigger `validate_assignment_constraints` |
| Solo se vota lo que fue asignado | trigger `validate_vote_constraints` |
| `rank_position` no puede exceder `m` | trigger `validate_vote_constraints` |
| Cálculo del score Borda si no viene | trigger `validate_vote_constraints` |
| Marcado automático de asignación completa | trigger `update_assignment_completion` |
| Mantenimiento de `attachments.vote_count` | trigger `update_attachment_vote_count` |

Además hay CHECK constraints sobre formato de email, tamaño de archivo, rangos de
los parámetros de votación y coherencia de los umbrales.

**Por qué importa:** el conflicto de interés está validado **dos veces** — en Go
(`hasConflictOfInterest`) y en la base. Un desarrollador que solo lea el código Go
no ve la mitad de las reglas, y una escritura directa contra la base falla con un
`RAISE EXCEPTION` de Postgres que no tiene la forma de error de la API.

### 4. Migraciones versionadas en Go, no en SQL

20 migraciones con `Up`/`Down` en `internal/storage/migrations/`, ejecutadas al
arrancar. La creación de tablas (migración 002) delega en `AutoMigrate` de GORM
sobre los modelos; el resto son ALTERs explícitos.

Hay evidencia de evolución real del modelo: unificación de las etapas
`registration` + `attachment_upload` en `participation` (012), incorporación de
roles por evento (010), borradores de voto (016), Google OAuth (017).

### 5. Storage de archivos abstraído

La interfaz `FileStorage` permite correr en local sin MinIO y usar MinIO en
producción sin tocar el código de los handlers.

### 6. Autenticación JWT con permisos por middleware

El JWT lleva `user_id`, `email` y `role`. La autorización se compone declarando
middlewares en la ruta: `RequireEventOwner`, `RequireEventOwnerOrOrganizer`,
`RequireParticipantOrOwner`. Los admins saltean todas las verificaciones.

---

## Interfaces

### Expone

| Tipo | Detalle |
|---|---|
| REST API | `/api/v1` — 30 endpoints. Autenticación JWT Bearer en los protegidos |
| Health check | `GET /health` — incluye verificación de conectividad con la base |

Agrupación de endpoints por dominio: usuarios y auth (6), Google OAuth (2),
eventos (10), attachments (3), votación distribuida (6), borradores de voto (2).

### Consume

| Tipo | Target | Detalle |
|---|---|---|
| Base de datos | PostgreSQL | Estado completo del sistema. Pool configurado (100 conexiones máx.) |
| Object storage | MinIO | Opcional — alternativa al filesystem local |
| SMTP | Servidor de correo configurable | Notificaciones de etapa, cancelación, reset de password |
| API externa | Google OAuth | Verificación de tokens de identidad |

**No consume otros servicios del producto.** No hay llamadas HTTP salientes a
otros servicios propios, ni publicación ni consumo de eventos en un bus.

---

## Flujos detectados (parciales)

No hay integraciones servicio-a-servicio dentro del producto: la arquitectura es
un único backend con un frontend que lo consume. Los flujos cruzados relevantes
para consolidación son:

1. **`web` → `api`**: toda la interacción del usuario.
   El frontend consume la REST API con JWT en el header `Authorization`.
2. **`api` → Google OAuth**: verificación del token de identidad
   durante login/registro con Google.
3. **`api` → SMTP**: emails disparados por cambio de etapa,
   cancelación de evento y solicitud de reset de password.
4. **`api` → MinIO**: persistencia de las propuestas cuando
   `STORAGE_PROVIDER=minio`.

---

## Información para consolidación en el PRD

### Usuarios / audiencias identificadas en el código

| Audiencia | Evidencia en el código |
|---|---|
| **Organizador / creador de evento** | Crea eventos, configura la votación, avanza etapas, cancela y pausa |
| **Participante / investigador** | Se registra, sube su propuesta, evalúa las asignadas, ve resultados |
| **Administrador** | Rol global `admin`, saltea todas las verificaciones de permisos |

### Capacidades a consolidar como feature groups

1. Gestión del ciclo de vida de eventos de convocatoria.
2. Identidad y acceso (password propio + Google OAuth + recuperación).
3. Participación y registro por link compartible.
4. Carga y distribución de propuestas.
5. Motor de votación distribuida por pares (MBC + calidad + incentivos).
6. Resultados y estadísticas.
7. Notificaciones por email.

### Preguntas abiertas para el usuario

Estas no se pueden responder desde el código y necesitan relevamiento:

- ¿Quién es el usuario real del sistema? (observatorio, institución, convocatoria interna)
- ¿El rol global `organizer` se usa en la práctica o quedó desplazado por el rol por evento `creator`?
- ¿Los parámetros matemáticos los define el organizador, o hay valores institucionales fijos?
- ¿Los resultados ajustados (`G'`) son los que se publican, o el ranking global `G` es el oficial?

---

## Documentación generada

| Documento | Path |
|---|---|
| Arquitectura | `docs/architectures/api/` |
| API Specification | `docs/apis/api.yaml` |
| Database Schema | `docs/db-schemas/telescopio_db.md` |
