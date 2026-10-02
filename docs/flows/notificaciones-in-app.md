---
id: notificaciones-in-app
title: Notificaciones in-app
type: feature
status: Draft
created: 2026-10-02
last_updated: 2026-10-02
stories: [S-009, S-018]
---

# Notificaciones in-app

**Tipo:** Feature
**Status:** Draft (diseñado en REQ-003, pendiente de implementar)
**Creado:** 2026-10-02
**Última actualización:** 2026-10-02
**Stories:** S-009, S-018

## Descripción

Generación, agregación, lectura y retención de los avisos in-app de cada usuario. La api inserta
la notificación en el mismo handler que dispara el email (o la acción equivalente); la web
consulta por polling el contador de no leídas y muestra la campana, el panel y la página.
Sin bus, colas ni WebSocket (ADR-003, ADR-009).

## Servicios Involucrados

| Servicio | Rol | Tipo de Participación |
|----------|-----|-----------------------|
| `api` | Emite las notificaciones desde los handlers y expone los endpoints de lectura | Procesador |
| PostgreSQL | Persiste `notifications` y agrega `participant_registered` | Almacenamiento |
| `web` | Polling del contador, campana, panel, página y marcado de leídas | Consumidor |

## Pasos del Flujo

```mermaid
sequenceDiagram
    participant U as Usuario
    participant WEB as web
    participant API as api
    participant DB as PostgreSQL

    Note over API: handler disparador (etapa, cancelación, pausa, cierre, inscripción, ranking, recordatorio)
    API->>API: completa la operación principal
    API->>DB: INSERT notifications (lote) / ON CONFLICT para participant_registered
    alt falla la inserción
        API->>API: log.Warn (la respuesta no cambia)
    end

    loop cada 60 s con la pestaña visible, al volver el foco y al navegar
        WEB->>API: GET /api/v1/notifications/unread-count
        API->>DB: COUNT WHERE recipient_id = JWT AND read_at IS NULL AND created_at >= now() - 90d
        API-->>WEB: 200 { data: { unread_count } }
    end

    U->>WEB: toca la campana
    WEB->>API: GET /api/v1/notifications?limit=10
    API->>DB: DELETE > 90 días del destinatario; SELECT últimos 90 días
    API-->>WEB: 200 { data[], unread_count, next_cursor }
    U->>WEB: toca una notificación
    WEB->>API: PATCH /api/v1/notifications/{notification_id}/read
    API-->>WEB: 200 { data: { id, read_at } }
    WEB-->>U: navega a la acción
```

---

### Paso 1: Emisión

**Origen:** `api` (handlers) · **Destino:** PostgreSQL · **Tipo:** Interno

`notification.Service`, inyectado por constructor en `EventHandler` y `DistributedVoteHandler`,
inserta en lote (`CreateInBatches`) **después** de la operación principal (y del commit, si hay
transacción).

| Disparador (handler) | `type` | Destinatarios | `data` |
|---|---|---|---|
| `UpdateEventStage` | `stage_changed` | inscriptos (excluye al autor) | `{ stage, deadline? }`; en `voting` + `{ can_vote, assigned_count? }`; en `results` + `{ result_position?, result_total? }` |
| `CancelEvent` | `event_cancelled` | inscriptos | `{}` |
| `PauseEvent` (solo al pausar) | `event_paused` | inscriptos | `{}` |
| `UpdateEstimatedEndDate` | `deadline_changed` | inscriptos | `{ stage, new_date }` |
| `RegisterParticipant` | `participant_registered` | autor | `{ count }` (agregada) |
| `RegisterParticipant` | `registration_confirmed` | inscripto | `{}` |
| `SubmitRankingVotes` | `ranking_submitted` | el participante | `{ replaced }` |
| `SendReminder` | `file_reminder` / `vote_reminder` | pendientes | `{ deadline }` |

**Agregación:** `participant_registered` usa `INSERT … ON CONFLICT (recipient_id, event_id, type)
WHERE read_at IS NULL AND type = 'participant_registered' DO UPDATE SET data =
jsonb_set(data, '{count}', …), created_at = now()`. Si la anterior ya estaba leída, se crea una
nueva con `count: 1`.

**Anonimato:** `data` nunca incluye quién subió qué propuesta.

**Ref:** `docs/db-schemas/telescopio_db.md` → `notifications`

---

### Paso 2: Contador por polling

**Origen:** `web` (`NotificationsContext`) · **Destino:** `api` · **Tipo:** REST

- **Método:** GET
- **Endpoint:** `/api/v1/notifications/unread-count`
- **Auth:** JWT Bearer
- **Response 200:** `{ "data": { "unread_count": "integer" } }`

Se consulta al montar, cada 60 s con `document.visibilityState === "visible"`, al volver el foco
y después de cada navegación. Usa el índice parcial `idx_notifications_unread`.

---

### Paso 3: Listado

**Origen:** `web` (panel o página) · **Destino:** `api` · **Tipo:** REST

- **Método:** GET
- **Endpoint:** `/api/v1/notifications`
- **Query:** `limit` (1..50, default 20), `before` (date-time, cursor por `created_at`)
- **Response 200:**
  ```json
  {
    "data": [{
      "id": "uuid",
      "type": "notification_type",
      "data": "object",
      "event": { "id": "uuid", "name": "string — nombre vigente", "stage": "Stage" },
      "read_at": "date-time | null",
      "created_at": "date-time"
    }],
    "unread_count": "integer",
    "next_cursor": "date-time | null"
  }
  ```

La web compone título, cuerpo y acción con `type` + `data` + `event` en el idioma del usuario
(`web/src/domain/notifications.ts`). En mobile la campana navega a `/notifications`.

---

### Paso 4: Marcar como leídas

**Origen:** `web` · **Destino:** `api` · **Tipo:** REST

- `PATCH /api/v1/notifications/{notification_id}/read` → `200 { data: { id, read_at }, code: NOTIFICATION_READ }` (idempotente; ajena → `404 NOTIFICATION_NOT_FOUND`)
- `POST /api/v1/notifications/read-all` → `200 { data: { updated }, code: NOTIFICATIONS_READ }`

---

## Manejo de Errores

| Paso | Condición | Respuesta | Qué ve el usuario |
|---|---|---|---|
| 1 | Falla la inserción | — (log) | Nada; la operación principal se confirma igual (best effort, como los emails) |
| 2 | Falla el polling | — | El contador conserva el último valor; reintenta en el próximo ciclo |
| 3 | Falla el listado | 5xx | "No pudimos cargar tus notificaciones." con "Reintentar" |
| 4 | Notificación ajena o inexistente | 404 | Igual navega; el contador se corrige en el próximo polling |

## Estado Resultante

- Una fila por destinatario en `notifications` (o una agregada por evento para inscripciones).
- `read_at` seteado al tocarla o con "Marcar todo como leído".
- Las mayores a 90 días no se muestran ni cuentan, y se borran al listar.
