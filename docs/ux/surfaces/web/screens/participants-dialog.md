---
name: participants-dialog
surface: web
route: "/events/:eventId"
overlay: true
overlay_type: modal
triggered_by: event-detail
viewports: [desktop, mobile]
audiences: [participante]
fidelity: mid
status: diseñada
version: "2.0"
date: 2026-10-02
---

# Overlay: Participantes (O-08)

## Identidad

- **Audiencia primaria:** [participante](../../../audiences/participante/research-context.md)
- **JTBD / Propósito:** ver quiénes están inscriptos en el evento. Cubre C-20 y la fila "Participantes · ver" de 1e / 1i.
- **Viewports:**
  - **desktop** — diálogo de 560px con la tabla.
  - **mobile** — diálogo a pantalla completa; la tabla se apila.

## Entrada y salida

**Entradas:** S-04 · "ver" en Detalles ("{n} / {cupo} · ver").

**Salidas user-driven:** a S-04 · "Cerrar", × o Escape.

**Salidas automáticas:** ninguna.

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | Título | heading | h2 | content | ambos | — | "Participantes · N / cupo" |
| 2 | Botón cerrar | button | tertiary | input | ambos | — | × |
| 3 | Tabla de participantes | table | — | content | ambos | hidden_in_states: empty, error de sistema / sin conexión · viewport_overrides: mobile→filas apiladas | ParticipantsTable, variante pública |
| 4 | Sin participantes | empty-state | — | feedback | ambos | visible_only_in_states: empty | Nadie inscripto |
| 5 | Error de carga | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Falla |
| 6 | Botón cerrar pie | button | secondary | input | ambos | — | Cerrar |

## Layout por viewport

### desktop · 560px
- row `cabecera`
  - col 11/12: Título
  - col 1/12: Botón cerrar
- Tabla de participantes
- Sin participantes
- Error de carga
- Botón cerrar pie

### mobile · 400px
- row `cabecera`
  - col 10/12: Título
  - col 2/12: Botón cerrar
- Tabla de participantes
- Sin participantes
- Error de carga
- Botón cerrar pie

## Contenido

### Título
- Texto/label: "Participantes · {n} / {cupo}"

### Botón cerrar
- Texto/label: "×"
- Icono: close

### Tabla de participantes
- Texto/label: columnas "NOMBRE · INSCRIPCIÓN"
- Annotation: variante pública del componente de S-05: sin email ni estado de archivo o voto.

### Sin participantes
- Texto/label: "Todavía no hay inscriptos."

### Error de carga
- Texto/label: "No pudimos cargar los participantes." · acción "Reintentar"

### Botón cerrar pie
- Texto/label: "Cerrar"

## Estados

### default
- Aplica: Sí
- Mensaje: —
- Cambios: ninguno.

### empty
- Aplica: Sí
- Mensaje: "Todavía no hay inscriptos."
- Cambios: Tabla oculta; Sin participantes visible.

### loading
- Aplica: Sí
- Mensaje: "Cargando participantes…"
- Cambios: Tabla como skeleton de 4 filas.

### error de validación
- Aplica: No.

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos cargar los participantes."
- Cambios: Error de carga visible con "Reintentar"; nunca datos inventados (REQ-001).

### success
- Aplica: No.

### not found
- Aplica: No.

### estado terminal / readonly
- Aplica: Sí — el diálogo es de solo lectura.

## Interacciones

**Eventos:**
- Botón cerrar / Botón cerrar pie / Escape → cierra.
- "Reintentar" · on click → vuelve a pedir.

**Validaciones:** ninguna.

**Feedback:** ninguno.

## Accesibilidad

- **Orden de foco:** Botón cerrar → tabla → Botón cerrar pie.
- **Landmarks y jerarquía:** diálogo con `aria-labelledby` = Título (h2); la tabla usa el título como caption.
- **Foco y teclado:** atrapa el foco; Escape cierra y devuelve el foco a "ver".
- **Propio de esta composición:** ninguno.

## Decisiones y descartes

**Decisiones tomadas:**
- Reescrito por REQ-003: Dialog con la tabla de participantes reutilizable (RF 5, tabla "Pantallas y overlays actuales sin diseño").
- Variante pública sin email: los emails de los participantes solo los ve el organizador en S-05.

**Alternativas descartadas:** ninguna.

**Preguntas abiertas:** ninguna.
