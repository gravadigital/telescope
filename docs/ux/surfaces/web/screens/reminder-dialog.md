---
name: reminder-dialog
surface: web
route: "/events/:eventId/manage"
overlay: true
overlay_type: modal
triggered_by: manage-event
viewports: [desktop, mobile]
audiences: [organizador]
fidelity: mid
status: diseñada
version: "1.0"
date: 2026-10-02
---

# Overlay: Confirmar recordatorio (O-19)

## Identidad

- **Audiencia primaria:** [organizador](../../../audiences/organizador/research-context.md)
- **JTBD / Propósito:** avisar a quienes faltan (archivo o ranking) sabiendo a cuántos les llega y por qué canal. Cubre REQ-003 RF 27, AC 22, 47.
- **Viewports:**
  - **desktop** — diálogo de 480px centrado.
  - **mobile** — diálogo a pantalla completa con las acciones fijas abajo.

## Entrada y salida

**Entradas:** S-05 · "Recordar a quienes no subieron archivo ({n})" (Participación) o "Enviar recordatorio a {n} pendientes" (Votación).

**Salidas user-driven:** a S-05 · "Cancelar", × o Escape.

**Salidas automáticas:** a S-05 con "Recordatorio enviado a {n} participantes."

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | Título | heading | h2 | content | ambos | — | Qué se envía |
| 2 | Botón cerrar | button | tertiary | input | ambos | — | × |
| 3 | Explicación | paragraph | body | content | ambos | — | Canal y destinatarios |
| 4 | Destinatarios | list | — | content | ambos | — | Nombres de los pendientes |
| 5 | Error de envío | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Falla |
| 6 | Botón cancelar | button | secondary | input | ambos | — | Cerrar |
| 7 | Botón enviar | button | primary | input | ambos | state_overrides: loading→disabled | Enviar |

## Layout por viewport

### desktop · 480px
- row `cabecera`
  - col 11/12: Título
  - col 1/12: Botón cerrar
- Explicación
- Destinatarios
- Error de envío
- row `acciones`
  - col 6/12: Botón cancelar
  - col 6/12: Botón enviar

### mobile · 400px
- row `cabecera`
  - col 10/12: Título
  - col 2/12: Botón cerrar
- Explicación
- Destinatarios
- Error de envío
- row `acciones`
  - col 5/12: Botón cancelar
  - col 7/12: Botón enviar

## Contenido

### Título
- Texto/label: Participación "Recordar que falta el archivo" · Votación "Recordar que falta el ranking"

### Botón cerrar
- Texto/label: "×"
- Icono: close

### Explicación
- Texto/label: "{n} participante(s) van a recibir un email y una notificación en la app con el cierre de la etapa."

### Destinatarios
- Texto/label: lista con el nombre de cada pendiente (hasta 5; luego "y {n} más")

### Error de envío
- Texto/label: "No pudimos enviar el recordatorio. Probá de nuevo."

### Botón cancelar
- Texto/label: "Cancelar"

### Botón enviar
- Texto/label: "Enviar recordatorio"

## Estados

### default
- Aplica: Sí
- Mensaje: —
- Cambios: ninguno.

### empty
- Aplica: No — sin pendientes el disparador no se muestra (AC 47). Si los pendientes llegan a 0 mientras el diálogo está abierto: "Ya no hay pendientes." y Botón enviar disabled.

### loading
- Aplica: Sí
- Mensaje: "Enviando…"
- Cambios: Botón enviar y Botón cancelar disabled.

### error de validación
- Aplica: No.

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos enviar el recordatorio. Probá de nuevo."
- Cambios: Error de envío visible. Evento pausado: "El evento está pausado; reanudalo para enviar recordatorios."

### success
- Aplica: No — cierra y S-05 muestra el aviso.

### not found
- Aplica: No.

### estado terminal / readonly
- Aplica: No.

## Interacciones

**Eventos:**
- Botón enviar · on click → envía email + notificación a los pendientes.
- Botón cancelar / Botón cerrar / Escape → cierra.

**Validaciones:** ninguna.

**Feedback:** en S-05 el disparador queda deshabilitado con "Recordatorio enviado" hasta recargar (mitigación de frecuencia del REQ).

## Accesibilidad

- **Orden de foco:** Botón cerrar → Botón cancelar → Botón enviar.
- **Landmarks y jerarquía:** diálogo con `aria-labelledby` = Título (h2).
- **Foco y teclado:** foco inicial en Botón enviar; Escape cierra.
- **Propio de esta composición:** ninguno.

## Decisiones y descartes

**Decisiones tomadas:**
- Nuevo por REQ-003 (RF 27): el diseño (2c, 2e) solo muestra el botón; la confirmación evita envíos accidentales de emails.
- Se nombran los destinatarios: el organizador ve a quién le escribe.
- Un solo diálogo para archivo y ranking, con título por etapa (RF 5).

**Alternativas descartadas:**
- Mensaje personalizado del organizador: no lo pide el REQ.

**Preguntas abiertas:** ninguna.
