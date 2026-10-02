---
name: edit-event-dialog
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

# Overlay: Editar datos del evento (O-18)

## Identidad

- **Audiencia primaria:** [organizador](../../../audiences/organizador/research-context.md)
- **JTBD / Propósito:** corregir nombre, descripción, organizador o cupo sin rehacer el evento. Cubre REQ-003 RF 17, AC 23, 45, 46. No tiene diseño: deriva del botón "Editar datos" de 2a y de los campos de S-03.
- **Viewports:**
  - **desktop** — diálogo de 560px centrado.
  - **mobile** — diálogo a pantalla completa con las acciones fijas abajo.

## Entrada y salida

**Entradas:** S-05 en Creación o Participación · "Editar datos".

**Salidas user-driven:** a S-05 · "Cancelar", × o Escape.

**Salidas automáticas:** a S-05 con "Datos actualizados."

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | Título | heading | h2 | content | ambos | — | "Editar datos del evento" |
| 2 | Botón cerrar | button | tertiary | input | ambos | — | × |
| 3 | Campo nombre | text-input | default | input | ambos | — | Nombre |
| 4 | Campo descripción | textarea | default | input | ambos | — | Descripción con contador |
| 5 | Campo organizador | text-input | default | input | ambos | — | Organizador |
| 6 | Selector de cupo | text-input | default | input | ambos | — | NumberStepper con mínimo = inscriptos |
| 7 | Ayuda cupo | paragraph | caption | content | ambos | — | Límite inferior |
| 8 | Error de guardado | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Falla |
| 9 | Botón cancelar | button | secondary | input | ambos | — | Cerrar |
| 10 | Botón guardar | button | primary | input | ambos | state_overrides: loading→disabled | Guardar |

## Layout por viewport

### desktop · 560px
- row `cabecera`
  - col 11/12: Título
  - col 1/12: Botón cerrar
- Campo nombre
- Campo descripción
- row `datos`
  - col 8/12: Campo organizador
  - col 4/12: Selector de cupo, Ayuda cupo
- Error de guardado
- row `acciones`
  - col 6/12: Botón cancelar
  - col 6/12: Botón guardar

### mobile · 400px
- row `cabecera`
  - col 10/12: Título
  - col 2/12: Botón cerrar
- Campo nombre
- Campo descripción
- Campo organizador
- Selector de cupo
- Ayuda cupo
- Error de guardado
- row `acciones`
  - col 5/12: Botón cancelar
  - col 7/12: Botón guardar

## Contenido

### Título
- Texto/label: "Editar datos del evento"

### Botón cerrar
- Texto/label: "×"
- Icono: close

### Campo nombre
- Texto/label: "Nombre del evento *"

### Campo descripción
- Texto/label: "Descripción *" · contador "{n} / 2000"

### Campo organizador
- Texto/label: "Organizador (opcional)"

### Selector de cupo
- Texto/label: "Cupo *" · "− {n} +"

### Ayuda cupo
- Texto/label: "Mínimo {inscriptos}: ya hay {inscriptos} inscriptos."

### Error de guardado
- Texto/label: "No pudimos guardar los cambios. Probá de nuevo."

### Botón cancelar
- Texto/label: "Cancelar"

### Botón guardar
- Texto/label: "Guardar cambios"

## Estados

### default
- Aplica: Sí
- Mensaje: —
- Cambios: campos precargados con los datos vigentes.

### empty
- Aplica: No.

### loading
- Aplica: Sí
- Mensaje: "Guardando…"
- Cambios: Botón guardar y Botón cancelar disabled.

### error de validación
- Aplica: Sí
- Mensaje: según el campo (ver Validaciones)
- Cambios: campo state=error con su mensaje.

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos guardar los cambios. Probá de nuevo."
- Cambios: Error de guardado visible. Si el evento ya pasó a Votación: "El evento ya está en votación y sus datos no se pueden editar." y Botón guardar disabled.

### success
- Aplica: No — cierra y S-05 muestra "Datos actualizados."

### not found
- Aplica: No.

### estado terminal / readonly
- Aplica: No — en Votación y Resultados el diálogo no es accesible (AC 46).

## Interacciones

**Eventos:**
- Botón guardar · on click → guarda solo los campos modificados.
- Botón cancelar / Botón cerrar / Escape → cierra; con cambios sin guardar pide confirmar: "¿Descartar los cambios?" · "Seguir editando" / "Descartar".

**Validaciones:**
- Campo nombre · < 3 o > 200 caracteres → "El nombre tiene que tener entre 3 y 200 caracteres."
- Campo nombre · duplicado → "Ya existe un evento con ese nombre."
- Campo descripción · < 10 caracteres → "La descripción tiene que tener al menos 10 caracteres."
- Campo organizador · > 200 caracteres → "Puede tener hasta 200 caracteres."
- Selector de cupo · menor a los inscriptos → "El cupo no puede ser menor a los {n} inscriptos." (el "−" se deshabilita en ese mínimo; AC 45).

**Feedback:** los cambios se ven en S-05 y en S-02 / S-04.

## Accesibilidad

- **Orden de foco:** Botón cerrar → Campo nombre → Campo descripción → Campo organizador → Selector de cupo → Botón cancelar → Botón guardar.
- **Landmarks y jerarquía:** diálogo con `aria-labelledby` = Título (h2).
- **Foco y teclado:** atrapa el foco; foco inicial en Campo nombre; Escape cierra.
- **Propio de esta composición:** ninguno.

## Decisiones y descartes

**Decisiones tomadas:**
- Nuevo por REQ-003 (RF 17): diálogo en vez de pantalla, porque edita cuatro campos y vuelve a la gestión.
- Mismos campos y reglas que S-03 (mismos componentes, RF 5).
- Fechas no editables acá: el cierre se pospone desde O-07 (D-04 fuera de alcance).

**Alternativas descartadas:**
- Reutilizar el wizard de S-03 para editar: tres pasos para cambiar un dato.

**Preguntas abiertas:** ninguna.
