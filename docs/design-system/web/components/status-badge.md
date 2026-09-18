---
component: status-badge
version: 1.0.0
last_updated: 2026-09-18
status: relevado-desde-código
---

# Status Badge

> **Relevado desde el código existente.** `[fuente: código-existente]`

## Qué es

⚠️ **No existe como componente.** Es un patrón visual repetido con CSS duplicado por archivo.

Comunica el estado de un evento, de una entrega o de un voto. Aparece en `events-list`,
`event-detail` y `manage-event`.

## Variantes observadas

### Etapa del evento
`Creation` · `Participation` · `Voting` · `Results`

⚠️ **En `events-list` la última se muestra como `Completed`**, no como `Results`. Inconsistencia de
nomenclatura entre pantallas.

### Estado del evento
`⏸ PAUSED` · `CANCELLED`

### Estado por participante (`manage-event`)
`✓ Submitted` / `⏳ Pending` · `✓ Voted` / `⏳ Not Voted` · `N/A`

## Tokens que consume

`radius.full`, y los colores semánticos (`color.success`, `color.warning`) según el estado.

## Accesibilidad

✅ **Es el componente mejor resuelto del producto en este aspecto.** Todos los badges transmiten la
información **por color y por texto** (`✓ Submitted`, no solo un punto verde). Un usuario que no
distingue colores los lee igual.

⚠️ Los símbolos `✓`, `⏳` y `⏸` no tienen `aria-hidden`, así que se anuncian junto al texto.

## Do / Don't

*Vacío a propósito.* El código no registra guías de uso. **La única regla que el código sí
demuestra** —siempre texto además de color— está anotada arriba como acierto observado, no como
guía inventada.

## Deuda conocida

1. ⚠️ **CSS duplicado por archivo**, sin componente común.
2. ⚠️ **`Completed` vs `Results`**: la misma etapa con dos nombres.
3. ⚠️ Símbolos sin `aria-hidden`.

## Historial

- 2026-09-18 v1.0.0 — Relevado desde el código por `/product-consolidate-services`.
