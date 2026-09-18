---
created: 2026-09-18
last_updated: 2026-09-18
status: Draft - Generado desde código existente
---

# Requerimientos

> **Documento generado por `/product-consolidate-services` a partir del código existente.**
> Los requerimientos describen **lo que el sistema hace hoy**, verificado contra el código, no
> lo que debería hacer. Donde el comportamiento implementado es defectuoso, está marcado
> con ⚠️ y el defecto se describe — no se documenta el comportamiento deseado como si
> existiera. La lista completa de defectos de interfaz está en
> [`docs/ux/gaps-as-is.md`](../ux/gaps-as-is.md).
>
> Referencias: `api/` = `api`, `web/` = `web`.

---

## Entidades de Dominio

Fuente: [`docs/db-schemas/telescopio_db.md`](../db-schemas/telescopio_db.md). Los nombres de
esta sección son el vocabulario único del PRD.

### Usuario (`users`)

- **Atributos clave:** `name` (string, req), `lastname` (string, opt), `email` (string, req,
  unique, CHECK de formato), `password_hash` (string, **nullable** — los usuarios de Google
  OAuth y los creados al registrarse a un evento no tienen), `google_id` (string, unique,
  nullable), `role` (enum: `admin`/`organizer`/`participant`, nullable), `password_reset_token`
  (string(64), unique, nullable), `password_reset_expires_at` (timestamptz, nullable)
- **Relaciones:** has_many Evento (como autor), has_many Participación, has_many Propuesta,
  has_many Asignación, has_many Voto
- **Reglas:** Password con bcrypt, mínimo 8 caracteres. El token de reset es hex de 32 bytes
  con vigencia de 1 hora. ⚠️ **`role` es deuda a eliminar** (ver goals-and-context): el rol
  vigente es el de Participación

### Evento (`events`)

- **Atributos clave:** `name` (string, req), `description` (text, req), `author_id` (uuid, req),
  `start_date` / `end_date` (timestamptz, req, CHECK `end_date >= start_date`), `organizer`
  (string(200), default `''`), `stage` (enum: `creation`/`participation`/`voting`/`results`,
  default `creation`), `max_participants` (int, default 20), `participation_estimated_end_date`
  (date, nullable), `voting_estimated_end_date` (date, nullable), `shareable_link` (string,
  `/events/{id}`), `is_cancelled` (bool, default false), `is_paused` (bool, default false)
- **Relaciones:** belongs_to Usuario (autor), has_many Participación, has_many Propuesta,
  has_one ConfiguracionVotacion, has_many Asignación, has_one ResultadoVotacion
- **Reglas:** La etapa avanza en un solo sentido, sin saltos. `is_cancelled` e `is_paused` son
  independientes de `stage`: un evento puede pausarse en cualquier etapa. El CHECK
  `future_start_date` es `NOT VALID` (solo aplica a filas nuevas o modificadas).
  ⚠️ **`start_date` se autogenera como hoy+1día sin que el usuario lo vea ni lo elija**
  (`CreateEventPage.tsx:43-49`)

### Participación (`event_participants`)

- **Atributos clave:** PK compuesta (`event_id`, `user_id`), `role` (enum: `creator`/
  `participant`, req, default `participant`), `joined_at` (timestamptz)
- **Relaciones:** belongs_to Evento, belongs_to Usuario
- **Reglas:** Es el modelo de roles vigente. Un usuario es `creator` de un evento y
  `participant` de otro. El `creator` es el único que gestiona el evento

### Propuesta (`attachments`)

- **Atributos clave:** `event_id` (uuid, req), `participant_id` (uuid, req), `filename`
  (string, req, generado), `original_name` (string, req, el que subió el usuario), `file_path`
  (string, req — **clave en el storage**, no ruta de filesystem), `file_size` (bigint, req,
  CHECK 1..104857600), `mime_type` (string(100), req), `vote_count` (int, default 0,
  **mantenido por trigger**)
- **Relaciones:** belongs_to Evento, belongs_to Usuario (participante), has_many Voto
- **Reglas:** **Una propuesta por participante por evento**, impuesto por la aplicación.
  ⚠️ **Discrepancia de límite de tamaño**: la base admite 100 MB, el cliente valida 10 MB
  (`EventDetailPage.tsx:135`). El límite efectivo es el del cliente y **no está validado en el
  backend**. Tipos MIME aceptados (whitelist del cliente): JPEG, PNG, GIF, WebP, PDF, TXT,
  DOC, DOCX

### ConfiguracionVotacion (`voting_configurations`)

- **Atributos clave:** `event_id` (uuid, req, **unique**), `attachments_per_evaluator` (int,
  req, CHECK 1..50 — el parámetro **`m`**), `min_evaluations_per_file` (int, req, default 3,
  CHECK > 0), `quality_good_threshold` (decimal(3,2), default 0.6), `quality_bad_threshold`
  (decimal(3,2), default 0.3), `adjustment_magnitude` (int, default 3, CHECK 0..20 — el
  parámetro **`n`**)
- **Relaciones:** belongs_to Evento (1:1)
- **Reglas:** CHECK `valid_quality_thresholds`: `good > bad` **y** la diferencia ≥ 0.1.
  `m` es el único sin default: el frontend lo precarga con el recomendado.
  ⚠️ **Columnas huérfanas**: `use_expertise_matching`, `enable_co_idetection`,
  `randomization_seed`, `assignment_algorithm`, `scoring_algorithm` existen en la base
  (creadas por `migrations/models.go`, con defaults de umbral 0.65/0.35) y **el dominio no las
  lee ni las escribe**

### Asignación (`assignments`)

- **Atributos clave:** `event_id` (uuid, req), `participant_id` (uuid, req), `attachment_ids`
  (uuid[], req), `assignment_round` (int, default 1), `is_completed` (bool, default false,
  **mantenido por trigger**), `completed_at` (timestamptz, nullable, **seteado por trigger**),
  `quality_score` (decimal(5,4), nullable, CHECK [0,1] — es **`Q_i`**),
  `conflict_of_interest` (bool, default false)
- **Relaciones:** belongs_to Evento, belongs_to Usuario (evaluador), has_many Voto,
  has_one BorradorVoto
- **Reglas:** La cantidad de `attachment_ids` debe ser **exactamente** `m`, y ninguno puede ser
  del propio participante — ambas **garantizadas por el trigger**
  `validate_assignment_constraints`, además de en Go.
  ⚠️ `assignment_round` siempre vale 1: no hay múltiples rondas.
  ⚠️ `expertise_match_score` existe y nunca se escribe

### Voto (`votes`)

- **Atributos clave:** `event_id` (uuid, req), `assignment_id` (uuid, req), `voter_id` (uuid,
  req), `attachment_id` (uuid, req), `rank_position` (int, req, CHECK > 0 — **1 = mejor**),
  `score` (decimal(10,4), nullable, **calculado por trigger si viene nulo**)
- **Relaciones:** belongs_to Evento, belongs_to Asignación, belongs_to Usuario (votante),
  belongs_to Propuesta
- **Reglas:** El trigger `validate_vote_constraints` exige que el votante tenga asignación en
  el evento, que la propuesta votada esté en su asignación, y que `rank_position ≤ m`. Si
  `score` es nulo lo calcula como `(m − rank_position + 1) × 100 / m`.
  ⚠️ `confidence`, `evaluation_time_seconds`, `notes` e `is_quality_vote` existen y nunca se
  escriben

### BorradorVoto (`vote_drafts`)

- **Atributos clave:** `event_id`, `assignment_id`, `participant_id` (uuid, req), `rankings`
  (jsonb, req, default `'[]'` — array de `{attachment_id, rank}`)
- **Relaciones:** belongs_to Evento, belongs_to Asignación, belongs_to Usuario
- **Reglas:** UNIQUE (`assignment_id`, `participant_id`) — **un borrador por asignación y
  participante**; el guardado es un upsert sobre esa clave. Única tabla con `ON DELETE CASCADE`

### ResultadoVotacion (`voting_results`)

- **Atributos clave:** `event_id` (uuid, req, **unique**), `global_ranking` (jsonb — el ranking
  **`G`**), `participant_qualities` (jsonb — `{uuid: Q_i}`), `adjusted_ranking` (jsonb — el
  ranking **`G'`** tras incentivos), `total_participants` (int, CHECK > 0), `total_votes` (int,
  CHECK ≥ `total_participants`), `attachments_per_evaluator` (int)
- **Relaciones:** belongs_to Evento (1:1)
- **Reglas:** ⚠️ **No está definido cuál de los dos rankings es el oficial** (pregunta abierta
  #4 del PRD). ⚠️ Columnas huérfanas: `statistical_metrics`, `algorithm_used`,
  `quality_adjustments_applied`, `overall_quality_score`, `good_evaluator_count`,
  `bad_evaluator_count`, `consensus_strength`. El CHECK `valid_evaluator_counts` referencia dos
  de ellas, que quedan en 0 y hacen que el CHECK pase trivialmente

---

## Funcionalidades Principales

### F-01: Identidad y Acceso

**Descripción:** Registro, autenticación y recuperación de contraseña, con dos vías de
identidad (email/password y Google OAuth) que conviven sobre el mismo usuario.

**Historia de Usuario:**
Como investigador que quiere presentarse a una convocatoria,
quiero crear una cuenta o entrar con Google,
para participar sin tener que recordar otra contraseña.

**Capacidades:**

| ID | Capacidad | Actor | Entidad | Operación | Campos Clave | Reglas de Negocio |
|----|-----------|-------|---------|-----------|--------------|-------------------|
| C-01 | Registrarse con email | U-03 Visitante | Usuario | CREATE | `name` (string, req), `lastname` (string, opt), `email` (string, req, unique), `password` (string, req, min 8) | Password con bcrypt DefaultCost. Email con CHECK de formato en base. Email duplicado se rechaza |
| C-02 | Iniciar sesión | U-03 Visitante | Usuario | ACTION | `email`, `password` | Devuelve JWT HS256 con `user_id`, `email`, `role`. Vigencia 24h. ⚠️ Ver defecto D-01 |
| C-03 | Verificar identidad de Google | U-03 Visitante | Usuario | ACTION | `id_token` (string, req) | El front obtiene el token con `@react-oauth/google`; el back lo verifica contra Google. Si el `google_id` ya existe, loguea |
| C-04 | Registrarse con Google | U-03 Visitante | Usuario | CREATE | `id_token`, `name` (string, req) | Si el usuario es nuevo, la UI pide el nombre en un modal antes de registrar. `password_hash` queda nulo |
| C-05 | Solicitar recuperación | U-03 Visitante | Usuario | ACTION | `email` (string, req) | Genera token hex de 32 bytes con expiración de 1h y lo envía por SMTP |
| C-06 | Definir nueva contraseña | U-03 Visitante | Usuario | UPDATE | `token` (string, req, de la query), `password` (string, req, min 8) | El token debe existir y no estar expirado. Se consume al usarse |
| C-07 | Mantener la sesión | U-02 Participante | Usuario | READ | — | Sesión en `localStorage` (`telescopio_user`, `telescopio_token`), restaurada al recargar |
| C-08 | Cerrar sesión ante token expirado | U-02 Participante | Usuario | ACTION | — | Ante un 401, el cliente limpia la sesión y emite `CustomEvent auth:logout`; `AuthContext` desloguea **sin recargar la página** |
| C-09 | Consultar un usuario | U-02 Participante | Usuario | READ | `user_id` (uuid) | ⚠️ Ver defecto D-03 |

**Criterios de Aceptación:**

- DADO que soy visitante sin cuenta
  CUANDO me registro con `email: "ana@obs.org"` y `password: "telescopio2026"`
  ENTONCES se crea el usuario con `password_hash` bcrypt y `role` nulo
  Y puedo iniciar sesión con esas credenciales

- DADO que existe un usuario con `email: "ana@obs.org"`
  CUANDO intento registrarme con ese mismo email
  ENTONCES el sistema rechaza el registro por email duplicado

- DADO que inicié sesión hace 25 horas
  CUANDO hago cualquier request autenticado
  ENTONCES la API responde 401
  Y la interfaz me desloguea sin recargar la página, conservando el contexto de navegación

- DADO que solicité recuperar mi contraseña hace 2 horas
  CUANDO abro `/reset-password?token={token}` y envío una contraseña nueva
  ENTONCES el sistema rechaza el token por expirado (vigencia 1h)

**Prioridad:** Alta
**Dependencias:** Ninguna (base)

---

### F-02: Ciclo de Vida del Evento

**Descripción:** Creación del evento y su avance por cuatro etapas unidireccionales, con
pausa, cancelación y deadlines estimados que solo pueden posponerse.

**Historia de Usuario:**
Como organizador de una convocatoria,
quiero crear un evento y controlar en qué etapa está,
para abrir la recepción de propuestas y la evaluación cuando corresponda.

**Capacidades:**

| ID | Capacidad | Actor | Entidad | Operación | Campos Clave | Reglas de Negocio |
|----|-----------|-------|---------|-----------|--------------|-------------------|
| C-10 | Crear evento | U-02 Participante autenticado | Evento | CREATE | `name` (string, req, 3..200), `description` (text, req, 10..2000), `organizer` (string, opt, max 200), `max_participants` (int, opt, 1..100, default 20) | Cualquier usuario autenticado puede crear. Etapa inicial `creation`. El creador queda como `creator` en Participación. Se genera `shareable_link` = `/events/{id}`. ⚠️ Ver defecto D-04 |
| C-11 | Listar eventos | U-03 Visitante | Evento | READ | filtros client-side: todos / propios / suscripciones | Listado público. Los tabs de filtrado solo aparecen con sesión |
| C-12 | Ver detalle del evento | U-03 Visitante | Evento | READ | `event_id` (uuid) | Público. **El creador es redirigido a `/events/{id}/manage`** comparando `creator_id === user.id` |
| C-13 | Avanzar de etapa | U-01 Organizador | Evento | UPDATE | `stage` (enum), `estimated_end_date` (date, req en el modal) | Transiciones: `creation→participation→voting→results`. **Sin retroceso ni saltos**, validado en el dominio. Dispara email a los participantes. ⚠️ Ver defecto D-05 |
| C-14 | Posponer deadline de etapa | U-01 Organizador | Evento | UPDATE | `participation_estimated_end_date` o `voting_estimated_end_date` (date) | **Solo se puede posponer, no adelantar** — regla activa en el backend. ⚠️ Ver defecto D-06 |
| C-15 | Pausar / reanudar evento | U-01 Organizador | Evento | UPDATE | `is_paused` (bool) | Independiente de la etapa. Con el evento pausado no se puede registrar ni subir propuestas |
| C-16 | Cancelar evento | U-01 Organizador | Evento | UPDATE | `is_cancelled` (bool) | Independiente de la etapa. Dispara email de cancelación |
| C-17 | Compartir el evento | U-03 Visitante | Evento | READ | `shareable_link` | Copia el link al portapapeles. ⚠️ Ver defecto D-07 |

**Criterios de Aceptación:**

- DADO que estoy autenticado y no tengo ningún evento
  CUANDO creo un evento con `name: "Convocatoria 2026"` y una descripción de 50 caracteres
  ENTONCES el evento se crea en etapa `creation` con `max_participants: 20`
  Y quedo registrado como `creator` del evento
  Y se genera su link compartible

- DADO que mi evento está en etapa `participation`
  CUANDO intento avanzarlo directamente a `results`
  ENTONCES el dominio rechaza la transición por salto de etapa

- DADO que mi evento está en etapa `voting` con deadline de votación el 30/09
  CUANDO intento cambiar el deadline al 25/09
  ENTONCES el backend rechaza el cambio porque solo se puede posponer

- DADO que mi evento está pausado
  CUANDO un participante intenta registrarse o subir su propuesta
  ENTONCES la interfaz bloquea la acción con el aviso de evento pausado

**Prioridad:** Alta
**Dependencias:** F-01

---

### F-03: Participación y Carga de Propuestas

**Descripción:** Registro de participantes a un evento por link compartible, con creación del
usuario en el acto si no existe, y carga de una propuesta por participante.

**Historia de Usuario:**
Como investigador que recibió el link de una convocatoria,
quiero registrarme y subir mi propuesta,
para entrar en la evaluación.

**Capacidades:**

| ID | Capacidad | Actor | Entidad | Operación | Campos Clave | Reglas de Negocio |
|----|-----------|-------|---------|-----------|--------------|-------------------|
| C-18 | Registrarse a un evento | U-02 Participante | Participación | CREATE | `event_id` (uuid), `email` (string, req) | **Si el email no existe, crea el usuario en el acto** (sin `password_hash`). Rol `participant`. Bloqueado si el evento está pausado o alcanzó `max_participants` |
| C-19 | Subir propuesta | U-02 Participante | Propuesta | CREATE | archivo (multipart), `event_id`, `participant_id` | **Una sola por participante y evento**. Solo en etapa `participation`. El creador no sube. Whitelist de 8 tipos MIME. Límite 10 MB validado **solo en el cliente** |
| C-20 | Listar participantes del evento | U-01 Organizador | Participación | READ | `event_id` | Con nombre, email, estado de entrega y estado de voto. ⚠️ Ver defecto D-08 |
| C-21 | Listar propuestas del evento | U-01 Organizador | Propuesta | READ | `event_id` | Usado para el contador `Files Submitted: {n}/{total}` |
| C-22 | Consultar la propuesta de un participante | U-02 Participante | Propuesta | READ | `event_id`, `participant_id` | Usado para saber si ya entregó |
| C-23 | Descargar una propuesta | — | Propuesta | READ | `attachment_id` (uuid) | ⚠️ Ver defecto D-02. **El frontend no consume este endpoint** |
| C-24 | Listar eventos de un usuario | U-02 Participante | Participación | READ | `user_id` | Alimenta los tabs "My Events" y "My Subscriptions" |

**Criterios de Aceptación:**

- DADO un evento en etapa `participation` con 5 de 20 cupos ocupados
  CUANDO me registro con `email: "nuevo@obs.org"` que no existe en el sistema
  ENTONCES se crea el usuario sin contraseña
  Y quedo registrado como `participant` del evento

- DADO que ya subí mi propuesta al evento
  CUANDO abro la pantalla del evento
  ENTONCES veo "Submission received" y no se me ofrece subir otra

- DADO que selecciono un archivo de 12 MB
  CUANDO intento subirlo
  ENTONCES el cliente lo rechaza con "File cannot exceed 10MB" antes de enviarlo

- DADO que selecciono un archivo `.zip`
  CUANDO intento subirlo
  ENTONCES el cliente lo rechaza por tipo no permitido

**Prioridad:** Alta
**Dependencias:** F-02

---

### F-04: Motor de Votación Distribuida

**Descripción:** El núcleo del producto. Configuración de los parámetros del modelo, generación
de asignaciones libres de conflicto de interés, cálculo del Modified Borda Count, medición de
la calidad de cada evaluador y aplicación del sistema de incentivos. Implementa
**Merrifield & Saari (2009)**.

**Historia de Usuario:**
Como organizador de una convocatoria con más propuestas de las que un comité puede leer,
quiero que la evaluación se reparta entre los propios participantes con garantías de imparcialidad,
para obtener un ranking confiable sin un comité que no tengo.

**Capacidades:**

| ID | Capacidad | Actor | Entidad | Operación | Campos Clave | Reglas de Negocio |
|----|-----------|-------|---------|-----------|--------------|-------------------|
| C-25 | Configurar parámetros de votación | U-01 Organizador | ConfiguracionVotacion | CREATE | `attachments_per_evaluator` (int, req, 1..50), `min_evaluations_per_file` (int, opt, default 3), `quality_good_threshold` (decimal, opt, default 0.6), `quality_bad_threshold` (decimal, opt, default 0.3), `adjustment_magnitude` (int, opt, default 3, 0..20) | `good > bad` y diferencia ≥ 0.1 (CHECK en base). La UI precarga `m` con el recomendado `min(max(⌈2·log₂(k)⌉,1), k−1)` y lo deja editable. ⚠️ Ver defecto D-09 |
| C-26 | Generar asignaciones | U-01 Organizador | Asignación | CREATE | `event_id` | **Nadie recibe su propia propuesta** (`m ≤ k−1`), validado en Go **y** en el trigger. Fase 1: cobertura mínima con tope `m` por participante. Fase 2: completar hasta `m`. Exige `m ≥ 2·log₂(k)`, relajado al 60% del máximo para `k ≤ 10`. ⚠️ Ver defecto D-10 |
| C-27 | Consultar mi asignación | U-02 Participante | Asignación | READ | `event_id`, `participant_id` | Devuelve las `m` propuestas a evaluar |
| C-28 | Guardar borrador del ranking | U-02 Participante | BorradorVoto | CREATE/UPDATE | `rankings` (jsonb: `[{attachment_id, rank}]`) | Upsert sobre (`assignment_id`, `participant_id`). Permite abandonar la pantalla sin perder el progreso |
| C-29 | Consultar borrador | U-02 Participante | BorradorVoto | READ | `assignment_id`, `participant_id` | Restaura el ranking a medio armar |
| C-30 | Enviar ranking definitivo | U-02 Participante | Voto | CREATE | `rankings`: un `rank_position` (1..m, **1 = mejor**) por propuesta asignada | El trigger valida que exista asignación, que la propuesta esté asignada y que `rank_position ≤ m`. Calcula `score` si viene nulo. Dispara la actualización de `is_completed` y `vote_count` |
| C-31 | Calcular resultados | U-01 Organizador | ResultadoVotacion | READ | `event_id` | MBC: `(1/(m(m−1)))·Σ(m − R_i(f_j))`, normalizado a [0,1]. Desempate por cantidad de votos, luego por UUID (orden determinístico). ⚠️ Ver defecto D-11 |
| C-32 | Calcular calidad de evaluadores | — | Asignación | UPDATE (auto) | `quality_score` | `Q_i = 1 − (2/(m(m−1)))·Σ\|R_i(f_j) − RelativeRank_G(f_j, A(p_i))\|`, recortado a [0,1]. **Quien no completó su asignación recibe `Q_i = 0`** |
| C-33 | Aplicar incentivos | — | ResultadoVotacion | UPDATE (auto) | `adjusted_ranking` | La propuesta de un evaluador con `Q_i ≥ good` sube `n` posiciones; con `Q_i ≤ bad` baja `n`. Es el mecanismo que hace que convenga evaluar en serio |
| C-34 | Ver estadísticas de votación | U-01 Organizador | ResultadoVotacion | READ | `event_id` | Cuántos votaron sobre el total. Alimenta la validación de avance a `results` |

**Criterios de Aceptación:**

- DADO un evento con 10 propuestas (`k=10`) y 10 participantes
  CUANDO configuro `attachments_per_evaluator = 3`
  ENTONCES el sistema acepta la configuración (para `k ≤ 10` el mínimo se relaja al 60% del máximo)

- DADO un evento con 4 propuestas (`k=4`)
  CUANDO configuro `attachments_per_evaluator = 4`
  ENTONCES el sistema rechaza la configuración porque `m ≤ k−1 = 3` (nadie puede evaluar lo propio)

- DADO que se generaron las asignaciones de un evento
  CUANDO reviso la asignación de cualquier participante
  ENTONCES tiene exactamente `m` propuestas
  Y ninguna es la suya

- DADO que soy evaluador con `m=3` y ordené mis 3 propuestas asignadas
  CUANDO envío el ranking
  ENTONCES se crean 3 votos con `rank_position` 1, 2 y 3
  Y mi asignación queda marcada `is_completed = true` por el trigger
  Y el `vote_count` de cada propuesta se incrementa

- DADO que no completé mi asignación al cerrarse la votación
  CUANDO se calculan los resultados
  ENTONCES mi `quality_score` es 0
  Y mi propuesta baja `n` posiciones en el ranking ajustado

**Prioridad:** Alta
**Dependencias:** F-03

---

### F-05: Resultados

**Descripción:** Publicación del ranking del evento, visible en tres pantallas distintas a
través del mismo panel.

**Historia de Usuario:**
Como participante de una convocatoria que ya cerró,
quiero ver el ranking final,
para saber cómo quedó mi propuesta.

**Capacidades:**

| ID | Capacidad | Actor | Entidad | Operación | Campos Clave | Reglas de Negocio |
|----|-----------|-------|---------|-----------|--------------|-------------------|
| C-35 | Ver resultados del evento | U-02 Participante | ResultadoVotacion | READ | `event_id` | Solo en etapa `results`. Cada fila: `filename`, `participant_name`, `mbc_score`, `global_rank`, `adjusted_rank`, `vote_count`, `average_rank`. ⚠️ **No está definido cuál de los dos rankings es el oficial** |

**Criterios de Aceptación:**

- DADO un evento en etapa `results`
  CUANDO abro el detalle del evento
  ENTONCES veo el panel de resultados con el ranking de todas las propuestas

- DADO un evento que aún está en etapa `voting`
  CUANDO abro el detalle del evento
  ENTONCES no veo resultados, veo el aviso de votación en curso

**Prioridad:** Alta
**Dependencias:** F-04

---

### F-06: Notificaciones por Email

**Descripción:** Avisos transaccionales por SMTP en tres momentos del ciclo de vida.

**Historia de Usuario:**
Como participante de una convocatoria,
quiero enterarme cuando el evento cambia de etapa,
para no perderme el plazo de entrega o de evaluación.

**Capacidades:**

| ID | Capacidad | Actor | Entidad | Operación | Campos Clave | Reglas de Negocio |
|----|-----------|-------|---------|-----------|--------------|-------------------|
| C-36 | Notificar cambio de etapa | — | Evento | ACTION (auto) | destinatarios: participantes del evento | Disparado por C-13 |
| C-37 | Notificar cancelación | — | Evento | ACTION (auto) | destinatarios: participantes del evento | Disparado por C-16 |
| C-38 | Enviar link de recuperación | — | Usuario | ACTION (auto) | `password_reset_token` | Disparado por C-05 |

**Criterios de Aceptación:**

- DADO un evento con 8 participantes registrados
  CUANDO lo avanzo de `participation` a `voting`
  ENTONCES los 8 participantes reciben el email de cambio de etapa

**Prioridad:** Media
**Dependencias:** F-02

**Nota:** No hay preferencias de notificación, ni notificaciones in-app, ni centro de
notificaciones. Los tres emails son transaccionales y no configurables.

---

## Defectos Conocidos del Comportamiento Implementado

Estos **no son requerimientos**: son el comportamiento actual, verificado, que contradice lo
que el sistema aparenta hacer. Se listan acá porque las capacidades de arriba los referencian
y porque son el insumo directo de los primeros requerimientos de corrección.

| ID | Defecto | Severidad | Evidencia |
|----|---------|-----------|-----------|
| D-01 | **El fallback demo anula la validación del login.** El `catch` externo de `handleSubmit` crea un usuario ficticio con token `demo-token-{ts}` y lo loguea. Como las validaciones usan `throw`, ese mismo `catch` las captura: enviar con email vacío **deja al usuario logueado** en vez de mostrar el error | Crítica | `web/src/components/auth-form/AuthForm.tsx:132-152` |
| D-02 | **Descarga de propuestas sin autenticación.** El endpoint está registrado fuera del grupo que aplica `JWTAuthMiddleware`: cualquiera con el UUID descarga la propuesta | Crítica | `api/cmd/api/main.go:219` |
| D-03 | **Lectura de cualquier usuario sin verificación de ownership.** Cualquier usuario autenticado lee los datos de cualquier otro | Alta | `api/` handler de `GET /api/v1/users/{user_id}` |
| D-04 | **La fecha del evento se autogenera y el usuario nunca la ve.** Se envía hoy+1día como `start_date`; no hay campo de fecha en el formulario | Alta | `web/src/pages/create-event/CreateEventPage.tsx:43-49` |
| D-05 | **La misma acción tiene reglas distintas según la pantalla.** `ManageEventPage` valida que haya participantes y que todos hayan votado antes de avanzar; `EventDetailPage` permite el mismo avance **sin ningún chequeo** | Alta | `ManageEventPage.tsx:232-252` vs `EventDetailPage.tsx:284-420` |
| D-06 | **La regla "solo posponer" no se valida en el cliente.** El hint la anuncia, pero el `min` del input solo impide fechas pasadas, no anteriores al deadline actual | Media | `ManageEventPage.tsx:641`, `:674` |
| D-07 | **Copiar el link puede fallar en silencio.** `navigator.clipboard` exige contexto seguro; si falla solo hace `console.error` y el usuario no ve nada | Media | `web/src/components/ShareButton.tsx:47-50` |
| D-08 | **Fallos de API presentados como ausencia de datos.** Participantes, adjuntos y estadísticas fallan solo a consola: si la API de participantes cae, la pantalla dice `No participants have registered yet.` **como si no hubiera ninguno**, y el organizador decide sobre esa base. `Participants` además **rellena la lista con tres personas inventadas** | Crítica | `ManageEventPage.tsx:74-77`, `:92-96`, `:116-120`; `Participants.tsx:24-56` |
| D-09 | **La fórmula del recomendado está implementada dos veces**, en el front (para sugerir) y en el back (para validar y rechazar). Si una cambia y la otra no, el organizador ve un valor recomendado que el backend rechaza | Media | `VotingConfigurationPanel.tsx:25-31` vs `voting_service.go:48-68` |
| D-10 | **Una propuesta puede quedar por debajo de `min_evaluations_per_file`.** La fase 1 respeta el tope `m` por participante y saltea a quien ya llegó, así que la cobertura mínima cede si no hay evaluadores elegibles. Es un trade-off deliberado: excederlo haría fallar el trigger | Media (documentado) | `voting_service.go` fase 1 |
| D-11 | **`GET /distributed-results` muta estado.** Recalcula el MBC y hace upsert en `voting_results` en cada llamada: un GET con efectos de escritura | Media | `api/` handler de `distributed-results` |
| D-12 | **JWT_SECRET con default hardcodeado.** Si falta la variable, el servicio arranca con un secreto conocido y solo emite un warning | Crítica | `api/internal/middleware/auth/jwt.go:20-26` |
| D-13 | **Sin rutas protegidas ni ruta 404.** `/events/create` y `/events/:eventId/manage` son alcanzables por URL sin sesión. Una URL desconocida renderiza la navbar sobre contenido vacío | Media | `web/src/App.tsx:177-184` |
| D-14 | **El health check de `Auth` está hardcodeado en `true`.** El aviso de API no disponible es código inalcanzable | Baja | `web/src/components/auth/Auth.tsx:30-36` |

---

## Requerimientos No Funcionales

> **Lectura obligatoria antes de usar esta sección.** Estos NFR describen **lo que el sistema
> hace hoy**, no objetivos. Donde no hay nada implementado, dice "no implementado" en lugar de
> inventar un objetivo: un NFR aspiracional que nadie definió es peor que su ausencia, porque
> se lo confunde con un compromiso asumido.

### Rendimiento

| ID | Requerimiento | Estado |
|----|---------------|--------|
| NFR-P-01 | El pool de conexiones a PostgreSQL admite hasta 100 conexiones concurrentes | **Implementado** — configurado en el arranque |
| NFR-P-02 | El cálculo de resultados es `O(n·m)` sobre votos y se ejecuta bajo demanda, no en background | **Implementado**, con la salvedad de D-11: se recalcula en cada GET |
| NFR-P-03 | El frontend no cachea ni deduplica requests: cada pantalla pide sus datos al montar | **Limitación conocida** — sin librería de estado de servidor. `/events` además dispara **dos** fetches al montar por dos `useEffect` superpuestos |
| — | Tiempos de respuesta objetivo | **No definido.** No hay SLO, ni métricas, ni instrumentación |
| — | Volumen máximo soportado (participantes, propuestas por evento) | **No definido.** Los únicos topes son `max_participants ≤ 100` por evento y `m ≤ 50`. No hay pruebas de carga |

### Seguridad

| ID | Requerimiento | Estado |
|----|---------------|--------|
| NFR-S-01 | Autenticación por JWT HS256 con vigencia de 24 horas | **Implementado** — ⚠️ pero ver D-12 (secreto por default) |
| NFR-S-02 | Contraseñas con bcrypt DefaultCost, mínimo 8 caracteres | **Implementado** |
| NFR-S-03 | Autorización compuesta por middlewares declarados en la ruta: `RequireEventOwner`, `RequireEventOwnerOrOrganizer`, `RequireParticipantOrOwner` | **Implementado** — ⚠️ el rol global `admin` saltea todas |
| NFR-S-04 | El conflicto de interés se valida en dos capas independientes (Go y trigger de Postgres) | **Implementado** — es defensa en profundidad deliberada |
| NFR-S-05 | Tokens de recuperación de contraseña: 32 bytes aleatorios, vigencia 1 hora, de un solo uso | **Implementado** |
| — | Autorización del endpoint de descarga | ⚠️ **Ausente** — ver D-02 |
| — | Verificación de ownership en lectura de usuarios | ⚠️ **Ausente** — ver D-03 |
| — | Rate limiting, protección contra fuerza bruta, auditoría de accesos | **No implementado** |
| — | Cifrado en reposo de las propuestas | **No implementado** — se guardan tal cual en MinIO |

### Confiabilidad

| ID | Requerimiento | Estado |
|----|---------------|--------|
| NFR-R-01 | Health check con verificación de conectividad a la base (`GET /health`) | **Implementado** |
| NFR-R-02 | Las reglas críticas se garantizan a nivel de base, de modo que ninguna escritura las saltee | **Implementado** — 4 triggers + CHECK constraints |
| NFR-R-03 | El orden del ranking es determinístico ante empates (desempate por votos, luego por UUID) | **Implementado** — dos cálculos dan el mismo orden |
| — | Manejo de errores uniforme | ⚠️ **Ausente** — hay **cuatro formatos de error distintos** entre handlers, middlewares, endpoints de votación y health. El cliente además descarta el `code` y se queda solo con el texto |
| — | Degradación visible ante fallo parcial | ⚠️ **Ausente** — ver D-08: los fallos se presentan como ausencia de datos |
| — | Reintentos, circuit breakers, colas de reenvío de email | **No implementado** |
| — | Monitoreo, alertas, trazas | **No implementado** |

### Usabilidad

| ID | Requerimiento | Estado |
|----|---------------|--------|
| NFR-U-01 | La interfaz debe ser responsive | **Requisito confirmado**, implementación parcial. Un único corte estructural (768px) sobre CSS desktop-first. ⚠️ En mobile los deadlines se ocultan bajo 600px y la tabla de participantes queda sin etiquetas |
| NFR-U-02 | La sesión expirada no debe perder el contexto de navegación | **Implementado** — deslogueo por `CustomEvent` sin recargar |
| NFR-U-03 | El progreso de una evaluación a medio hacer no se pierde al abandonar la pantalla | **Implementado** — borradores de voto |
| NFR-U-04 | El idioma de la interfaz es inglés | **Implementado con inconsistencias** — tres islas en español (etiquetas de rol, un `aria-label`, datos mock). Sin i18n: los textos están embebidos en el JSX |
| — | Accesibilidad | ⚠️ **Deficiente y sin objetivo definido.** Sin `role="dialog"` ni gestión de foco en ningún overlay, sin cierre por Escape, tablas construidas con `<div>` sin roles ARIA, tabs sin semántica, banners sin `role="alert"`, emojis portadores de significado sin alternativa textual. No hay objetivo WCAG declarado |
| — | Tema claro | ⚠️ **A medias** — solo `Auth.css` y `Modal.css` responden a `prefers-color-scheme: light` |

### Mantenibilidad

| ID | Requerimiento | Estado |
|----|---------------|--------|
| NFR-M-01 | Migraciones versionadas con `Up`/`Down`, ejecutadas al arrancar, más un CLI (`cmd/migrate`) con `-rollback` | **Implementado** — 20 migraciones |
| NFR-M-02 | El backend tiene suite de tests unitarios que corre sin base de datos | **Implementado** — ~4.300 líneas, 10 archivos, mocks a mano |
| NFR-M-03 | Los servicios por dominio del frontend absorben la inconsistencia de envelopes del backend | **Implementado** — `src/services/api.ts` |
| — | Cobertura de tests del backend | ⚠️ **Parcial** — cubre handlers y el algoritmo; **sin tests de middlewares (JWT y permisos) ni de repositorios** |
| — | Cobertura de tests del frontend | **No implementado** |
| — | Adopción de tokens de diseño | ⚠️ **Parcial** — 753 usos de `var()` contra 350 colores hex hardcodeados (~1/3). Fuente de verdad duplicada: las 57 variables de `index.css` se repiten en `global.css` |
| — | Código muerto | ⚠️ `ApiStatusAuth.tsx` y `Voting.tsx` sin referencias; bloques completos de CSS responsive apuntando a clases que el JSX ya no usa; columnas de base que el dominio no lee |

### Escalabilidad

| ID | Requerimiento | Estado |
|----|---------------|--------|
| NFR-E-01 | El backend es stateless (la sesión vive en el JWT): admite múltiples instancias detrás de un balanceador | **Implementado por diseño**, no verificado en despliegue |
| NFR-E-02 | El storage de propuestas está abstraído tras la interfaz `FileStorage` | **Implementado** — local o MinIO sin tocar handlers |
| — | Estrategia de caché | **No implementado** — sin Redis ni caché de aplicación |
| — | Escalado horizontal probado | **No verificado** |

---

## Restricciones Técnicas

### Stacks en uso

| Servicio | Stack |
|---|---|
| `api` | Go 1.26.6 · Gin 1.10.1 · GORM 1.30.2 · JWT HS256 |
| `web` | React 19.1.1 · react-router-dom 7.9.4 · Create React App 5.0.1 · TypeScript 4.9.5 (`strict: true`, `target: es5`) · CSS plano |

**Ambos divergen del catálogo de convenciones del workflow**: el catálogo Go recomienda chi y
sqlc+pgx (SQL-first, sin ORM); el catálogo frontend disponible es de Next.js y **no aplica** a
una SPA de CRA. Las 9 convenciones de cada servicio son custom.

### Datos y almacenamiento

- **PostgreSQL** con extensión `uuid-ossp`. 9 tablas, 3 tipos enumerados, 20 migraciones.
- **MinIO** (S3-compatible) para las propuestas en despliegue; filesystem local en desarrollo.
- **`localStorage`** para la sesión del navegador.

### Dependencias externas

| Dependencia | Uso | Criticidad |
|---|---|---|
| Google OAuth | Login alternativo | Media — el login con email/password sigue funcionando sin él |
| SMTP | Tres emails transaccionales | Media — el flujo de recuperación de contraseña depende por completo |
| MinIO | Storage de propuestas | **Alta** — sin él no hay carga ni descarga de propuestas |

### Restricciones de infraestructura

- Despliegue con Docker Compose (`deploy/docker-compose.yml`), con `STORAGE_PROVIDER=minio`
  fijo. Hay un `deploy/verify-minio-production.sh` para verificar la conexión.
- ⚠️ **El default del código Go es `local` mientras el README documenta `minio`**: levantar el
  servicio sin el compose da filesystem local sin aviso.
- El frontend se sirve como estáticos; toda la ejecución es client-side (sin SSR).

### Restricciones del modelo matemático

Estas acotan qué configuraciones son posibles y **no son negociables sin cambiar el algoritmo**:

- `m ≤ k − 1` — nadie evalúa su propia propuesta.
- `m ≥ 2·log₂(k)` — condición de convergencia del paper, relajada al 60% del máximo para
  `k ≤ 10`.
- `1 ≤ m ≤ 50`, `0 ≤ n ≤ 20`, `min_evaluations_per_file > 0`.
- `quality_good_threshold > quality_bad_threshold` con diferencia ≥ 0.1.
- **Con pocas propuestas el margen es muy estrecho.** Con `k = 4`, `m` solo puede ser 2 o 3.

### Restricciones de escritura contra la base

**Las reglas en triggers son parte del contrato de datos.** Cualquier escritura que las saltee
(scripts, seeds, tests de integración, correcciones manuales) falla con `RAISE EXCEPTION` de
plpgsql, que llega como un 500 genérico sin la forma de error de la API. Los datos de prueba
tienen que ser coherentes con la `voting_configuration` del evento.

---

## Supuestos

1. **[supuesto]** Los participantes de un evento se conocen entre sí lo suficiente como para
   que el conflicto de interés relevante sea el directo (evaluar lo propio). El sistema no
   modela afinidades, coautorías ni instituciones compartidas.
2. **[supuesto]** El organizador avanza las etapas manualmente. No hay avance automático por
   fecha: los `estimated_end_date` son informativos, no disparadores.
3. **[supuesto]** Un evento tiene una sola ronda de evaluación. `assignment_round` existe pero
   siempre vale 1.
4. **[supuesto]** El volumen esperado por evento está en el orden de decenas de participantes,
   no miles: el tope de `max_participants` es 100 y el cálculo de resultados es síncrono.

## Preguntas Abiertas

Heredadas de [goals-and-context.md](./goals-and-context.md):

1. **¿Cuál es el ranking oficial, `G` o `G'`?** Bloquea la definición de C-35 y determina si
   el sistema de incentivos (C-33) tiene algún efecto real sobre el resultado.
2. **¿Retirar `users.role` requiere migración de datos?** Hay usuarios con valores en esa
   columna y middlewares que la leen.

Nuevas, que surgen de escribir los requerimientos:

3. **¿El límite de tamaño de archivo son 10 MB o 100 MB?** El cliente valida 10, la base
   admite 100, y **el backend no valida nada**. Hoy el límite real es una validación de
   frontend que cualquiera puede saltear llamando a la API directamente.
4. **¿Qué pasa si una propuesta no alcanza `min_evaluations_per_file`?** (D-10) El sistema lo
   permite en silencio. ¿Debería avisar al organizador antes de generar las asignaciones?
5. **¿Debe poder descargarse una propuesta desde la interfaz?** El endpoint existe (sin auth),
   el frontend no lo usa. Hay que decidir si se conecta con autorización o se elimina.
