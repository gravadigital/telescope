---
name: open-voting-dialog
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

# Overlay: Abrir votación (O-16)

## Identidad

- **Audiencia primaria:** [organizador](../../../audiences/organizador/research-context.md)
- **JTBD / Propósito:** cerrar la inscripción y repartir las propuestas en un solo paso, entendiendo el reparto y sabiendo que no se puede deshacer. Cubre REQ-003 RF 24, 25, AC 19, 35, 36, 37, 39 (diseño 2d, DA-4).
- **Viewports:**
  - **desktop** — diálogo de 560px centrado sobre la gestión oscurecida.
  - **mobile** — diálogo a pantalla completa con las acciones fijas abajo.

## Entrada y salida

**Entradas:**
- S-05 en Participación · "Configurar y abrir votación →".

**Salidas user-driven:**
- A S-05 (Participación) · "Cancelar", × o Escape.

**Salidas automáticas:**
- A S-05 en Votación tras confirmar, con el aviso "Votación abierta. Se asignaron las propuestas."

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | Eyebrow transición | label | — | content | ambos | — | "PARTICIPACIÓN → VOTACIÓN" |
| 2 | Título | heading | h2 | content | ambos | — | "Abrir votación" |
| 3 | Botón cerrar | button | tertiary | input | ambos | — | × |
| 4 | Explicación | paragraph | body | content | ambos | — | Qué pasa |
| 5 | Resumen propuestas | card | — | content | ambos | — | StatTile propuestas |
| 6 | Resumen evaluadores | card | — | content | ambos | — | StatTile evaluadores |
| 7 | Resumen evaluaciones | card | — | content | ambos | hidden_in_states: empty | StatTile evaluaciones por archivo |
| 8 | Aviso quedan afuera | alert | warning | feedback | ambos | oculto si todos subieron propuesta | Inscriptos sin propuesta |
| 9 | Aviso mínimo | alert | error | feedback | ambos | visible_only_in_states: empty | Menos de 3 propuestas |
| 10 | Campo cierre | date-picker | default | input | ambos | hidden_in_states: empty | DateQuickPicker |
| 11 | Selector por evaluador | text-input | default | input | ambos | hidden_in_states: empty | NumberStepper |
| 12 | Ayuda por evaluador | paragraph | caption | content | ambos | hidden_in_states: empty | Recomendado y máximo |
| 13 | Ajustes avanzados | section | — | input | ambos | hidden_in_states: empty | Collapsible, cerrado por defecto |
| 14 | Campo evaluaciones mínimas | text-input | default | input | ambos | visible_only_in_states: avanzados abiertos, error de validación | Evaluaciones mínimas por archivo |
| 15 | Campo peso del ajuste | text-input | default | input | ambos | visible_only_in_states: avanzados abiertos, error de validación | Posiciones que sube o baja |
| 16 | Campo umbral confiable | text-input | default | input | ambos | visible_only_in_states: avanzados abiertos, error de validación | Umbral de evaluador confiable |
| 17 | Campo umbral poco confiable | text-input | default | input | ambos | visible_only_in_states: avanzados abiertos, error de validación | Umbral de evaluador poco confiable |
| 18 | Aviso irreversible | alert | warning | feedback | ambos | hidden_in_states: empty | No se puede volver |
| 19 | Error de apertura | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Falla |
| 20 | Botón cancelar | button | secondary | input | ambos | — | Cerrar |
| 21 | Botón confirmar | button | primary | input | ambos | state_overrides: empty→disabled; error de validación→disabled; loading→disabled | Abrir votación y asignar |

## Layout por viewport

### desktop · 560px
- row `cabecera`
  - col 11/12: Eyebrow transición, Título
  - col 1/12: Botón cerrar
- Explicación
- row `resumen`
  - col 4/12: Resumen propuestas
  - col 4/12: Resumen evaluadores
  - col 4/12: Resumen evaluaciones
- Aviso quedan afuera
- Aviso mínimo
- row `campos`
  - col 6/12: Campo cierre
  - col 6/12: Selector por evaluador, Ayuda por evaluador
- Ajustes avanzados
- row `avanzados-1`
  - col 6/12: Campo evaluaciones mínimas
  - col 6/12: Campo peso del ajuste
- row `avanzados-2`
  - col 6/12: Campo umbral confiable
  - col 6/12: Campo umbral poco confiable
- Aviso irreversible
- Error de apertura
- row `acciones`
  - col 6/12: Botón cancelar
  - col 6/12: Botón confirmar

### mobile · 400px
- row `cabecera`
  - col 10/12: Eyebrow transición, Título
  - col 2/12: Botón cerrar
- Explicación
- row `resumen`
  - col 4/12: Resumen propuestas
  - col 4/12: Resumen evaluadores
  - col 4/12: Resumen evaluaciones
- Aviso quedan afuera
- Aviso mínimo
- Campo cierre
- Selector por evaluador
- Ayuda por evaluador
- Ajustes avanzados
- Campo evaluaciones mínimas
- Campo peso del ajuste
- Campo umbral confiable
- Campo umbral poco confiable
- Aviso irreversible
- Error de apertura
- row `acciones`
  - col 5/12: Botón cancelar
  - col 7/12: Botón confirmar

## Contenido

### Eyebrow transición
- Texto/label: "PARTICIPACIÓN → VOTACIÓN"

### Título
- Texto/label: "Abrir votación"

### Botón cerrar
- Texto/label: "×"
- Icono: close

### Explicación
- Texto/label: "Se cierra la inscripción y el sistema reparte las propuestas entre los participantes que subieron la suya. Nadie evalúa su propio archivo."

### Resumen propuestas
- Texto/label: "{k} propuestas"

### Resumen evaluadores
- Texto/label: "{k} evaluadores"

### Resumen evaluaciones
- Texto/label: "{m} evaluaciones por archivo"
- Annotation: se recalcula al mover el Selector por evaluador.

### Aviso quedan afuera
- Texto/label: "{n} inscripto(s) no subió su propuesta: no va a evaluar ni ser evaluado."

### Aviso mínimo
- Texto/label: "Se necesitan al menos 3 participantes con propuesta para abrir la votación. Hoy hay {k}."

### Campo cierre
- Texto/label: "Cierre de la votación *" · valor "{día} {fecha}" · atajos "3 días · 1 semana · 2 semanas" · "Cambiar"
- Annotation: la fecha se muestra como fin del día (L-10). Valor inicial: 1 semana.

### Selector por evaluador
- Texto/label: "Propuestas por evaluador" · "− {m} +"
- Annotation: inicia en el recomendado de `GET /voting-config/preview`; "+" se deshabilita en el máximo, "−" en el mínimo (AC 36).

### Ayuda por evaluador
- Texto/label: "Recomendado: {recomendado} · máximo {máximo}"

### Ajustes avanzados
- Texto/label: "Ajustes avanzados de calidad — Valores recomendados · funcionan bien para la mayoría de los eventos" · "Mostrar" / "Ocultar"

### Campo evaluaciones mínimas
- Texto/label: "Evaluaciones mínimas por archivo" · valor inicial "min(3, propuestas por evaluador)"

### Campo peso del ajuste
- Texto/label: "Peso del ajuste por calidad" · "{n} posiciones" (1–10, recomendado 3) · ayuda "Cuántas posiciones sube o baja la propuesta de cada evaluador según su coherencia."

### Campo umbral confiable
- Texto/label: "Umbral de evaluador confiable" · "0,6" · ayuda "Por encima, la propuesta de ese evaluador sube posiciones."

### Campo umbral poco confiable
- Texto/label: "Umbral de evaluador poco confiable" · "0,3" · ayuda "Por debajo, la propuesta de ese evaluador baja posiciones."

### Aviso irreversible
- Texto/label: "No se puede volver a Participación ni rehacer el reparto."

### Error de apertura
- Texto/label: "No pudimos abrir la votación. El evento sigue en Participación; probá de nuevo."

### Botón cancelar
- Texto/label: "Cancelar"

### Botón confirmar
- Texto/label: "Abrir votación y asignar"

## Estados

### default
- Aplica: Sí
- Mensaje: —
- Cambios: Ajustes avanzados cerrado.

### avanzados abiertos
- parent_state: default
- Aplica: Sí
- Mensaje: —
- Cambios: Campo evaluaciones mínimas, Campo peso del ajuste, Campo umbral confiable y Campo umbral poco confiable visibles con los valores recomendados.

### empty
- Aplica: Sí — menos de 3 participantes con propuesta (AC 35).
- Mensaje: "Se necesitan al menos 3 participantes con propuesta para abrir la votación."
- Cambios: Aviso mínimo visible; campos ocultos; Botón confirmar variant=disabled.

### loading
- Aplica: Sí
- Mensaje: "Calculando el reparto…" (al abrir) · "Abriendo votación…" (al confirmar)
- Cambios: resumen como skeleton; al confirmar, Botón confirmar y Botón cancelar disabled.

### error de validación
- Aplica: Sí (AC 37)
- Mensaje: "El umbral confiable tiene que superar al poco confiable por al menos 0,1."
- Cambios: Campo umbral confiable y Campo umbral poco confiable state=error; Botón confirmar variant=disabled. Elegir una fecha pasada: Campo cierre state=error "Elegí una fecha posterior a hoy."

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos abrir la votación. El evento sigue en Participación; probá de nuevo."
- Cambios: Error de apertura visible; los valores elegidos se conservan. Si falla el preview: "No pudimos calcular el reparto." + "Reintentar" y confirmar deshabilitado.

### success
- Aplica: No — cierra el diálogo y S-05 muestra el aviso.

### not found
- Aplica: No.

### estado terminal / readonly
- Aplica: No.

## Interacciones

**Eventos:**
- Atajos de Campo cierre · on click → fijan la fecha a hoy + 3 / 7 / 14 días.
- "−" / "+" de Selector por evaluador · on click → cambia `m` y recalcula evaluaciones por archivo.
- Ajustes avanzados · on click → muestra / oculta.
- Botón confirmar · on click → abre la votación con la configuración en una sola operación.
- Botón cancelar, Botón cerrar, Escape · → cierra sin cambios.

**Validaciones:**
- Campo cierre · fecha no posterior a hoy → "Elegí una fecha posterior a hoy."
- Selector por evaluador · fuera de [mínimo, máximo] → no se permite (botones deshabilitados).
- Umbrales · confiable ≤ poco confiable o diferencia < 0,1 → "El umbral confiable tiene que superar al poco confiable por al menos 0,1."
- Campo peso del ajuste · fuera de 1–10 → "Elegí un valor entre 1 y 10."

**Feedback:** éxito → cierra y S-05 pasa a Votación con aviso. Error del backend → mensaje por `code` (DA-6).

## Accesibilidad

- **Orden de foco:** Botón cerrar → Campo cierre (atajos) → Selector por evaluador → Ajustes avanzados → campos avanzados → Botón cancelar → Botón confirmar.
- **Landmarks y jerarquía:** diálogo con `aria-labelledby` = Título. Título es h2 (la página ya tiene h1).
- **Foco y teclado:** atrapa el foco; foco inicial en Campo cierre; Escape cierra; al cerrar el foco vuelve al botón que lo abrió.
- **Propio de esta composición:** el recálculo de "evaluaciones por archivo" se anuncia en región live.

## Decisiones y descartes

**Decisiones tomadas:**
- Un solo diálogo que avanza, configura y asigna (REQ-003 L-5, DA-4): la v1.0 tenía dos pasos y podía dejar el evento en Votación sin configuración.
- Recomendado y máximo vienen del backend (DA-5); el front no recalcula `m`.
- Ajustes técnicos plegados con valores recomendados (2d).
- Copy de los umbrales corregido al modelo (L-6): habla de la propuesta del evaluador, no del peso del voto.
- Con menos de 3 propuestas el diálogo se abre igual y explica el bloqueo: decir por qué es mejor que un botón deshabilitado sin motivo.

**Alternativas descartadas:**
- "Por encima, su voto pesa más" (texto del diseño): describe un mecanismo que no existe.

**Preguntas abiertas:** ninguna.
