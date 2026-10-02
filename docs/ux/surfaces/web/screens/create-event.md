---
name: create-event
surface: web
route: "/events/create"
viewports: [desktop, mobile]
audiences: [organizador]
fidelity: mid
status: diseñada
version: "2.0"
date: 2026-10-02
---

# Pantalla: Crear evento (S-03)

## Identidad

- **Audiencia primaria:** [organizador](../../../audiences/organizador/research-context.md)
- **JTBD / Propósito:** dejar armado el evento (qué es y cuántos pueden participar) y ver cómo lo van a encontrar los demás antes de crearlo. Cubre JTBD-01 del organizador y REQ-003 RF 16 (wizard Identificación → Cupo → Revisar y crear, mismas validaciones que hoy).
- **Viewports:**
  - **desktop** — formulario a la izquierda y vista previa en vivo a la derecha.
  - **mobile** — el paso actual a ancho completo; la vista previa va debajo del formulario; la barra de acciones queda fija abajo.
- **Acceso:** con sesión (`RequireAuth`); sin sesión → `/login?next=/events/create`.

## Entrada y salida

**Entradas:**
- S-02 · "+ Crear evento". S-01 · "Crear un evento" / "Crear mi primer evento". S-11 · "Crear evento".

**Salidas user-driven:**
- A S-05 Gestión · "Crear evento" en el paso 3 (éxito).
- A S-02 · "Cancelar".

**Salidas automáticas:**
- A S-07 si no hay sesión.

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | header | header | — | layout | ambos | — | AppHeader |
| 2 | Migas | breadcrumbs | — | navigation | ambos | — | Eventos / Crear evento |
| 3 | Título | heading | h1 | content | ambos | — | "Crear evento" |
| 4 | Pasos del wizard | progress-bar | — | feedback | ambos | viewport_overrides: mobile→"Paso N de 3" sin etiquetas | Stepper de 3 pasos |
| 5 | Eyebrow paso | label | — | content | ambos | — | "PASO N DE 3" |
| 6 | Pregunta del paso | heading | h2 | content | ambos | — | Título del paso actual |
| 7 | Campo nombre | text-input | default | input | ambos | visible_only_in_states: default, error de validación | Paso 1 |
| 8 | Campo descripción | textarea | default | input | ambos | visible_only_in_states: default, error de validación | Paso 1, con contador |
| 9 | Campo organizador | text-input | default | input | ambos | visible_only_in_states: default, error de validación | Paso 1, opcional |
| 10 | Selector de cupo | text-input | default | input | ambos | visible_only_in_states: paso cupo | Paso 2, NumberStepper |
| 11 | Ayuda cupo | paragraph | caption | content | ambos | visible_only_in_states: paso cupo | Qué significa el cupo |
| 12 | Resumen revisión | list | — | content | ambos | visible_only_in_states: paso revisar | Paso 3: datos a confirmar |
| 13 | Aviso visibilidad | alert | info | feedback | ambos | visible_only_in_states: paso revisar | Qué pasa al crear |
| 14 | Título vista previa | label | — | content | ambos | — | "Vista previa en la lista" |
| 15 | Vista previa | card | — | content | ambos | — | Fila tal como se verá en S-02 |
| 16 | Consejo | alert | info | feedback | ambos | visible_only_in_states: default | InfoCallout |
| 17 | Error del formulario | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Falla al crear |
| 18 | Botón cancelar | button | tertiary | input | ambos | — | Salir sin crear |
| 19 | Botón atrás | button | secondary | input | ambos | hidden_in_states: default | Paso anterior |
| 20 | Botón siguiente | button | primary | input | ambos | state_overrides: paso revisar→"Crear evento"; loading→disabled | Avanzar / crear |

## Layout por viewport

### desktop · 1200px
- Migas
- Título
- Pasos del wizard
- row `wizard`
  - col 7/12: Eyebrow paso, Pregunta del paso, Campo nombre, Campo descripción, Campo organizador, Selector de cupo, Ayuda cupo, Resumen revisión, Aviso visibilidad, Error del formulario
  - col 5/12: Título vista previa, Vista previa, Consejo
- row `acciones`
  - col 6/12: Botón cancelar
  - col 3/12: Botón atrás
  - col 3/12: Botón siguiente

### mobile · 400px
- Migas
- Título
- Pasos del wizard
- Eyebrow paso
- Pregunta del paso
- Campo nombre
- Campo descripción
- Campo organizador
- Selector de cupo
- Ayuda cupo
- Resumen revisión
- Aviso visibilidad
- Error del formulario
- Título vista previa
- Vista previa
- Consejo
- row `acciones`
  - col 4/12: Botón atrás
  - col 8/12: Botón siguiente
- Botón cancelar

## Contenido

### header
- Texto/label: "TELESCOPIO | Inicio · Eventos · Cómo funciona | campana · menú de usuario"

### Migas
- Texto/label: "Eventos / Crear evento"

### Título
- Texto/label: "Crear evento"

### Pasos del wizard
- Texto/label: "1 Identificación · 2 Cupo · 3 Revisar y crear"
- Annotation: completado ✓, actual "En curso", pendiente. Se puede volver a un paso completado tocándolo.

### Eyebrow paso
- Texto/label: "PASO {n} DE 3"

### Pregunta del paso
- Texto/label: paso 1 "¿De qué se trata tu evento?" · paso 2 "¿Cuántas personas pueden participar?" · paso 3 "Revisá y creá tu evento"

### Campo nombre
- Texto/label: "Nombre del evento *" · placeholder "Ej. Concurso de fotografía primavera 2026" · ayuda "Es lo primero que verán en la lista de eventos."

### Campo descripción
- Texto/label: "Descripción *" · contador "{n} / 2000" · ayuda "Incluí qué deben enviar y cómo se evalúa."

### Campo organizador
- Texto/label: "Organizador (opcional)" · placeholder "Ej. Club de Fotografía" · ayuda "Si lo dejás vacío se muestra tu nombre."

### Selector de cupo
- Texto/label: "Cupo de participantes *" · selector "− {n} +" · "Entre 1 y 100"

### Ayuda cupo
- Texto/label: "Cuando se completa el cupo nadie más puede inscribirse. Podés cambiarlo mientras la inscripción esté abierta."

### Resumen revisión
- Texto/label: "Nombre · Descripción · Organizador · Cupo" con "Editar" junto a cada dato

### Aviso visibilidad
- Texto/label: "El evento se crea en etapa Creación: nadie más puede verlo hasta que abras la inscripción. La fecha de cierre la definís en ese momento."
- Icono: info

### Título vista previa
- Texto/label: "Vista previa en la lista"

### Vista previa
- Texto/label: "Inscripción abierta" · nombre · descripción recortada · "por {organizador} · 0 / {cupo}"
- Annotation: se actualiza en vivo; muestra cómo se verá el evento cuando abra la inscripción.

### Consejo
- Texto/label: "Consejo — Los eventos con criterios de evaluación claros reciben votos más consistentes."

### Error del formulario
- Texto/label: "No pudimos crear el evento. Probá de nuevo."

### Botón cancelar
- Texto/label: "Cancelar"

### Botón atrás
- Texto/label: "← Atrás"

### Botón siguiente
- Texto/label: paso 1 "Siguiente: Cupo →" · paso 2 "Siguiente: Revisar →" · paso 3 "Crear evento"

## Estados

### default
- Aplica: Sí (paso 1, Identificación)
- Mensaje: —
- Cambios: Botón atrás oculto.

### paso cupo
- parent_state: default
- Aplica: Sí
- Mensaje: —
- Cambios: Campo nombre, Campo descripción, Campo organizador y Consejo ocultos; Selector de cupo y Ayuda cupo visibles; Botón atrás visible.

### paso revisar
- parent_state: default
- Aplica: Sí
- Mensaje: —
- Cambios: Resumen revisión y Aviso visibilidad visibles; inputs ocultos; Botón siguiente content="Crear evento".

### empty
- Aplica: No — es un formulario.

### loading
- Aplica: Sí
- Mensaje: "Creando evento…"
- Cambios: Botón siguiente variant=disabled con el texto de carga; Botón atrás y Botón cancelar disabled.

### error de validación
- Aplica: Sí
- Mensaje: según el campo (ver Validaciones)
- Cambios: el campo inválido state=error con su mensaje; Botón siguiente sigue habilitado y lleva el foco al primer error.

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos crear el evento. Probá de nuevo."
- Cambios: Error del formulario visible; los datos cargados se conservan. Si el nombre ya existe: "Ya existe un evento con ese nombre." en Campo nombre (paso 1).

### success
- Aplica: No — el éxito navega a S-05.

### not found
- Aplica: No.

### estado terminal / readonly
- Aplica: No.

## Interacciones

**Eventos:**
- Botón siguiente · on click → valida el paso; si es válido avanza; en el paso 3 crea el evento.
- Botón atrás · on click → paso anterior sin perder datos.
- Pasos del wizard · on click en un paso completado → vuelve a ese paso.
- "Editar" en Resumen revisión · on click → vuelve al paso del dato.
- Botón cancelar · on click → navega a `/events` (con datos cargados pide confirmar: "¿Descartar el evento? Se pierde lo que cargaste." · "Seguir editando" / "Descartar").

**Validaciones:**
- Campo nombre · vacío o < 3 caracteres → "El nombre tiene que tener al menos 3 caracteres."
- Campo nombre · > 200 caracteres → "El nombre puede tener hasta 200 caracteres."
- Campo descripción · < 10 caracteres → "La descripción tiene que tener al menos 10 caracteres."
- Campo descripción · > 2000 caracteres → el contador bloquea el ingreso.
- Campo organizador · > 200 caracteres → "Puede tener hasta 200 caracteres."
- Selector de cupo · fuera de 1–100 → los botones − / + se deshabilitan en los límites.

**Feedback:** éxito → navega a `/events/{id}/manage` con el aviso "Evento creado. Cuando esté listo, abrí la inscripción."

## Accesibilidad

- **Orden de foco:** Migas → Pasos del wizard → campos del paso → Botón cancelar → Botón atrás → Botón siguiente. La vista previa no recibe foco.
- **Landmarks y jerarquía:** header / main. h1 = Título; h2 = Pregunta del paso.
- **Foco y teclado:** al cambiar de paso el foco va a Pregunta del paso.
- **Propio de esta composición:** el paso actual se anuncia como "Paso N de 3, {nombre}" (aria-current en el stepper); la vista previa es `aria-hidden` porque repite los datos del formulario.

## Decisiones y descartes

**Decisiones tomadas:**
- Wizard de 3 pasos y no de 5: REQ-003 L-4 — solo lo que existe hoy; fechas y reglas se definen al avanzar de etapa (O-15, O-16).
- Vista previa en vivo del diseño 1d: el organizador ve cómo lo encontrarán en S-02.
- Aviso de visibilidad en el paso 3: con RF 14 un evento en Creación es invisible, y hay que decirlo antes de crear.
- En mobile la vista previa va debajo: a 400px no hay espacio lateral y el formulario es la tarea.
- Éxito navega a S-05 (la v1.0 iba a S-04 y redirigía).

**Alternativas descartadas:**
- Pasos "Fechas", "Archivos permitidos" y "Reglas de votación": fuera de alcance (L-4).
- "Guardar borrador" y autoguardado: fuera de alcance; el wizard es corto.

**Preguntas abiertas:** ninguna.
