---
name: events-list
surface: web
route: "/events"
viewports: [desktop, mobile]
audiences: [participante]
fidelity: mid
status: diseñada
version: "2.0"
date: 2026-10-02
---

# Pantalla: Eventos (S-02)

## Identidad

- **Audiencia primaria:** [participante](../../../audiences/participante/research-context.md) — con o sin sesión.
- **JTBD / Propósito:** ver primero lo que me toca hacer ("Tus pendientes") y después encontrar dónde participar o consultar resultados. Cubre REQ-003 RF 13 y 14 (diseños 1c con sesión, 1h sin sesión).
- **Viewports:**
  - **desktop** — tabla con columnas Evento / Etapa / Participantes / Creado / acción.
  - **mobile** — la tabla se apila: cada fila es una tarjeta con etiqueta por valor (AC 3). Los filtros se desplazan horizontalmente.

## Entrada y salida

**Entradas:**
- Header · "Eventos".
- S-01 · "Explorar eventos abiertos" / "Ver todos los eventos".
- S-04 · "← Eventos". S-13 · "Ir a Eventos".

**Salidas user-driven:**
- A S-04 · acción de fila ("Participar", "Subir archivo", "Votar", "Ver evento", "Ver resultados") o acción de una tarjeta de pendientes.
- A S-05 · "Gestionar" en un evento propio.
- A S-03 · "+ Crear evento" / "Crear un evento".
- A S-08 · "Crear cuenta gratis" (sin sesión).

**Salidas automáticas:** ninguna.

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | header | header | — | layout | ambos | — | AppHeader |
| 2 | Eyebrow visitante | label | — | content | ambos | visible_only_in_states: visitante | Cantidad de eventos públicos |
| 3 | Título | heading | h1 | content | ambos | — | "Eventos" |
| 4 | Bajada | paragraph | body | content | ambos | state_overrides: visitante→texto sin sesión | Qué se puede hacer acá |
| 5 | Botón crear evento | button | primary | input | ambos | — | Ir a S-03 |
| 6 | Título pendientes | heading | h2 | content | ambos | hidden_in_states: visitante | "Tus pendientes · N" |
| 7 | Tarjeta pendiente | card | — | content | ambos | hidden_in_states: visitante | PendingCard: tarea + evento + cierre + acción |
| 8 | Cómo participar | list | — | content | ambos | visible_only_in_states: visitante | Franja de 4 pasos |
| 9 | Filtros de etapa | tabs | — | navigation | ambos | — | FilterTabs con conteo |
| 10 | Búsqueda | search-bar | default | input | ambos | — | Por nombre u organizador |
| 11 | Tabla de eventos | table | — | content | ambos | hidden_in_states: empty, error de sistema / sin conexión · viewport_overrides: mobile→filas apiladas | DataTable |
| 12 | Sin resultados | empty-state | — | feedback | ambos | visible_only_in_states: empty | Filtro o búsqueda sin coincidencias |
| 13 | Error de carga | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Falla el listado |
| 14 | Paginación | pagination | — | navigation | ambos | hidden_in_states: empty, loading, error de sistema / sin conexión | Páginas del listado |
| 15 | Banner cuenta | card | — | content | ambos | visible_only_in_states: visitante | CtaBanner de registro |
| 16 | CTA crear cuenta | button | primary | input | ambos | visible_only_in_states: visitante | Ir a S-08 |
| 17 | footer | footer | — | layout | ambos | — | Pie |

## Layout por viewport

### desktop · 1200px
- Eyebrow visitante
- row `titulo`
  - col 9/12: Título, Bajada
  - col 3/12: Botón crear evento
- Título pendientes
- row `pendientes`
  - col 6/12: Tarjeta pendiente
  - col 6/12: Tarjeta pendiente
- Cómo participar
- row `filtros`
  - col 8/12: Filtros de etapa
  - col 4/12: Búsqueda
- Tabla de eventos
- Sin resultados
- Error de carga
- Paginación
- row `banner`
  - col 9/12: Banner cuenta
  - col 3/12: CTA crear cuenta

### mobile · 400px
- Eyebrow visitante
- Título
- Bajada
- Botón crear evento
- Título pendientes
- Tarjeta pendiente
- Tarjeta pendiente
- Cómo participar
- Búsqueda
- Filtros de etapa
- Tabla de eventos
- Sin resultados
- Error de carga
- Paginación
- Banner cuenta
- CTA crear cuenta

## Contenido

### header
- Texto/label: "TELESCOPIO | Inicio · Eventos · Cómo funciona | campana · menú de usuario" (sin sesión: "ES/EN · Iniciar sesión · Crear cuenta")

### Eyebrow visitante
- Texto/label: "EXPLORAR · {n} EVENTOS PÚBLICOS"

### Título
- Texto/label: "Eventos"

### Bajada
- Texto/label: con sesión "Encontrá dónde participar o seguí los eventos que ya te involucran." · sin sesión "Mirá qué se está evaluando y consultá los resultados publicados. Para participar o crear tu propio evento necesitás una cuenta gratuita."

### Botón crear evento
- Texto/label: con sesión "+ Crear evento" · sin sesión "Crear un evento"
- Icono: plus

### Título pendientes
- Texto/label: "TUS PENDIENTES · {n}"

### Tarjeta pendiente
- Texto/label: tres tipos:
  - "Falta subir tu archivo" · nombre del evento · "Cierra el {fecha}" · acción "Subir archivo"
  - "Te toca votar" · nombre del evento · "Cierra el {fecha}" · acción "Votar"
  - "Resultados publicados" · nombre del evento · "Quedaste en el puesto {X} de {Y}" · acción "Ver ranking"
- Annotation: sale de `my_status` de `GET /users/{id}/events`; el puesto es el del ranking ajustado (FG-5 sigue abierto).

### Cómo participar
- Texto/label: "Cómo participar — 1 Elegí un evento con inscripción abierta · 2 Creá tu cuenta e inscribite · 3 Subí tu propuesta · 4 Votá a otros participantes"

### Filtros de etapa
- Texto/label: "Todos · {n} | Inscripción abierta · {n} | En votación · {n} | Finalizados · {n}"
- Annotation: los conteos salen de `stage_counts` sobre el conjunto filtrado por la búsqueda. No existe filtro de Creación.

### Búsqueda
- Texto/label: placeholder "Buscar por nombre u organizador"
- Icono: search
- Annotation: filtra con debounce mientras se escribe; no hay botón "Buscar".

### Tabla de eventos
- Texto/label: columnas "EVENTO" (nombre + descripción corta) · "ETAPA" (StatusPill) · "PARTICIPANTES" (barra de cupo + "{n} / {cupo}") · "CREADO" · acción
- Annotation: una sola acción por fila según rol y etapa (tabla en product-map). Sin sesión, "Participar" muestra debajo "Requiere cuenta"; "Ver resultados" muestra "Público". En mobile cada fila se apila con la etiqueta de cada valor.

### Sin resultados
- Texto/label: "No hay eventos que coincidan con tu búsqueda." · acción "Limpiar filtros"

### Error de carga
- Texto/label: "No pudimos cargar los eventos." · acción "Reintentar"

### Paginación
- Texto/label: "Anterior · {página} de {total} · Siguiente"

### Banner cuenta
- Texto/label: "¿Querés que tu comunidad evalúe propuestas? — Creá una cuenta gratis y armá tu evento en menos de 5 minutos."

### CTA crear cuenta
- Texto/label: "Crear cuenta gratis"

### footer
- Texto/label: "Telescopio · evaluación distribuida entre pares"

## Estados

### default
- Aplica: Sí
- Mensaje: —
- Cambios: ninguno.

### empty
- Aplica: Sí
- Mensaje: "No hay eventos que coincidan con tu búsqueda."
- Cambios: Tabla de eventos y Paginación ocultas; Sin resultados visible. Si no hay ningún evento público y no hay búsqueda, el texto pasa a "Todavía no hay eventos públicos." con la acción "Crear un evento".

### loading
- Aplica: Sí
- Mensaje: "Cargando eventos…"
- Cambios: Tabla de eventos como skeleton de 5 filas; conteos de Filtros de etapa como skeleton; Tarjeta pendiente como skeleton.

### error de validación
- Aplica: No — la búsqueda no tiene reglas de validación.

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos cargar los eventos."
- Cambios: Error de carga visible con "Reintentar"; Tabla de eventos y Paginación ocultas. Si fallan solo los pendientes, el error se muestra en ese bloque ("No pudimos cargar tus pendientes." + "Reintentar") y la tabla sigue visible.

### visitante (sin sesión)
- parent_state: default
- Aplica: Sí
- Mensaje: —
- Cambios:
  - Eyebrow visitante, Cómo participar, Banner cuenta, CTA crear cuenta: visibles.
  - Título pendientes, Tarjeta pendiente: ocultos.
  - Bajada: content = texto sin sesión. Botón crear evento: content="Crear un evento", variant=secondary.
  - header: "Iniciar sesión · Crear cuenta" en lugar de campana y menú.

### success
- Aplica: No.

### not found
- Aplica: No.

### estado terminal / readonly
- Aplica: No.

## Interacciones

**Eventos:**
- Filtros de etapa · on click → filtra la tabla y actualiza la URL (`?stage=`).
- Búsqueda · on input (debounce 300 ms) → filtra y actualiza conteos (`?q=`).
- Acción de fila / Tarjeta pendiente · on click → navega a `/events/{id}` (o `/events/{id}/manage` si es "Gestionar").
- Botón crear evento · on click → `/events/create` (sin sesión: `/login?next=/events/create`).
- CTA crear cuenta · on click → `/register`.
- "Limpiar filtros" · on click → vuelve a "Todos" sin búsqueda.

**Validaciones:** ninguna.

**Feedback:** la tabla se actualiza en el lugar; sin botón "Refresh" (el listado se vuelve a pedir al volver a la pantalla).

## Accesibilidad

- **Orden de foco:** header → Botón crear evento → Tarjetas pendientes → Filtros de etapa → Búsqueda → filas de la tabla → Paginación → CTA crear cuenta.
- **Landmarks y jerarquía:** header / main / footer. h1 = Título; h2 = Título pendientes, "Cómo participar".
- **Foco y teclado:** Filtros de etapa se recorren con flechas (patrón tablist).
- **Propio de esta composición:** el cambio de resultados al filtrar o buscar se anuncia en una región live ("{n} eventos").

## Decisiones y descartes

**Decisiones tomadas:**
- Reescrita por REQ-003 sobre 1c y 1h: una sola pantalla con variantes por sesión, no dos pantallas.
- "Tus pendientes" antes de la lista: lo que el usuario tiene que hacer importa más que explorar (RF 13).
- Filtros por etapa con conteo + búsqueda reemplazan los tabs All / My / Subscriptions; los eventos propios pasan a S-11 (REQ-003 clarificaciones).
- Una sola acción por fila: mantiene el mecanismo de orientación de la v1.0 con textos en español.
- En mobile la búsqueda va antes de los filtros: es la herramienta más directa a 400px.
- Eventos en Creación nunca aparecen (RF 14).

**Alternativas descartadas:**
- Botón "Refresh": se elimina (diseño 1c).
- "Ver demo" en la franja Cómo participar: fuera de alcance.
- Filtro de Creación: esos eventos no son públicos.

**Preguntas abiertas:**
- ¿Cuántas tarjetas de pendientes mostrar antes de colapsar? Se propone 4 y "Ver todos en Mis eventos".
