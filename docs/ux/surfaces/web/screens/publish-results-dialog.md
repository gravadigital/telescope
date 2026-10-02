---
name: publish-results-dialog
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

# Overlay: Publicar resultados (O-17)

## Identidad

- **Audiencia primaria:** [organizador](../../../audiences/organizador/research-context.md)
- **JTBD / Propósito:** decidir con información si cerrar la votación ahora o esperar, sabiendo cuántos rankings faltan y que no se puede volver atrás. Cubre JTBD-03 del organizador y REQ-003 RF 26, AC 21 (diseño 2f, L-1).
- **Viewports:**
  - **desktop** — diálogo de 480px centrado.
  - **mobile** — diálogo a pantalla completa con las acciones fijas abajo, apiladas.

## Entrada y salida

**Entradas:** S-05 en Votación · "Cerrar votación y publicar".

**Salidas user-driven:** a S-05 · "Seguir esperando", × o Escape.

**Salidas automáticas:** a S-05 en Resultados con "Resultados publicados."

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | Eyebrow transición | label | — | content | ambos | — | "VOTACIÓN → RESULTADOS" |
| 2 | Título | heading | h2 | content | ambos | — | Pregunta |
| 3 | Botón cerrar | button | tertiary | input | ambos | — | × |
| 4 | Explicación | paragraph | body | content | ambos | — | Qué es irreversible |
| 5 | Aviso faltantes | alert | warning | feedback | ambos | oculto si no faltan rankings | Cuántos faltan |
| 6 | Error de publicación | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Falla |
| 7 | Botón esperar | button | secondary | input | ambos | — | Seguir esperando |
| 8 | Botón publicar | button | primary | input | ambos | state_overrides: loading→disabled | Publicar |

## Layout por viewport

### desktop · 480px
- row `cabecera`
  - col 11/12: Eyebrow transición, Título
  - col 1/12: Botón cerrar
- Explicación
- Aviso faltantes
- Error de publicación
- row `acciones`
  - col 6/12: Botón esperar
  - col 6/12: Botón publicar

### mobile · 400px
- row `cabecera`
  - col 10/12: Eyebrow transición, Título
  - col 2/12: Botón cerrar
- Explicación
- Aviso faltantes
- Error de publicación
- Botón publicar
- Botón esperar

## Contenido

### Eyebrow transición
- Texto/label: "VOTACIÓN → RESULTADOS"

### Título
- Texto/label: "¿Cerrar votación y publicar?"

### Botón cerrar
- Texto/label: "×"
- Icono: close

### Explicación
- Texto/label: "Se calcula el ranking final y queda visible para todos. Nadie podrá votar después."

### Aviso faltantes
- Texto/label: "Faltan {n} de {m} rankings — Con pocos votos el resultado es menos confiable. Quien no envió su ranking queda con calidad 0 y su propuesta baja posiciones."
- Annotation: el cierre automático está fuera de alcance; no se promete que "la votación cierra sola".

### Error de publicación
- Texto/label: "No pudimos publicar los resultados. Probá de nuevo."

### Botón esperar
- Texto/label: "Seguir esperando"

### Botón publicar
- Texto/label: con faltantes "Publicar igual" · sin faltantes "Publicar resultados"

## Estados

### default
- Aplica: Sí — faltan rankings.
- Mensaje: "Faltan {n} de {m} rankings"
- Cambios: Aviso faltantes visible; Botón publicar = "Publicar igual".

### empty
- Aplica: No.

### loading
- Aplica: Sí
- Mensaje: "Publicando…"
- Cambios: Botón publicar y Botón esperar disabled.

### error de validación
- Aplica: No.

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos publicar los resultados. Probá de nuevo."
- Cambios: Error de publicación visible.

### success
- Aplica: No — cierra y S-05 muestra el aviso.

### todos votaron
- parent_state: default
- Aplica: Sí
- Mensaje: —
- Cambios: Aviso faltantes oculto; Botón publicar = "Publicar resultados".

### not found
- Aplica: No.

### estado terminal / readonly
- Aplica: No.

## Interacciones

**Eventos:**
- Botón publicar · on click → avanza a Resultados.
- Botón esperar / Botón cerrar / Escape → cierra sin cambios.

**Validaciones:** ninguna.

**Feedback:** cierra y S-05 muestra "Resultados publicados." con el podio.

## Accesibilidad

- **Orden de foco:** Botón cerrar → Botón esperar → Botón publicar.
- **Landmarks y jerarquía:** `role="alertdialog"` con `aria-labelledby` = Título y `aria-describedby` = Explicación + Aviso faltantes.
- **Foco y teclado:** foco inicial en Botón esperar (la opción segura); Escape cierra.
- **Propio de esta composición:** en mobile la acción principal va arriba para quedar al alcance del pulgar, pero el foco inicial sigue en la opción segura.

## Decisiones y descartes

**Decisiones tomadas:**
- Se permite publicar con rankings faltantes, con aviso (REQ-003 L-1, RF 26).
- "Seguir esperando" con el mismo peso visual que publicar (2f): la decisión tiene que ser informada.
- El aviso explica la consecuencia real para quien no votó (Q_i = 0, ADR-001).

**Alternativas descartadas:**
- "La votación cierra sola el {fecha}" (diseño 2f): el cierre automático está fuera de alcance.

**Preguntas abiertas:** ninguna.
