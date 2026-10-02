---
name: home
surface: web
route: "/"
viewports: [desktop, mobile]
audiences: [participante, organizador]
fidelity: mid
status: diseñada
version: "2.0"
date: 2026-10-02
---

# Pantalla: Inicio (S-01)

## Identidad

- **Audiencia primaria (co-primary):**
  - [participante](../../../audiences/participante/research-context.md) — llega sin contexto y necesita entender qué es el producto y dónde participar.
  - [organizador](../../../audiences/organizador/research-context.md) — evalúa si puede armar su convocatoria acá.
- **JTBD / Propósito:** entender en segundos qué hace Telescopio y elegir entre explorar eventos abiertos o crear uno. Cubre REQ-003 RF 12 (propuesta de valor, 4 etapas, eventos abiertos, CTA crear).
- **Viewports:**
  - **desktop** — hero a dos columnas (mensaje + evento destacado) para que los dos caminos queden arriba del pliegue.
  - **mobile** — todo apilado; el evento destacado va después de los CTAs.
  - Tablet: se comporta como desktop por encima de 768px.

## Entrada y salida

**Entradas:**
- Desde fuera (URL directa, buscador).
- Desde cualquier pantalla · logo o "Inicio" del header.

**Salidas user-driven:**
- A S-02 Eventos · "Explorar eventos abiertos →" o "Ver todos los eventos →".
- A S-03 Crear evento · "Crear un evento" o "Crear mi primer evento" (sin sesión pasa por S-07).
- A S-04 Detalle · "Participar" en el evento destacado o "Ver y participar" en una tarjeta.
- A S-07 / S-08 · "Iniciar sesión" / "Crear cuenta" del header.

**Salidas automáticas:** ninguna.

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | header | header | — | layout | ambos | — | AppHeader: navegación, idioma, sesión |
| 2 | Eyebrow hero | label | — | content | ambos | — | Categoría del producto |
| 3 | Hero heading | heading | h1 | content | ambos | — | Propuesta de valor |
| 4 | Hero subtitle | paragraph | body | content | ambos | — | Cómo funciona en una frase |
| 5 | CTA explorar | button | primary | input | ambos | — | Camino del participante |
| 6 | CTA crear | button | secondary | input | ambos | — | Camino del organizador |
| 7 | Evento destacado | card | — | content | ambos | hidden_in_states: empty, error de sistema / sin conexión | Un evento con inscripción abierta real |
| 8 | Etapas del destacado | progress-bar | — | feedback | ambos | hidden_in_states: empty, error de sistema / sin conexión | StageTimeline compacta del destacado |
| 9 | Cupo del destacado | progress-bar | — | feedback | ambos | hidden_in_states: empty, error de sistema / sin conexión | Lugares ocupados |
| 10 | Botón participar destacado | button | primary | input | ambos | hidden_in_states: empty, error de sistema / sin conexión | Ir al detalle del destacado |
| 11 | Eyebrow cómo funciona | label | — | content | ambos | — | Ancla `#como-funciona` |
| 12 | Heading etapas | heading | h2 | content | ambos | — | Título de la sección |
| 13 | Etapa creación | card | — | content | ambos | — | Paso 01 |
| 14 | Etapa participación | card | — | content | ambos | — | Paso 02 |
| 15 | Etapa votación | card | — | content | ambos | — | Paso 03 |
| 16 | Etapa resultados | card | — | content | ambos | — | Paso 04 |
| 17 | Heading abiertos | heading | h2 | content | ambos | — | Título de la sección de eventos |
| 18 | Link ver todos | link | — | navigation | ambos | — | Ir a S-02 |
| 19 | Eventos abiertos | card-list | — | content | ambos | hidden_in_states: empty, error de sistema / sin conexión | Hasta 3 eventos con inscripción abierta |
| 20 | Sin eventos abiertos | empty-state | — | feedback | ambos | visible_only_in_states: empty | No hay inscripciones abiertas |
| 21 | Error eventos | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Falla la carga de eventos |
| 22 | Banner crear | card | — | content | ambos | — | CtaBanner para organizadores |
| 23 | CTA banner crear | button | primary | input | ambos | — | Crear mi primer evento |
| 24 | footer | footer | — | layout | ambos | — | Pie |

## Layout por viewport

### desktop · 1200px
- row `hero`
  - col 7/12: Eyebrow hero, Hero heading, Hero subtitle, CTA explorar, CTA crear
  - col 5/12: Evento destacado, Etapas del destacado, Cupo del destacado, Botón participar destacado
- Eyebrow cómo funciona
- Heading etapas
- row `etapas`
  - col 3/12: Etapa creación
  - col 3/12: Etapa participación
  - col 3/12: Etapa votación
  - col 3/12: Etapa resultados
- row `abiertos-titulo`
  - col 9/12: Heading abiertos
  - col 3/12: Link ver todos
- Eventos abiertos
- Sin eventos abiertos
- Error eventos
- row `banner`
  - col 9/12: Banner crear
  - col 3/12: CTA banner crear

### mobile · 400px
- Eyebrow hero
- Hero heading
- Hero subtitle
- CTA explorar
- CTA crear
- Evento destacado
- Etapas del destacado
- Cupo del destacado
- Botón participar destacado
- Eyebrow cómo funciona
- Heading etapas
- Etapa creación
- Etapa participación
- Etapa votación
- Etapa resultados
- Heading abiertos
- Eventos abiertos
- Sin eventos abiertos
- Error eventos
- Link ver todos
- Banner crear
- CTA banner crear

## Contenido

### header
- Texto/label: "TELESCOPIO | Inicio · Eventos · Cómo funciona | ES/EN · Iniciar sesión · Crear cuenta"
- Annotation: con sesión reemplaza los botones de sesión por la campana y el menú de usuario (ver product-map, Chrome global).

### Eyebrow hero
- Texto/label: "EVALUACIÓN ENTRE PARES · VOTACIÓN DISTRIBUIDA"

### Hero heading
- Texto/label: "Concursos donde la comunidad decide quién gana."

### Hero subtitle
- Texto/label: "Creá un evento, recibí propuestas y dejá que los propios participantes se evalúen entre sí. Resultados justos, sin jurado central."

### CTA explorar
- Texto/label: "Explorar eventos abiertos"
- Icono: arrow-right

### CTA crear
- Texto/label: "Crear un evento"

### Evento destacado
- Texto/label: "● Inscripción abierta · Cierra en {n} días" + nombre y descripción del evento
- Annotation: el evento con inscripción abierta y cierre más próximo. Si no hay ninguno, la tarjeta no se muestra (nunca datos inventados, REQ-001).

### Etapas del destacado
- Texto/label: "Creación · Participación · Votación · Resultados"
- Annotation: StageTimeline en versión compacta, con la etapa actual marcada.

### Cupo del destacado
- Texto/label: "{inscriptos} de {cupo} lugares ocupados"

### Botón participar destacado
- Texto/label: "Participar"

### Eyebrow cómo funciona
- Texto/label: "CÓMO FUNCIONA"

### Heading etapas
- Texto/label: "Cuatro etapas, siempre visibles"

### Etapa creación
- Texto/label: "01 · Creación — El organizador define el evento y su cupo."

### Etapa participación
- Texto/label: "02 · Participación — Te inscribís y subís tu propuesta antes del cierre."

### Etapa votación
- Texto/label: "03 · Votación — Cada participante evalúa y ordena propuestas de otros."

### Etapa resultados
- Texto/label: "04 · Resultados — Se publica el ranking final para todos."

### Heading abiertos
- Texto/label: "Abiertos ahora"

### Link ver todos
- Texto/label: "Ver todos los eventos"
- Icono: arrow-right

### Eventos abiertos
- Texto/label: tarjetas con "Inscripción abierta", "{n} lugares", nombre, descripción y "Ver y participar"
- Annotation: hasta 3 eventos en Participación, del cierre más próximo al más lejano.

### Sin eventos abiertos
- Texto/label: "Ahora no hay eventos con inscripción abierta." · acción "Ver todos los eventos"

### Error eventos
- Texto/label: "No pudimos cargar los eventos abiertos." · acción "Reintentar"

### Banner crear
- Texto/label: "¿Querés evaluar propuestas con tu comunidad? — Configurar un evento toma menos de 5 minutos."

### CTA banner crear
- Texto/label: "Crear mi primer evento"

### footer
- Texto/label: "Telescopio · evaluación distribuida entre pares"

## Estados

### default
- Aplica: Sí
- Mensaje: —
- Cambios: ninguno (estado base).

### empty
- Aplica: Sí
- Mensaje: "Ahora no hay eventos con inscripción abierta."
- Cambios:
  - Evento destacado, Etapas del destacado, Cupo del destacado, Botón participar destacado: ocultos.
  - Eventos abiertos: oculto. Sin eventos abiertos: visible.

### loading
- Aplica: Sí
- Mensaje: "Cargando eventos…"
- Cambios: Evento destacado y Eventos abiertos como skeleton; el resto del contenido es estático y se muestra.

### error de validación
- Aplica: No — la pantalla no tiene inputs.

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos cargar los eventos abiertos."
- Cambios: Error eventos visible con "Reintentar"; Evento destacado y Eventos abiertos ocultos.

### success
- Aplica: No — no hay acciones que confirmar.

### not found
- Aplica: No — no representa un recurso por ID.

### estado terminal / readonly
- Aplica: No.

## Interacciones

**Eventos:**
- CTA explorar · on click → navega a `/events?stage=participation`.
- CTA crear / CTA banner crear · on click → navega a `/events/create` (sin sesión: `/login?next=/events/create`).
- Botón participar destacado / tarjeta de Eventos abiertos · on click → navega a `/events/{id}`.
- Link ver todos · on click → navega a `/events`.
- "Cómo funciona" del header · on click → scroll a `#como-funciona`.

**Validaciones:** ninguna.

**Feedback:** "Reintentar" vuelve a pedir los eventos.

## Accesibilidad

- **Orden de foco:** header → CTA explorar → CTA crear → Botón participar destacado → Link ver todos → tarjetas de Eventos abiertos → CTA banner crear.
- **Landmarks y jerarquía:** header / main / footer. h1 = Hero heading; h2 = Heading etapas, Heading abiertos.
- **Foco y teclado:** sin overlays propios.
- **Propio de esta composición:** el ancla `#como-funciona` recibe foco al navegar desde el header para que lectores de pantalla anuncien la sección.

## Decisiones y descartes

**Decisiones tomadas:**
- Reescrita por REQ-003 sobre el diseño 1a: el placeholder WHY/HOW/DEMO no cubría ninguna capability.
- Dos caminos explícitos (explorar / crear): la landing atiende a las dos audiencias.
- Las 4 etapas se explican antes de entrar a un evento: es el modelo mental que usan todas las demás pantallas.
- Evento destacado real, nunca de ejemplo: REQ-001 prohíbe datos inventados; si no hay eventos abiertos se oculta.
- Hero a dos columnas en desktop: apilado dejaba el evento destacado fuera del primer pliegue.
- Microcopy en español; la versión en inglés vive en el catálogo i18n (REQ-003 DA-3).

**Alternativas descartadas:**
- "Ver demo" / "Ver demo guiada": fuera de alcance (REQ-003, agregados); no se muestran.
- Texto de etapa Creación "define reglas, fechas y cupo": las fechas y reglas se definen al avanzar de etapa (L-4); el copy se ajustó.

**Preguntas abiertas:**
- ¿Qué evento se destaca si hay varios con el mismo cierre? Se propone el de más inscriptos.
