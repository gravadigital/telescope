---
name: notifications
surface: web
route: "/notifications"
viewports: [desktop, mobile]
audiences: [participante, organizador]
fidelity: mid
status: diseñada
version: "1.0"
date: 2026-10-02
---

# Pantalla: Notificaciones (S-12)

## Identidad

- **Audiencia primaria (co-primary):** [participante](../../../audiences/participante/research-context.md), [organizador](../../../audiences/organizador/research-context.md).
- **JTBD / Propósito:** revisar todo lo que pasó en mis eventos y saltar a la acción que corresponde. Cubre REQ-003 RF 34, 35, AC 30, 31, 48, 49 (diseño 1l sin la columna de preferencias).
- **Viewports:**
  - **desktop** — listado en una columna centrada (8/12): sin la columna de preferencias, no hay nada que poner al lado.
  - **mobile** — listado a ancho completo. En mobile esta pantalla reemplaza al panel O-13: la campana navega acá.
- **Acceso:** con sesión (`RequireAuth`).

## Entrada y salida

**Entradas:**
- O-13 · "Ver todas las notificaciones". Campana del header en mobile. Menú de usuario · "Notificaciones".

**Salidas user-driven:**
- A S-04 o S-05 · tocar una notificación o su acción.
- "← Volver" · vuelve a la pantalla anterior.

**Salidas automáticas:**
- A S-07 sin sesión.

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | header | header | — | layout | ambos | — | AppHeader con la campana |
| 2 | Volver | link | — | navigation | ambos | — | ← Volver |
| 3 | Eyebrow no leídas | label | — | content | ambos | — | "N SIN LEER" / "ESTÁS AL DÍA" |
| 4 | Título | heading | h1 | content | ambos | — | "Notificaciones" |
| 5 | Bajada | paragraph | body | content | ambos | — | Qué hay y cuánto se guarda |
| 6 | Botón marcar todo | button | secondary | input | ambos | hidden_in_states: empty, loading · state_overrides: sin no leídas→disabled | Marcar todo como leído |
| 7 | Lista de notificaciones | list | — | content | ambos | hidden_in_states: empty, error de sistema / sin conexión | NotificationItem × N |
| 8 | Botón cargar más | button | secondary | input | ambos | hidden_in_states: empty, error de sistema / sin conexión · oculto si no hay más | Paginación por cursor |
| 9 | Sin notificaciones | empty-state | — | feedback | ambos | visible_only_in_states: empty | No hay avisos |
| 10 | Error de carga | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Falla |
| 11 | footer | footer | — | layout | ambos | — | Pie |

## Layout por viewport

### desktop · 1200px
- row `cabecera`
  - col 2/12: Volver
  - col 6/12: Eyebrow no leídas, Título, Bajada
  - col 2/12: Botón marcar todo
  - col 2/12: (vacío)
- row `lista`
  - col 2/12: (vacío)
  - col 8/12: Lista de notificaciones, Botón cargar más, Sin notificaciones, Error de carga
  - col 2/12: (vacío)

### mobile · 400px
- Volver
- Eyebrow no leídas
- Título
- Bajada
- Botón marcar todo
- Lista de notificaciones
- Botón cargar más
- Sin notificaciones
- Error de carga

## Contenido

### header
- Texto/label: "TELESCOPIO | Inicio · Eventos · Cómo funciona | campana {n} · menú de usuario"

### Volver
- Texto/label: "← Volver"

### Eyebrow no leídas
- Texto/label: "{n} SIN LEER" · sin no leídas: "ESTÁS AL DÍA"

### Título
- Texto/label: "Notificaciones"

### Bajada
- Texto/label: "Todo lo que pasa en los eventos donde participás u organizás. Se guardan durante 90 días."

### Botón marcar todo
- Texto/label: "Marcar todo como leído"

### Lista de notificaciones
- Texto/label: cada ítem: ícono por tipo · título · cuerpo · etiqueta de tipo ("Votación", "Resultados", "Inscripción", "Mis eventos") · tiempo relativo · acción. Textos por tipo:
  - stage_changed → participación: "«{evento}» abrió la inscripción" · "Ya podés inscribirte y subir tu propuesta." · "Ver evento"
  - stage_changed → votación (con asignación): "Ya podés votar en «{evento}»" · "Te asignamos {m} propuestas para ordenar. Tenés tiempo hasta el {fecha}." · "Ir a votar"
  - stage_changed → votación (sin propuesta): "Empezó la votación en «{evento}»" · "No participás porque no subiste una propuesta." · "Ver evento"
  - stage_changed → resultados: "Se publicaron los resultados de «{evento}»" · "Quedaste en el puesto {X} de {Y}." · "Ver ranking"
  - event_cancelled: "Se canceló «{evento}»" · "El organizador canceló el evento." · "Ver evento"
  - participant_registered: "{n} personas se inscribieron en «{evento}»" (1: "1 persona se inscribió…") · "Van {inscriptos} de {cupo}." · "Ver inscriptos"
  - registration_confirmed: "Te inscribiste en «{evento}»" · "Ya podés subir tu propuesta." · "Subir archivo"
  - ranking_submitted: "Enviaste tu ranking en «{evento}»" · "Lo podés modificar hasta que cierre la votación." · "Ver mi ranking"
  - file_reminder: "Falta tu archivo en «{evento}»" · "La inscripción cierra el {fecha}." · "Subir archivo"
  - vote_reminder: "Falta tu ranking en «{evento}»" · "La votación cierra el {fecha}." · "Ir a votar"
- Annotation: de la más reciente a la más antigua, sin filtros ni grupos (AC 31). No leídas con punto y en negrita. La acción es primaria si todavía requiere hacer algo, de contorno si no. El nombre del evento es el vigente (DA-2).

### Botón cargar más
- Texto/label: "Cargar más"

### Sin notificaciones
- Texto/label: "No tenés notificaciones. Te avisamos acá cuando pase algo en tus eventos."
- Icono: bell

### Error de carga
- Texto/label: "No pudimos cargar tus notificaciones." · acción "Reintentar"

### footer
- Texto/label: "Telescopio · evaluación distribuida entre pares"

## Estados

### default
- Aplica: Sí
- Mensaje: —
- Cambios: ninguno.

### empty
- Aplica: Sí
- Mensaje: "No tenés notificaciones. Te avisamos acá cuando pase algo en tus eventos."
- Cambios: Lista, Botón cargar más y Botón marcar todo ocultos; Sin notificaciones visible; Eyebrow "ESTÁS AL DÍA".

### loading
- Aplica: Sí
- Mensaje: "Cargando notificaciones…"
- Cambios: Lista como skeleton de 5 ítems. "Cargar más" muestra "Cargando…".

### error de validación
- Aplica: No.

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos cargar tus notificaciones."
- Cambios: Error de carga visible con "Reintentar". Si falla "Marcar todo como leído": "No pudimos marcar las notificaciones. Probá de nuevo." y los ítems quedan como estaban.

### success
- Aplica: Sí — "Marcar todo como leído": todos los ítems pasan a leídos, el contador de la campana a 0 y Eyebrow a "ESTÁS AL DÍA".

### not found
- Aplica: No.

### estado terminal / readonly
- Aplica: No.

## Interacciones

**Eventos:**
- Ítem o su acción · on click → marca leída (contador −1) y navega según el tipo: votar / subir archivo / ver evento / ver ranking → `/events/{id}`; ver inscriptos → `/events/{id}/manage`.
- Botón marcar todo · on click → marca todas como leídas.
- Botón cargar más · on click → pide la página siguiente (`before`).

**Validaciones:** ninguna.

**Feedback:** el ítem cambia de no leído a leído antes de navegar; el contador de la campana se actualiza.

## Accesibilidad

- **Orden de foco:** header → Volver → Botón marcar todo → ítems de la lista (la acción de cada uno) → Botón cargar más.
- **Landmarks y jerarquía:** header / main / footer. h1 = Título.
- **Foco y teclado:** al cargar más, el foco va al primer ítem nuevo.
- **Propio de esta composición:** cada ítem no leído expone "No leída" como texto para lectores de pantalla (no solo el punto); el cambio de contador se anuncia.

## Decisiones y descartes

**Decisiones tomadas:**
- Nueva por REQ-003 (1l, RF 35): listado único, sin filtros ni grupos por día (AC 31).
- Columna central en desktop: sin preferencias de email no hay contenido lateral; estirar la lista a 1200px empeoraba la lectura.
- En mobile reemplaza al panel O-13: un popover a 400px es esta misma pantalla más apretada.
- Retención de 90 días dicha en la bajada (AC 49).
- Textos compuestos en el front a partir de `type` + `data` (DA-2), en el idioma elegido.

**Alternativas descartadas:**
- Preferencias de email por tipo y recordatorio 24 h (columna lateral de 1l): fuera de alcance.
- Filtros por tipo y grupos HOY / AYER del prototipo: el REQ pide un único listado.

**Preguntas abiertas:**
- Pausa y cambio de cierre también mandan email pero no generan notificación (REQ-003, punto abierto 1).
