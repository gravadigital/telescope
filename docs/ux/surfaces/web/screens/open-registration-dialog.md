---
name: open-registration-dialog
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

# Overlay: Abrir inscripción (O-15)

## Identidad

- **Audiencia primaria:** [organizador](../../../audiences/organizador/research-context.md)
- **JTBD / Propósito:** hacer público el evento y fijar hasta cuándo se pueden inscribir. Cubre REQ-003 RF 23, AC 17 (diseño 2b).
- **Viewports:**
  - **desktop** — diálogo de 480px centrado.
  - **mobile** — diálogo a pantalla completa con las acciones fijas abajo.

## Entrada y salida

**Entradas:** S-05 en Creación · "Abrir inscripción →".

**Salidas user-driven:** a S-05 · "Cancelar", × o Escape.

**Salidas automáticas:** a S-05 en Participación con "Inscripción abierta. Compartí el enlace para sumar participantes."

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | Eyebrow transición | label | — | content | ambos | — | "CREACIÓN → PARTICIPACIÓN" |
| 2 | Título | heading | h2 | content | ambos | — | "Abrir inscripción" |
| 3 | Botón cerrar | button | tertiary | input | ambos | — | × |
| 4 | Explicación | paragraph | body | content | ambos | — | Qué pasa |
| 5 | Campo cierre | date-picker | default | input | ambos | — | DateQuickPicker |
| 6 | Ayuda cierre | paragraph | caption | content | ambos | — | Se puede cambiar |
| 7 | Error de apertura | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Falla |
| 8 | Botón cancelar | button | secondary | input | ambos | — | Cerrar |
| 9 | Botón confirmar | button | primary | input | ambos | state_overrides: loading→disabled; error de validación→disabled | Abrir inscripción |

## Layout por viewport

### desktop · 480px
- row `cabecera`
  - col 11/12: Eyebrow transición, Título
  - col 1/12: Botón cerrar
- Explicación
- Campo cierre
- Ayuda cierre
- Error de apertura
- row `acciones`
  - col 6/12: Botón cancelar
  - col 6/12: Botón confirmar

### mobile · 400px
- row `cabecera`
  - col 10/12: Eyebrow transición, Título
  - col 2/12: Botón cerrar
- Explicación
- Campo cierre
- Ayuda cierre
- Error de apertura
- row `acciones`
  - col 5/12: Botón cancelar
  - col 7/12: Botón confirmar

## Contenido

### Eyebrow transición
- Texto/label: "CREACIÓN → PARTICIPACIÓN"

### Título
- Texto/label: "Abrir inscripción"

### Botón cerrar
- Texto/label: "×"
- Icono: close

### Explicación
- Texto/label: "El evento pasa a ser público. Las personas van a poder inscribirse y subir su archivo."

### Campo cierre
- Texto/label: "¿Hasta cuándo se pueden inscribir? *" · valor "{día de la semana} {d} de {mes} de {año}" · "Cambiar" · atajos "3 días · 1 semana · 2 semanas"
- Annotation: la fecha se muestra como fin del día; sin hora (L-10). Valor inicial: 1 semana.

### Ayuda cierre
- Texto/label: "Se muestra a los participantes. Podés posponerla después."

### Error de apertura
- Texto/label: "No pudimos abrir la inscripción. Probá de nuevo."

### Botón cancelar
- Texto/label: "Cancelar"

### Botón confirmar
- Texto/label: "Abrir inscripción"

## Estados

### default
- Aplica: Sí
- Mensaje: —
- Cambios: ninguno.

### empty
- Aplica: No.

### loading
- Aplica: Sí
- Mensaje: "Abriendo…"
- Cambios: Botón confirmar y Botón cancelar disabled.

### error de validación
- Aplica: Sí
- Mensaje: "Elegí una fecha posterior a hoy."
- Cambios: Campo cierre state=error; Botón confirmar disabled.

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos abrir la inscripción. Probá de nuevo."
- Cambios: Error de apertura visible.

### success
- Aplica: No — cierra y S-05 muestra el aviso.

### not found
- Aplica: No.

### estado terminal / readonly
- Aplica: No.

## Interacciones

**Eventos:**
- Atajos · on click → hoy + 3 / 7 / 14 días.
- "Cambiar" · on click → abre el calendario.
- Botón confirmar · on click → avanza a Participación con la fecha.
- Botón cancelar / Botón cerrar / Escape → cierra sin cambios.

**Validaciones:**
- Campo cierre · fecha no posterior a hoy → "Elegí una fecha posterior a hoy."

**Feedback:** cierra y S-05 muestra el aviso de éxito.

## Accesibilidad

- **Orden de foco:** Botón cerrar → atajos → "Cambiar" → Botón cancelar → Botón confirmar.
- **Landmarks y jerarquía:** diálogo con `aria-labelledby` = Título (h2).
- **Foco y teclado:** atrapa el foco; foco inicial en el atajo seleccionado; Escape cierra y devuelve el foco.
- **Propio de esta composición:** el cambio de fecha por atajo se anuncia ("Cierre: {fecha}").

## Decisiones y descartes

**Decisiones tomadas:**
- Título con la acción y botón con el mismo verbo (2b), en vez de "Advance to…" / "Confirm".
- Atajos de duración (2b): el caso común es "dentro de una semana".
- Sin hora: el modelo guarda fecha (L-10).
- "Podés posponerla" en vez de "modificarla": el cierre solo se pospone (RF 28).

**Alternativas descartadas:** ninguna.

**Preguntas abiertas:** ninguna.
