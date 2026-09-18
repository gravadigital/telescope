# telescopio-api — Overview

## Propósito

Backend del sistema de asignación de tiempo de telescopio. Es el único servicio con
estado del producto: gestiona los eventos de convocatoria, la identidad de los
usuarios, las propuestas que se suben y el **motor de votación distribuida por pares**
que produce el ranking final.

## Tipo de servicio

API REST (`type: api`), Go 1.26.6, expuesta bajo `/api/v1` más un `/health` fuera del
prefijo. No consume otros servicios del producto ni participa de un bus de eventos:
la comunicación es siempre entrante desde el frontend.

## Módulos de dominio

| Módulo | Paquete | Responsabilidad |
|---|---|---|
| `event` | `internal/domain/event` | Evento, máquina de estados de etapas, rol del participante dentro del evento |
| `participant` | `internal/domain/participant` | Usuario, roles globales, password (bcrypt), token de recuperación |
| `attachment` | `internal/domain/attachment` | Propuesta subida por un participante |
| `vote` | `internal/domain/vote` | Asignación, voto, borrador, configuración y resultados. Contiene `VotingService` |
| `email` | `internal/email` | Notificaciones SMTP (cambio de etapa, cancelación, reset de password) |

La organización es por capacidad de dominio, coincidiendo con lo que pide `_base`.
La diferencia con el catálogo es que las entidades viven en `internal/domain/{módulo}`
y los handlers HTTP están agrupados aparte en `internal/handlers/`, en vez de tener
`handler.go` + `service.go` dentro de cada paquete de módulo.

## El núcleo: votación distribuida (Merrifield & Saari, 2009)

Toda la razón de ser del servicio está en `internal/domain/vote/voting_service.go`.
Quien vaya a tocar algo de votación necesita entender esto antes:

1. **Asignación** — reparte `m` propuestas a cada uno de `n` participantes sobre `k`
   propuestas totales, garantizando que nadie evalúe la propia (`m ≤ k-1`) y que cada
   propuesta reciba un mínimo de evaluaciones. Exige `m ≥ 2·log₂(k)` para convergencia,
   relajado al 60% del máximo posible cuando `k ≤ 10`.
2. **MBC** — `MBC(f) = (1/(m(m-1))) · Σ(m − R_i(f))`, normalizado a `[0,1]`. Produce el
   ranking global `G`. Los empates se rompen por cantidad de votos y luego por UUID,
   para que el orden sea determinístico.
3. **Calidad del evaluador** — `Q_i = 1 − (2/(m(m-1))) · Σ|R_i(f) − RelativeRank_G(f, A(p_i))|`.
   Mide la desviación del evaluador respecto del consenso, restringida a lo que le tocó.
   Quien no completa su asignación recibe `Q_i = 0`.
4. **Incentivos** — la propuesta de un buen evaluador sube `n` posiciones; la de uno
   malo baja `n`. Evaluar bien mejora la posición de la propuesta propia: ese es el
   mecanismo que sostiene la calidad del sistema.

Los parámetros (`m`, umbrales de calidad, magnitud del ajuste, mínimo de evaluaciones)
se configuran por evento en `voting_configurations`.

## Particularidad crítica: reglas de negocio en la base de datos

**Una parte sustancial de las invariantes no está en Go sino en triggers de PostgreSQL**
(`internal/storage/migrations/004_constraints_and_triggers.go`). Esto no es visible
leyendo el código de la aplicación:

| Regla | Mecanismo |
|---|---|
| La asignación debe tener exactamente `m` attachments | trigger `validate_assignment_constraints` |
| Nadie evalúa su propia propuesta | trigger `validate_assignment_constraints` |
| Solo se vota lo que fue asignado | trigger `validate_vote_constraints` |
| `rank_position ≤ m` | trigger `validate_vote_constraints` |
| Cálculo del score Borda si no viene | trigger `validate_vote_constraints` |
| Marcado automático de asignación completa | trigger `update_assignment_completion` |
| Mantenimiento de `attachments.vote_count` | trigger `update_attachment_vote_count` |

Más CHECK constraints sobre formato de email, tamaño de archivo (≤100MB), rangos de los
parámetros de votación y coherencia de los umbrales.

**Consecuencias para quien implemente:**

- El conflicto de interés está validado **dos veces**: en Go (`hasConflictOfInterest`)
  y en la base. Cambiar solo una de las dos deja el sistema inconsistente.
- Una violación de trigger aparece como `RAISE EXCEPTION` de Postgres, que **no** tiene
  la forma de error de la API. Llega como `500` genérico.
- Un test de integración que inserte directo en la base va a chocar con estos triggers.
- `attachments.vote_count` no se actualiza desde Go: se mantiene solo.

## Storage de archivos intercambiable

La interfaz `FileStorage` (`internal/storage/file_storage.go`) abstrae dos backends
elegidos por `STORAGE_PROVIDER`: filesystem local o MinIO (S3-compatible). Los handlers
no conocen cuál está activo. Ver la convención custom `file-storage`.

## Integraciones externas

| Integración | Uso | Configuración |
|---|---|---|
| PostgreSQL | Todo el estado. Pool de 100 conexiones, reintentos con backoff al arrancar | `DB_*` |
| MinIO | Almacenamiento de propuestas (opcional) | `STORAGE_PROVIDER=minio`, `MINIO_*` |
| SMTP | Notificaciones. Implementa AUTH LOGIN a mano porque el `net/smtp` de Go solo hace AUTH PLAIN | `EMAIL_ENABLED`, `SMTP_*` |
| Google OAuth | Verificación de tokens de identidad | `GOOGLE_CLIENT_ID` |

## Deuda técnica conocida

Relevada del código, para que no se confunda con decisión de diseño:

1. **`GET /api/v1/attachments/:attachment_id/download` no tiene autenticación.** Está
   registrado en el grupo `/api/v1` en vez del grupo `events`, que es el que aplica
   `JWTAuthMiddleware` (`cmd/api/main.go:219`). El comentario del código dice
   "Available to authenticated users", pero en los hechos cualquiera con el UUID de un
   attachment descarga la propuesta. **Es una exposición de datos, no un detalle.**
2. **`GET /events/:event_id/distributed-results` muta estado**: recalcula el MBC y hace
   upsert en `voting_results`. Un GET no idempotente.
3. **Cuatro formatos de error distintos** conviviendo — ver la convención custom
   `error-handling`, que documenta cuál es el objetivo y cuál es el estado actual.
4. **Umbrales de calidad duplicados**: `voting-statistics` tiene `0.7`/`0.3` hardcodeados,
   distintos de los configurables por evento.
5. **`GET /users/:user_id` no verifica ownership**: cualquier usuario autenticado lee
   cualquier otro usuario.
6. **Paginación en memoria con N+1**: `GET /events` trae todo y pagina después, haciendo
   una consulta de participantes por evento.
7. **Handlers implementados sin rutas**: `UpdateEvent`/`DeleteEvent` (devuelven 501),
   `GetVotingConfiguration`, `UpdateVotingConfiguration`, `DeleteVotingConfiguration`,
   `PreviewVotingConfiguration`, `GetAttachment`, `DeleteAttachment`, `RemoveParticipant`.
8. **Código sin `gofmt`**: hay bloques con indentación rota que hacen difícil leer el
   control de flujo (por ejemplo `event_handler.go:196-207`, cuya lógica es correcta pero
   parece rota). `_base` exige `gofumpt`.
9. **JWT secret con default hardcodeado**: si falta `JWT_SECRET` arranca igual con
   `"telescopio-dev-secret-change-in-production"` y solo imprime un warning.
