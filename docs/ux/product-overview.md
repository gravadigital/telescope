---
document: Product Overview
version: "1.0"
date: 2026-09-18
status: Draft - Transcripto desde el código existente
---

# Product Overview — Telescopio

> Documento raíz del set de UX. Define audiencias, superficies y la relación
> entre ellas. Todos los demás artefactos UX referencian acá.

> **Este set de UX es brownfield.** Las superficies, las pantallas, los viewports y los tokens
> **salen del código que ya está desplegado** (relevado en `docs/analysis/ux/web/`), no
> de un diseño. Las audiencias y sus objetivos **no**: el código no los declara, así que se
> infirieron del PRD y se confirmaron con el responsable del producto el 2026-09-18.
>
> Lo que falta en la interfaz actual está en [`gaps-as-is.md`](./gaps-as-is.md), no acá.

---

## Visión del Producto

Telescopio resuelve el cuello de botella de evaluar una convocatoria que recibe más propuestas de
las que un comité puede leer. En lugar de un comité, la evaluación se reparte entre los propios
participantes: cada uno evalúa un subconjunto de las propuestas ajenas, y de esos rankings
parciales se deriva un ranking global.

Eso abre dos problemas que el producto ataca explícitamente: que alguien evalúe su propia
propuesta (imposible por construcción, validado en dos capas) y que alguien evalúe mal por
desinterés o conveniencia (se mide cuánto se aparta cada evaluador del consenso, y eso ajusta la
posición de su propia propuesta — **evaluar bien conviene**).

El mecanismo **no está atado a ningún dominio**. Nace del problema de asignar tiempo de telescopio
—de ahí el nombre— pero sirve igual para un concurso fotográfico o cualquier convocatoria con
evaluación por pares. Eso tiene una consecuencia directa para UX: **el vocabulario de la interfaz
debe ser neutral** (`propuesta`, `evento`, `participante`), nunca del dominio astronómico.

---

## Superficies

| Superficie | Descripción | Plataforma | Viewports |
|---|---|---|---|
| **web** | Única interfaz del producto. Cubre el recorrido completo del participante y el del organizador | `web` | `desktop`, `mobile` |

### web

Es la única superficie: el producto tiene un solo frontend, una SPA de React servida como
estáticos.

**Plataforma:** `web` — React 19 con `react-scripts` (Create React App), renderizado íntegramente
en el navegador. Sin SSR. `[fuente: código-existente — package.json]`

**Viewports y su evidencia:**

| Viewport | Corte | Evidencia en el código |
|---|---|---|
| `desktop` | por encima de 768px | Es la regla base de todo el CSS: está escrito **desktop-first**, con todos los `@media` en `max-width` |
| `mobile` | 768px y abajo | 13 de las 24 media queries de ancho del proyecto |

**El corte estructural real es 768px**, y es el único. `[fuente: código-existente]`

El CSS contiene además reglas a 1024px (2 archivos), 600px (3) y 480px (6), pero son ajustes
puntuales de padding y tipografía, **no cambios de layout**. Las únicas excepciones con impacto
funcional están registradas como gaps: `EventTimeline` oculta descripciones y deadlines por debajo
de 600px.

**Ninguno de los cuatro valores está declarado como escala.** No hay variables CSS de breakpoint ni
archivo de configuración: cada `@media` repite el número literal. Los valores salen de contar las
queries. Esto quedó sembrado en
[`design-system/web/foundations/grid.md`](../design-system/web/foundations/grid.md),
que desde ahora es la fuente contra la que se implementa el responsive.

---

## Audiencias

Confirmadas con el responsable del producto el 2026-09-18. Se separan por JTBD, no por persona
(Regla 2 de la metodología).

| Audiencia | Descripción |
|---|---|
| **organizador** | Convoca y conduce el proceso: abre la convocatoria, decide cuándo cierra cada etapa, configura cómo se evalúa y publica un resultado que pueda defender |
| **participante** | Se presenta a una convocatoria y evalúa las ajenas: entiende de qué va el evento, entrega su propuesta a tiempo, cumple con la evaluación asignada y ve cómo quedó |

**La misma persona pertenece a las dos audiencias.** El rol es por evento (`event_participants.role`),
no por usuario: alguien organiza un evento y participa en otro. Se documentan separadas porque sus
JTBD no se parecen — uno conduce un proceso, el otro compite en él.

### Lo que NO es una audiencia

- **Visitante anónimo** — No tiene un JTBD propio: es el estado previo a registrarse. La landing,
  el listado público y el detalle del evento son el embudo de entrada del participante y se
  documentan dentro de esa audiencia.
- **Administrador global** — El rol `users.role = 'admin'` existe en el backend, saltea todas las
  verificaciones de permiso y **no tiene ninguna pantalla**. Está declarado como deuda a eliminar
  en [`goals-and-context.md`](../prd/goals-and-context.md), no como audiencia a atender.

---

## Matriz Audiencia ↔ Superficie

| Audiencia | Superficie | Para qué la usa | Pantallas principales |
|---|---|---|---|
| **organizador** | web | Crear el evento, controlar sus etapas, configurar la votación, ver quién entregó y quién evaluó, publicar resultados | `/events/create`, `/events/:eventId/manage` |
| **participante** | web | Descubrir eventos, registrarse, entregar su propuesta, evaluar las asignadas, ver el ranking | `/`, `/events`, `/events/:eventId`, `/reset-password` |

**Un detalle de arquitectura de información que conviene tener presente:** `/events/:eventId` es
**una URL con dos destinos según quién mire**. El wrapper hace un fetch del evento y, si el usuario
es el creador, redirige a `/manage`. El participante ve el detalle; el organizador nunca ve esa
pantalla. `[fuente: código-existente — App.tsx:70-119]`

---

## Glosario del Dominio

Términos del PRD. Son el vocabulario que la interfaz debe usar de forma consistente.

| Término | Definición |
|---|---|
| **Evento** | Una convocatoria. Tiene nombre, descripción, cupo y una etapa. Es la unidad alrededor de la cual gira todo el producto |
| **Etapa** | El momento del ciclo de vida del evento: `creation`, `participation`, `voting`, `results`. Avanza en un solo sentido, sin saltos ni retroceso |
| **Propuesta** | El archivo que un participante entrega a un evento. **Una sola por participante y por evento.** En el código se llama `attachment` |
| **Organizador / creador** | Quien creó el evento. Es el único que lo gestiona. En el código, `event_participants.role = 'creator'` |
| **Participante** | Quien se registró a un evento para presentar una propuesta y evaluar las ajenas |
| **Asignación** | El subconjunto de propuestas ajenas que le toca evaluar a un participante. Tiene exactamente `m` propuestas y **nunca incluye la propia** |
| **Ranking** | El orden de 1 a `m` que un evaluador le da a sus propuestas asignadas. **1 = mejor** |
| **Borrador** | Un ranking guardado a medio armar, para no perder el progreso al abandonar la pantalla |
| **MBC** (Modified Borda Count) | La fórmula que convierte los rankings individuales en un puntaje por propuesta, normalizado a `[0,1]` |
| **Ranking global (`G`)** | El orden de las propuestas por puntaje MBC |
| **Calidad del evaluador (`Q_i`)** | Cuánto se aparta un evaluador del consenso, en `[0,1]`. Quien no completó su asignación recibe 0 |
| **Ranking ajustado (`G'`)** | El ranking global tras aplicar los incentivos: la propuesta de un buen evaluador sube posiciones, la de uno malo baja |
| **Deadline estimado** | La fecha de fin prevista de una etapa. Solo puede posponerse, nunca adelantarse |

> ⚠️ **Término sin definir:** no está decidido cuál de los dos rankings (`G` o `G'`) es **el
> resultado oficial** del evento. La interfaz hoy muestra los dos sin declarar cuál manda. Es la
> pregunta abierta #1 del PRD y bloquea el diseño de la pantalla de resultados.

---

## Inconsistencias de Vocabulario en la Interfaz Actual

El glosario de arriba es el objetivo. La interfaz implementada **no lo cumple del todo**:

- La etapa `results` se muestra como **`Completed`** en el listado de eventos y como **`Results`**
  en todas las demás pantallas. `[fuente: código-existente — Events.tsx:66-74]`
- El microcopy está en **inglés**, con tres islas en español: las etiquetas de rol que el usuario
  lee (`Participante`, `Organizador`, `Administrador`), un `aria-label` y datos mock.

Ambas están registradas en [`gaps-as-is.md`](./gaps-as-is.md).
