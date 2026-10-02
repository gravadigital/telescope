---
name: my-events
surface: web
route: "/my-events"
viewports: [desktop, mobile]
audiences: [organizador, participante]
fidelity: mid
status: diseñada
version: "1.0"
date: 2026-10-02
---

# Pantalla: Mis eventos (S-11)

## Identidad

- **Audiencia primaria (co-primary):**
  - [organizador](../../../audiences/organizador/research-context.md) — vuelve a los eventos que conduce, incluidos los que están en Creación y nadie más ve.
  - [participante](../../../audiences/participante/research-context.md) — ve dónde está inscripto y qué le falta en cada uno.
- **JTBD / Propósito:** tener en un solo lugar todos mis eventos, separados por rol. Cubre REQ-003 RF 15, AC 10. No tiene diseño: se arma con la tabla de eventos de 1c (REQ-003, pantallas sin diseño).
- **Viewports:**
  - **desktop** — dos secciones apiladas, cada una con su tabla.
  - **mobile** — las tablas se apilan como en S-02.
- **Acceso:** con sesión (`RequireAuth`).

## Entrada y salida

**Entradas:**
- Menú de usuario · "Mis eventos". S-05 · "← Mis eventos". S-02 · "Ver todos en Mis eventos".

**Salidas user-driven:**
- A S-05 · "Gestionar" en un evento de "Organizo".
- A S-04 · acción de una fila de "Participo".
- A S-03 · "+ Crear evento". A S-02 · "Explorar eventos".

**Salidas automáticas:**
- A S-07 sin sesión.

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | header | header | — | layout | ambos | — | AppHeader |
| 2 | Título | heading | h1 | content | ambos | — | "Mis eventos" |
| 3 | Bajada | paragraph | body | content | ambos | — | Qué hay acá |
| 4 | Botón crear evento | button | primary | input | ambos | — | Ir a S-03 |
| 5 | Título organizo | heading | h2 | content | ambos | — | "Organizo · N" |
| 6 | Tabla organizo | table | — | content | ambos | hidden_in_states: empty, error de sistema / sin conexión · viewport_overrides: mobile→filas apiladas | Eventos propios |
| 7 | Sin eventos organizados | empty-state | — | feedback | ambos | visible_only_in_states: empty | No organiza ninguno |
| 8 | Título participo | heading | h2 | content | ambos | — | "Participo · N" |
| 9 | Tabla participo | table | — | content | ambos | hidden_in_states: empty, error de sistema / sin conexión · viewport_overrides: mobile→filas apiladas | Eventos en los que participa |
| 10 | Sin participaciones | empty-state | — | feedback | ambos | visible_only_in_states: empty | No participa en ninguno |
| 11 | Error de carga | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Falla |
| 12 | footer | footer | — | layout | ambos | — | Pie |

## Layout por viewport

### desktop · 1200px
- row `titulo`
  - col 9/12: Título, Bajada
  - col 3/12: Botón crear evento
- Error de carga
- Título organizo
- Tabla organizo
- Sin eventos organizados
- Título participo
- Tabla participo
- Sin participaciones

### mobile · 400px
- Título
- Bajada
- Botón crear evento
- Error de carga
- Título organizo
- Tabla organizo
- Sin eventos organizados
- Título participo
- Tabla participo
- Sin participaciones

## Contenido

### header
- Texto/label: "TELESCOPIO | Inicio · Eventos · Cómo funciona | campana · menú de usuario"

### Título
- Texto/label: "Mis eventos"

### Bajada
- Texto/label: "Los eventos que organizás y en los que participás, en un solo lugar."

### Botón crear evento
- Texto/label: "+ Crear evento"

### Título organizo
- Texto/label: "Organizo · {n}"

### Tabla organizo
- Texto/label: columnas "EVENTO · ETAPA · PARTICIPANTES · CIERRE" + acción "Gestionar"
- Annotation: incluye eventos en Creación con StatusPill "Borrador · no visible" (AC 10). Cierre = fecha de la etapa actual o "—".

### Sin eventos organizados
- Texto/label: "Todavía no organizaste ningún evento." · acción "Crear evento"

### Título participo
- Texto/label: "Participo · {n}"

### Tabla participo
- Texto/label: columnas "EVENTO · ETAPA · MI ESTADO · CIERRE" + acción según estado
- Annotation: Mi estado = "Falta tu archivo" / "Propuesta enviada" / "Te toca votar" / "Ranking enviado" / "No participás de la votación" / "Puesto {X} de {Y}". La acción sigue la tabla del product-map.

### Sin participaciones
- Texto/label: "Todavía no te inscribiste en ningún evento." · acción "Explorar eventos"

### Error de carga
- Texto/label: "No pudimos cargar tus eventos." · acción "Reintentar"

### footer
- Texto/label: "Telescopio · evaluación distribuida entre pares"

## Estados

### default
- Aplica: Sí
- Mensaje: —
- Cambios: ninguno.

### empty
- Aplica: Sí — por sección: cada tabla vacía se reemplaza por su estado vacío; la otra sección se muestra normal.
- Mensaje: "Todavía no organizaste ningún evento." / "Todavía no te inscribiste en ningún evento."
- Cambios: Tabla organizo → Sin eventos organizados; Tabla participo → Sin participaciones.

### loading
- Aplica: Sí
- Mensaje: "Cargando tus eventos…"
- Cambios: las dos tablas como skeleton de 3 filas.

### error de validación
- Aplica: No.

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos cargar tus eventos."
- Cambios: Error de carga visible con "Reintentar"; tablas ocultas (nunca vacías).

### success
- Aplica: No.

### not found
- Aplica: No.

### estado terminal / readonly
- Aplica: No.

## Interacciones

**Eventos:**
- Fila de Tabla organizo · "Gestionar" → `/events/{id}/manage`.
- Fila de Tabla participo · acción → `/events/{id}`.
- Botón crear evento · on click → `/events/create`.
- "Reintentar" · on click → vuelve a pedir los eventos.

**Validaciones:** ninguna.

**Feedback:** ninguno adicional.

## Accesibilidad

- **Orden de foco:** header → Botón crear evento → filas de Tabla organizo → filas de Tabla participo.
- **Landmarks y jerarquía:** header / main / footer. h1 = Título; h2 = Título organizo, Título participo.
- **Foco y teclado:** sin overlays.
- **Propio de esta composición:** cada tabla tiene como caption su h2.

## Decisiones y descartes

**Decisiones tomadas:**
- Nueva por REQ-003 (RF 15): reemplaza los tabs My Events / My Subscriptions de la v1.0 y es el destino de "← Mis eventos" (2a).
- Dos secciones por rol y no filtros: el rol es por evento (product-overview) y las acciones son distintas.
- "Organizo" primero: es la única forma de llegar a un evento propio en Creación (RF 14).
- Reutiliza la tabla de eventos de S-02 (DataTable) con columnas propias por sección: RF 5.

**Alternativas descartadas:**
- Filtros por etapa y búsqueda: el volumen por usuario es chico; S-02 ya los tiene.

**Preguntas abiertas:**
- ¿Ocultar los eventos finalizados hace más de N meses? Por ahora se muestran todos.
