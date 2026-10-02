---
name: edit-deadline-dialog
surface: web
route: "/events/:eventId/manage"
overlay: true
overlay_type: modal
triggered_by: manage-event
viewports: [desktop, mobile]
audiences: [organizador]
fidelity: mid
status: diseñada
version: "2.0"
date: 2026-10-02
---

# Overlay: Editar cierre (O-07)

## Identidad

- **Audiencia primaria:** [organizador](../../../audiences/organizador/research-context.md)
- **JTBD / Propósito:** dar más tiempo a la etapa actual. Cubre C-14 y REQ-003 RF 28, AC 24, 38. Reutiliza el componente de fecha de 2b.
- **Viewports:**
  - **desktop** — diálogo de 480px centrado.
  - **mobile** — diálogo a pantalla completa con las acciones fijas abajo.

## Entrada y salida

**Entradas:** S-05 · "editar" junto al cierre de la etapa actual en la línea de etapas.

**Salidas user-driven:** a S-05 · "Cancelar", × o Escape.

**Salidas automáticas:** a S-05 con "Cierre actualizado."

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | Eyebrow etapa | label | — | content | ambos | — | Etapa cuyo cierre cambia |
| 2 | Título | heading | h2 | content | ambos | — | "Posponer el cierre" |
| 3 | Botón cerrar | button | tertiary | input | ambos | — | × |
| 4 | Cierre actual | label | — | content | ambos | — | Fecha vigente |
| 5 | Campo nuevo cierre | date-picker | default | input | ambos | — | DateQuickPicker desde el cierre actual |
| 6 | Ayuda | paragraph | caption | content | ambos | — | Regla y aviso a participantes |
| 7 | Error de guardado | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Falla |
| 8 | Botón cancelar | button | secondary | input | ambos | — | Cerrar |
| 9 | Botón guardar | button | primary | input | ambos | state_overrides: loading→disabled; error de validación→disabled | Guardar |

## Layout por viewport

### desktop · 480px
- row `cabecera`
  - col 11/12: Eyebrow etapa, Título
  - col 1/12: Botón cerrar
- Cierre actual
- Campo nuevo cierre
- Ayuda
- Error de guardado
- row `acciones`
  - col 6/12: Botón cancelar
  - col 6/12: Botón guardar

### mobile · 400px
- row `cabecera`
  - col 10/12: Eyebrow etapa, Título
  - col 2/12: Botón cerrar
- Cierre actual
- Campo nuevo cierre
- Ayuda
- Error de guardado
- row `acciones`
  - col 5/12: Botón cancelar
  - col 7/12: Botón guardar

## Contenido

### Eyebrow etapa
- Texto/label: "PARTICIPACIÓN" / "VOTACIÓN"

### Título
- Texto/label: "Posponer el cierre"

### Botón cerrar
- Texto/label: "×"
- Icono: close

### Cierre actual
- Texto/label: "Cierre actual: {fecha}"

### Campo nuevo cierre
- Texto/label: "Nuevo cierre *" · atajos "+3 días · +1 semana · +2 semanas" · "Cambiar"
- Annotation: los atajos suman sobre el cierre actual; el calendario no permite fechas anteriores.

### Ayuda
- Texto/label: "El cierre solo se puede posponer. Los participantes reciben un email con la nueva fecha."

### Error de guardado
- Texto/label: "No pudimos cambiar el cierre. Probá de nuevo."

### Botón cancelar
- Texto/label: "Cancelar"

### Botón guardar
- Texto/label: "Posponer cierre"

## Estados

### default
- Aplica: Sí
- Mensaje: —
- Cambios: ninguno.

### empty
- Aplica: No.

### loading
- Aplica: Sí
- Mensaje: "Guardando…"
- Cambios: Botón guardar y Botón cancelar disabled.

### error de validación
- Aplica: Sí (AC 38)
- Mensaje: "El cierre solo se puede posponer. Elegí una fecha posterior al {cierre actual}."
- Cambios: Campo nuevo cierre state=error; Botón guardar disabled.

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos cambiar el cierre. Probá de nuevo."
- Cambios: Error de guardado visible.

### success
- Aplica: No — cierra y S-05 muestra "Cierre actualizado."

### not found
- Aplica: No.

### estado terminal / readonly
- Aplica: No.

## Interacciones

**Eventos:**
- Atajos · on click → cierre actual + 3 / 7 / 14 días.
- Botón guardar · on click → pospone.
- Botón cancelar / Botón cerrar / Escape → cierra sin cambios.

**Validaciones:**
- Campo nuevo cierre · fecha ≤ cierre actual → "El cierre solo se puede posponer. Elegí una fecha posterior al {cierre actual}."

**Feedback:** S-05 actualiza la línea de etapas y la métrica de cierre.

## Accesibilidad

- **Orden de foco:** Botón cerrar → atajos → "Cambiar" → Botón cancelar → Botón guardar.
- **Landmarks y jerarquía:** diálogo con `aria-labelledby` = Título (h2).
- **Foco y teclado:** atrapa el foco; Escape cierra y devuelve el foco a "editar".
- **Propio de esta composición:** ninguno.

## Decisiones y descartes

**Decisiones tomadas:**
- Reescrito por REQ-003: pasa al Dialog con el mismo selector de fecha que O-15 (RF 5).
- Se abre desde la línea de etapas, donde se lee la fecha (2c).
- La regla "solo posponer" se valida también en el cliente (cierra D-06).
- La ayuda menciona el email: hoy el cambio de cierre ya lo envía (REQ-003, punto abierto 1).

**Alternativas descartadas:** ninguna.

**Preguntas abiertas:** ninguna.
