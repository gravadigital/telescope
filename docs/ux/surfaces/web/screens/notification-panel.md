---
name: notification-panel
surface: web
route: "(cualquier pantalla con sesión)"
overlay: true
overlay_type: popover
triggered_by: events-list
viewports: [desktop]
audiences: [participante, organizador]
fidelity: mid
status: diseñada
version: "1.0"
date: 2026-10-02
---

# Overlay: Panel de notificaciones (O-13)

## Identidad

- **Audiencia primaria (co-primary):** [participante](../../../audiences/participante/research-context.md), [organizador](../../../audiences/organizador/research-context.md).
- **JTBD / Propósito:** ver de un vistazo lo nuevo en mis eventos y saltar a la acción sin salir de donde estoy. Cubre REQ-003 RF 34, AC 30 (diseño 1k).
- **Viewports:**
  - **desktop** — popover de 400px anclado a la campana del header.
  - **mobile** — no existe: la campana navega a S-12. Un popover a 400px de ancho sería S-12 más apretada y sin scroll propio.

## Entrada y salida

**Entradas:** campana del header en cualquier pantalla con sesión (en el book se ancla a S-02 como representante).

**Salidas user-driven:**
- A S-04 / S-05 · tocar una notificación o su acción.
- A S-12 · "Ver todas las notificaciones".
- Cierra con Escape, click afuera o la campana.

**Salidas automáticas:** ninguna.

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | Título | heading | h2 | content | desktop | — | "Notificaciones" |
| 2 | Contador | badge | — | content | desktop | hidden_in_states: empty | "N nuevas" |
| 3 | Botón marcar todo | button | tertiary | input | desktop | hidden_in_states: empty, loading | Marcar todo como leído |
| 4 | Lista reciente | list | — | content | desktop | hidden_in_states: empty, error de sistema / sin conexión | Últimas 10 (NotificationItem) |
| 5 | Sin notificaciones | empty-state | — | feedback | desktop | visible_only_in_states: empty | Nada nuevo |
| 6 | Error de carga | alert | error | feedback | desktop | visible_only_in_states: error de sistema / sin conexión | Falla |
| 7 | Link ver todas | link | — | navigation | desktop | — | Ir a S-12 |

## Layout por viewport

### desktop · 400px
- row `cabecera`
  - col 5/12: Título
  - col 3/12: Contador
  - col 4/12: Botón marcar todo
- Lista reciente
- Sin notificaciones
- Error de carga
- Link ver todas

## Contenido

### Título
- Texto/label: "Notificaciones"

### Contador
- Texto/label: "{n} nueva" / "{n} nuevas"

### Botón marcar todo
- Texto/label: "Marcar todo como leído"

### Lista reciente
- Texto/label: cada ítem: ícono por tipo · título · cuerpo · "{acción} →" · "· {tiempo relativo}". Los textos por tipo son los de S-12 (`notifications.md`).
- Annotation: no leídas con punto y en negrita; al tocar una queda leída y el contador baja (AC 30).

### Sin notificaciones
- Texto/label: "Estás al día. Te avisamos acá cuando pase algo en tus eventos."
- Icono: bell

### Error de carga
- Texto/label: "No pudimos cargar tus notificaciones." · acción "Reintentar"

### Link ver todas
- Texto/label: "Ver todas las notificaciones"
- Icono: arrow-right

## Estados

### default
- Aplica: Sí
- Mensaje: —
- Cambios: ninguno.

### empty
- Aplica: Sí
- Mensaje: "Estás al día."
- Cambios: Lista reciente, Contador y Botón marcar todo ocultos; Sin notificaciones visible.

### loading
- Aplica: Sí
- Mensaje: "Cargando…"
- Cambios: Lista reciente como skeleton de 3 ítems.

### error de validación
- Aplica: No.

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos cargar tus notificaciones."
- Cambios: Error de carga visible con "Reintentar".

### success
- Aplica: Sí — tras "Marcar todo como leído": todos los ítems leídos, Contador oculto, campana sin número.

### not found
- Aplica: No.

### estado terminal / readonly
- Aplica: No.

## Interacciones

**Eventos:**
- Ítem · on click → marca leída, cierra el panel y navega a la acción.
- Botón marcar todo · on click → todas leídas; el panel queda abierto.
- Link ver todas · on click → `/notifications`.
- Escape / click afuera / campana → cierra.

**Validaciones:** ninguna.

**Feedback:** el contador de la campana baja en el momento.

## Accesibilidad

- **Orden de foco:** Botón marcar todo → ítems → Link ver todas.
- **Landmarks y jerarquía:** popover con `role="dialog"` no modal y `aria-labelledby` = Título; la campana tiene `aria-expanded` y su nombre incluye el contador ("Notificaciones, 2 sin leer").
- **Foco y teclado:** al abrir, el foco va al primer ítem; Escape cierra y devuelve el foco a la campana. No atrapa el foco (no es modal).
- **Propio de esta composición:** el cambio del contador se anuncia en región live.

## Decisiones y descartes

**Decisiones tomadas:**
- Nuevo por REQ-003 (1k, RF 34). Solo desktop: en mobile la campana va a S-12 (decisión aprobada en la revisión UX).
- Últimas 10: el panel es para lo reciente; el historial está en S-12.
- El contador se actualiza por polling cada 60 s (DA-1); el panel pide la lista al abrirse.

**Alternativas descartadas:**
- Bottom-sheet en mobile: duplicaba S-12 con menos espacio.

**Preguntas abiertas:** ninguna.
