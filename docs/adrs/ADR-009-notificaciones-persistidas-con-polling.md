# ADR-009: Notificaciones in-app persistidas en la base y consultadas por polling

**Estado:** Aceptado (lado `api` implementado en S-009; la web queda pendiente en S-018)
**Fecha:** 2026-10-02
**Origen:** REQ-003 (DA-1, DA-2) · **Stories:** S-009, S-018
**Tags:** backend, frontend, notificaciones, comunicación

---

## Contexto

REQ-003 suma avisos in-app que replican los emails existentes (cambio de etapa, cancelación,
pausa, cambio de cierre) y agrega inscripciones, ranking enviado y recordatorios del organizador.
La web los muestra en una campana con contador, un panel y una página de historial (90 días).

Restricciones:
- [ADR-003](ADR-003-monolito-backend-con-spa.md): monolito sin bus, colas ni comunicación
  asincrónica entre servicios; el backend es stateless y escala horizontalmente sin cambios.
- La interfaz es multilenguaje (es/en) y el nombre del evento se puede editar (REQ-003 RF 2 y 17).
- Ningún tipo de aviso es urgente al minuto.

## Decisión

1. **La api inserta la notificación en la tabla `notifications`** en el mismo handler que dispara
   el email (o la acción equivalente), después de la operación principal. Es best effort, como
   los emails: si la inserción falla se loguea y la respuesta no cambia.
2. **La web consulta por polling** `GET /api/v1/notifications/unread-count`: al montar, cada 60 s
   con la pestaña visible, al volver el foco y después de cada navegación. El panel y la página
   piden el listado al abrirse.
3. **Se guarda `type` + `data`, no texto.** `data` lleva solo los valores que el texto necesita y
   que no se pueden leer del evento vigente (cierre, cantidad asignada, puesto, conteo). La api
   devuelve además el evento vigente (`id`, `name`, `stage`) y la web compone título, cuerpo y
   acción con el catálogo de i18n.
4. **Retención de 90 días** por filtro en las consultas, más un borrado de las viejas del
   destinatario al listar. Sin scheduler.

## Consecuencias

### Positivas

- Coherente con ADR-003: sin conexiones persistentes ni infraestructura nueva; cualquier
  instancia del backend atiende cualquier pedido.
- El texto siempre sale en el idioma actual del usuario y con el nombre vigente del evento.
- Agregar un tipo es un valor más en el enum `notification_type` y una entrada en el catálogo.

### Negativas

- Latencia de hasta 60 s entre el hecho y la campana.
- Carga de polling: una consulta liviana por pestaña visible por minuto (índice parcial
  `idx_notifications_unread`); despreciable para el volumen actual.
- Sin garantía de entrega: una falla de inserción se pierde (igual que los emails).
- La web tiene que mantener el mapa `type` → texto/acción (`web/src/domain/notifications.ts`).

### Riesgos

- Si el producto necesitara avisos en tiempo real, este ADR debería revisarse junto con ADR-003.

## Alternativas Consideradas

- **WebSocket / Server-Sent Events:** latencia baja, pero introduce estado de conexión en un
  backend stateless y complica el escalado horizontal (ADR-003, "Positivas").
- **Cola + worker:** contradice ADR-003 (sin comunicación asincrónica).
- **Guardar el texto renderizado:** queda en el idioma del momento y congela el nombre del evento.

## Referencias

- `docs/db-schemas/telescopio_db.md` → `notifications`
- `docs/apis/api.yaml` → `/api/v1/notifications*`, schema `Notification`
- `docs/flows/notificaciones-in-app.md`
