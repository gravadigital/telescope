---
date: 2026-10-09
type: technical-change
service: api
---

# Cambio Técnico: api — lectura de la configuración de votación aplicada

## Requerimiento Original

> Servicio: api — cambio de definición de API (docs/apis/api.yaml).
>
> Agregar el endpoint GET /api/v1/events/{event_id}/voting-config para leer la
> configuración de votación aplicada a un evento. Lo necesita S-016 (gestión del
> organizador) para mostrar "Configuración aplicada" en las etapas Votación y
> Resultados: hoy no hay ninguna fuente documentada en Votación
> (distributed-results?include_metrics=true solo trae la configuración cuando el
> ranking ya está calculado).
>
> El handler ya existe pero no tiene ruta:
> DistributedVoteHandler.GetVotingConfiguration
> (api/internal/handlers/distributed_vote_handler.go:1060).
>
> Contrato:
> - Auth: JWT, solo el autor del evento o admin (RequireEventOwner, igual que
>   GET /voting-config/preview).
> - 200 { data: VotingConfiguration } con id, event_id, attachments_per_evaluator,
>   quality_good_threshold, quality_bad_threshold, adjustment_magnitude,
>   min_evaluations_per_file, created_at.
> - 400 MISSING_EVENT_ID / INVALID_EVENT_ID
> - 401 / 403 de middleware
> - 404 CONFIG_NOT_FOUND (el evento todavía no abrió la votación)
>
> Es solo lectura, sin cambios de base de datos. También hay que actualizar el
> flujo docs/flows/configuracion-y-generacion-de-asignaciones.md, que tiene que
> mencionar la lectura de la configuración desde la gestión.

## Resumen

Se documenta `GET /api/v1/events/{event_id}/voting-config`, de solo lectura, para el autor del
evento o un admin. Es la fuente única de la "Configuración aplicada" en la gestión del organizador
(S-016), en Votación y en Resultados. El handler ya existía sin ruta. Al contrato pedido se suman
dos ajustes que hoy el código no cumple: validar el UUID en el handler (`INVALID_EVENT_ID`) y
distinguir un error de base (`500 CONFIG_LOOKUP_ERROR`) de la configuración inexistente
(`404 CONFIG_NOT_FOUND`). Ambos quedan como trabajo de api en S-016. No hay cambios de base de
datos.

## Documentos Modificados

| Documento | Cambio |
|-----------|--------|
| `docs/apis/api.yaml` | Nuevo `get` en `/api/v1/events/{event_id}/voting-config`: `200 { data: VotingConfiguration }` sin `updated_at`, `400 MISSING_EVENT_ID` / `INVALID_EVENT_ID`, `401` / `403` del middleware, `404 CONFIG_NOT_FOUND` (aclara el caso del admin con un evento inexistente y el `NOT_FOUND` del middleware), `500 CONFIG_LOOKUP_ERROR` |
| `docs/flows/configuracion-y-generacion-de-asignaciones.md` | Nuevo Paso 4, "Consultar la configuración aplicada desde la gestión" (pendiente, S-016); fila en "Cambios planificados"; el rol de `web` incluye mostrar la configuración aplicada; en "Estado resultante", la configuración se puede leer pero no modificar |
| `docs/stories/S-016.gestion-del-organizador.md` | `api` en "Servicios afectados" (registrar la ruta, validar el UUID, distinguir 404 de 500); "Cambios de API" describe el endpoint nuevo; en "Flujos afectados" se menciona el Paso 4 |
