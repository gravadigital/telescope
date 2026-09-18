---
created: 2026-09-18
last_updated: 2026-09-18
status: Pending Formalization
---

# Feature Groups

## Overview

Este documento contiene los feature groups del producto **Telescopio**.

> **Este producto no es greenfield.** El template de feature groups asume que el Feature Group 1
> es el *walking skeleton* (infraestructura + funcionalidad mínima). Acá eso **ya existe y está
> desplegado**: los dos servicios funcionan, el algoritmo de votación está implementado y un
> evento puede recorrerse de punta a punta.
>
> Por lo tanto estos feature groups **no reimplementan lo construido**: ordenan el trabajo
> pendiente. Cada uno agrupa capacidades de [`requirements.md`](./requirements.md) que hay que
> **corregir, completar o construir**, y declara explícitamente qué parte ya está hecha.
>
> **El orden es por riesgo, no por valor.** FG-1 y FG-2 no agregan funcionalidad: sacan del
> sistema comportamientos que hoy producen decisiones equivocadas o exponen datos. Poner un
> feature nuevo antes que eso sería construir sobre una base que miente.

**Proceso para formalizar cada feature group:**
1. `/product-new-request` — Capturar el requerimiento y clarificar alcance
2. `/product-design-request REQ-XXX` — Diseñar la solución técnica y proponer el story split
3. `/product-create-stories REQ-XXX` — Crear las stories implementables

**Status actual:** 7 feature groups pendientes de formalización.

---

## Feature Group 1: Integridad de lo que el usuario ve

**Status:** Pending
**Prioridad sugerida:** **Crítica — antes que cualquier otra cosa**
**Esfuerzo estimado:** Bajo (días)
**Servicios afectados:** `web`

**Descripción:**

Hoy el sistema muestra datos inventados con la misma apariencia que los datos reales, y presenta
fallos de infraestructura como si fueran hechos del negocio. Son tres lugares distintos con la
misma raíz: un `catch` que, en vez de informar el error, fabrica contenido plausible.

Este feature group elimina los tres fallbacks falsos y los reemplaza por estados de error
visibles. No agrega ninguna funcionalidad: **quita** comportamiento.

**¿Por qué es importante?**

- **El organizador toma decisiones irreversibles sobre estos datos.** Si la API de participantes
  cae, `ManageEventPage` dice `No participants have registered yet.` — y el organizador puede
  avanzar de etapa o cancelar el evento creyendo que nadie se anotó. El fallo de red se le
  presenta como un hecho del negocio.
- **El fallback demo del login anula la validación del formulario.** Enviar con el email vacío no
  muestra el error: deja al usuario logueado con un token `demo-token-{ts}` y email vacío. Es un
  bypass de autenticación por accidente.
- **`Participants` muestra tres personas que no existen** (`María González`, `Carlos Rodríguez`,
  `Ana López`) junto al mensaje de error, con el mismo aspecto que las reales.

Es el único feature group cuyo valor es **negativo en funcionalidad y positivo en confianza**. Va
primero porque todo lo demás se apoya en que lo que la pantalla dice sea cierto.

**Capacidades que corrige:**
- C-02: Iniciar sesión (corrige D-01)
- C-20: Listar participantes del evento (corrige D-08)
- C-21: Listar propuestas del evento (corrige D-08)
- C-34: Ver estadísticas de votación (corrige D-08)
- NFR-R: Degradación visible ante fallo parcial

**Precondiciones:**
- Ninguna. Es trabajo aislado en el frontend, sin cambios de API ni de esquema.

**Postcondiciones:**
- Ningún `catch` de la aplicación fabrica datos de dominio.
- Las validaciones de formulario del login son alcanzables y se muestran.
- Las tres cargas secundarias de `ManageEventPage` distinguen "sin datos" de "no se pudo cargar".
- El health check de `Auth` refleja el estado real de la API (corrige D-14).

**Valor entregado:**
El organizador puede confiar en que lo que ve en pantalla ocurrió de verdad. Un usuario que se
equivoca al escribir su email ve el error en lugar de entrar como usuario fantasma.

---

## Feature Group 2: Cierre de brechas de autorización

**Status:** Pending
**Prioridad sugerida:** **Crítica**
**Esfuerzo estimado:** Medio (~1 semana)
**Servicios afectados:** `api`, `web`

**Descripción:**

Tres agujeros de control de acceso, más la eliminación del rol global que los amplifica.

El endpoint de descarga de propuestas está registrado **fuera** del grupo que aplica
`JWTAuthMiddleware`: cualquiera con el UUID descarga el archivo. La lectura de usuarios no
verifica ownership: cualquier autenticado lee los datos de cualquier otro. Y el `JWT_SECRET`
tiene un default hardcodeado, así que un despliegue sin esa variable arranca con un secreto
conocido y solo emite un warning.

Incluye además el retiro del rol global `users.role`, decidido en
[goals-and-context](./goals-and-context.md): hoy `admin` saltea **todas** las verificaciones de
permiso sobre **cualquier** evento, y es alcanzable solo escribiendo en la base. No es una
funcionalidad que nadie use: es un superusuario latente.

**¿Por qué es importante?**

Las propuestas son el activo del producto. En una convocatoria competitiva, que un participante
pueda descargar la propuesta de otro antes de la evaluación **invalida el proceso entero** — y
el conflicto de interés, que el sistema protege con dos capas de validación, se vuelve irrelevante
si el contenido se puede leer por fuera.

**Capacidades que corrige:**
- C-23: Descargar una propuesta (corrige D-02)
- C-09: Consultar un usuario (corrige D-03)
- NFR-S-01: JWT (corrige D-12)
- NFR-S-03: Autorización por middlewares (retiro del bypass de `admin`)

**Precondiciones:**
- Decidir si la descarga de propuestas se expone en la interfaz o se elimina (pregunta abierta #5).
- Verificar si retirar `users.role` requiere migración de datos (pregunta abierta #2).

**Postcondiciones:**
- Todos los endpoints que devuelven datos de propuestas o de usuarios exigen JWT y verifican
  autorización.
- El servicio **no arranca** sin `JWT_SECRET` explícito, en vez de usar un default.
- La columna `users.role` y los middlewares que la leen quedan retirados; el único modelo de roles
  es el de `event_participants`.

**Valor entregado:**
La confidencialidad de las propuestas queda garantizada por el sistema y no por la dificultad de
adivinar un UUID.

---

## Feature Group 3: Consistencia del ciclo de vida del evento

**Status:** Pending
**Prioridad sugerida:** Alta
**Esfuerzo estimado:** Medio (~1 semana)
**Servicios afectados:** `api`, `web`

**Descripción:**

La misma acción se comporta distinto según desde dónde se ejecute, y hay un dato de negocio que
el usuario nunca ve ni elige.

Avanzar de etapa desde `ManageEventPage` valida que haya participantes y que todos hayan votado;
el mismo avance desde `EventDetailPage` **no valida nada**. La regla "solo se puede posponer un
deadline" se anuncia en la interfaz pero solo la aplica el backend. Y la fecha del evento se
autogenera como hoy+1día sin campo en el formulario: el organizador no sabe que su evento tiene
fecha, ni cuál es.

Este feature group unifica las reglas en un solo lugar y expone al usuario los datos que hoy se
deciden por él.

**¿Por qué es importante?**

Un organizador que avanza de etapa desde la pantalla "equivocada" saltea validaciones que existen
para proteger el proceso — puede abrir la votación sin propuestas suficientes, o cerrarla con
evaluaciones pendientes, y eso **degrada la calidad del ranking** (quien no completó recibe
`Q_i = 0` y su propuesta baja `n` posiciones: un cierre prematuro penaliza a gente que aún tenía
plazo).

**Capacidades que corrige:**
- C-10: Crear evento (corrige D-04 — exponer la fecha)
- C-13: Avanzar de etapa (corrige D-05 — unificar validaciones)
- C-14: Posponer deadline (corrige D-06 — validar en cliente)
- C-17: Compartir el evento (corrige D-07 — feedback ante fallo del portapapeles)

**Precondiciones:**
- FG-1 completo (las validaciones de avance dependen de contar participantes reales, no
  fabricados).

**Postcondiciones:**
- Las reglas de avance de etapa viven en un único lugar y aplican desde cualquier pantalla.
- El formulario de creación tiene campo de fecha, o la fecha deja de existir como concepto si se
  decide que no aporta.
- La regla de posponer se valida en cliente y backend con el mismo criterio.

**Valor entregado:**
El organizador obtiene el mismo comportamiento sin importar por dónde navegue, y controla los
datos de su propio evento.

---

## Feature Group 4: Responsive y accesibilidad de la interfaz

**Status:** Pending
**Prioridad sugerida:** Alta
**Esfuerzo estimado:** Alto (semanas)
**Servicios afectados:** `web`

**Descripción:**

Que la interfaz sea responsive es un requisito confirmado del producto, y hoy se cumple a medias.
Por debajo de 600px **desaparecen las fechas límite** del `EventTimeline`, y la única otra forma
de verlas es una pantalla exclusiva del organizador: para un participante en teléfono, el deadline
es invisible. La tabla de participantes se apila en mobile activando etiquetas
`content: attr(data-label)` que el JSX nunca setea, así que los cuatro valores quedan
indistinguibles.

La accesibilidad está en un estado peor y **sin objetivo declarado**: ningún overlay tiene
`role="dialog"`, gestión de foco ni cierre por Escape; las tablas son `<div>` en grid sin roles
ARIA; los tabs no tienen semántica; los banners de error no se anuncian; y varios emojis portan
significado sin alternativa textual.

**¿Por qué es importante?**

Un participante que no ve el deadline se pierde la convocatoria. No es un problema estético: es
pérdida de participación, que es exactamente lo que el producto existe para maximizar.

**Capacidades que corrige:**
- NFR-U-01: Responsive (corrige los gaps E y F de `gaps-as-is.md`)
- NFR-U: Accesibilidad (requiere **definir primero un objetivo WCAG**, que hoy no existe)
- Transversal a todas las pantallas de `docs/ux/surfaces/web/screens/`

**Precondiciones:**
- **Definir el objetivo de accesibilidad** (¿WCAG 2.1 AA?). Sin eso, este feature group no tiene
  criterio de aceptación y no se puede cerrar.
- El Design System sembrado en `docs/design-system/web/` como referencia de
  breakpoints reales.

**Postcondiciones:**
- Ningún dato crítico (deadlines, estado, acciones) desaparece en ningún viewport.
- La tabla de participantes es legible en mobile.
- Los overlays cumplen el patrón de diálogo accesible.

**Valor entregado:**
Un participante puede completar todo su recorrido —registrarse, subir, evaluar, ver resultados—
desde el teléfono, que es donde va a leer el email que le avisa del cambio de etapa.

---

## Feature Group 5: Definición y publicación del resultado oficial

**Status:** **Blocked** — requiere decisión de producto
**Prioridad sugerida:** Alta
**Esfuerzo estimado:** Bajo si la decisión ya está tomada; el trabajo es chico, la decisión es grande
**Servicios afectados:** `api`, `web`

**Descripción:**

El sistema calcula y persiste **dos rankings**: el global `G` (Modified Borda Count puro) y el
ajustado `G'` (tras aplicar los incentivos por calidad del evaluador). **No está definido cuál es
el oficial**, y la interfaz no lo declara.

Este feature group toma esa decisión y la hace explícita en el producto: qué ranking se publica,
cómo se comunica al participante, y qué se muestra del otro.

**¿Por qué es importante?**

Es la pregunta abierta más importante del PRD, y no es una cuestión de presentación:

- **Si el oficial es `G'`**, el sistema de incentivos funciona: evaluar bien mejora tu posición, y
  hay que explicárselo al participante **antes** de que evalúe, o el incentivo no incentiva nada.
- **Si el oficial es `G`**, entonces C-32 y C-33 —la medición de calidad y todo el sistema de
  incentivos— **no tienen ningún efecto sobre el resultado**. Son una porción sustancial del
  código y del valor diferencial del producto, calculándose para nada.

No se puede diseñar la pantalla de resultados sin resolver esto, y tampoco se puede explicar el
producto.

**Capacidades que define:**
- C-35: Ver resultados del evento
- C-33: Aplicar incentivos (define si tiene efecto real)
- C-32: Calcular calidad de evaluadores (define si se muestra al participante)

**Precondiciones:**
- **Decisión de producto pendiente** (pregunta abierta #1). Este feature group no puede
  formalizarse sin ella.

**Postcondiciones:**
- El ranking oficial está declarado en el PRD y es el que muestra la interfaz.
- El participante entiende, antes de evaluar, cómo su evaluación afecta su propio resultado.

**Valor entregado:**
El participante sabe cuál es su posición final y por qué. El organizador puede defender el
resultado ante quien lo cuestione.

---

## Feature Group 6: Robustez del motor de votación

**Status:** Pending
**Prioridad sugerida:** Media
**Esfuerzo estimado:** Medio (~1 semana)
**Servicios afectados:** `api`, `web`

**Descripción:**

El algoritmo funciona, pero tiene tres asperezas que aparecen en los bordes.

La fórmula del `m` recomendado está implementada **dos veces**, en TypeScript para sugerir y en Go
para validar: si divergen, el organizador ve un recomendado que el backend rechaza. Una propuesta
puede quedar **por debajo de `min_evaluations_per_file`** sin que nadie se entere, porque la fase 1
de asignación respetael tope `m` por participante y saltea a quien ya llegó. Y
`GET /distributed-results` **recalcula y escribe** en cada llamada: un GET con efectos.

Incluye también la limpieza de las columnas huérfanas de `voting_configurations` y
`voting_results`, que existen en la base con CHECK constraints que pasan trivialmente porque
nadie las escribe.

**¿Por qué es importante?**

La cobertura mínima es una garantía de calidad del ranking: si una propuesta recibe menos
evaluaciones que el mínimo configurado, su score MBC es menos confiable que el del resto, y nadie
lo sabe. El organizador configuró un mínimo justamente para evitar eso.

**Capacidades que corrige:**
- C-25: Configurar parámetros de votación (corrige D-09 — fuente única de la fórmula)
- C-26: Generar asignaciones (corrige D-10 — avisar cuando la cobertura no se alcanza)
- C-31: Calcular resultados (corrige D-11 — separar cálculo de lectura)

**Precondiciones:**
- FG-5 resuelto, porque cambiar cómo se calculan o persisten los resultados depende de cuál es el
  oficial.

**Postcondiciones:**
- La fórmula del recomendado tiene una sola implementación.
- Generar asignaciones informa al organizador si alguna propuesta queda bajo el mínimo, antes de
  confirmar.
- La lectura de resultados no muta estado.
- Las columnas huérfanas están eliminadas o conectadas.

**Valor entregado:**
El organizador sabe si la configuración que eligió produce una evaluación con la cobertura que
pidió, antes de largar la votación.

---

## Feature Group 7: Completar la interfaz pública

**Status:** Pending
**Prioridad sugerida:** Media
**Esfuerzo estimado:** Medio (~1 semana)
**Servicios afectados:** `web`

**Descripción:**

La cara pública del producto está sin terminar. La landing tiene **texto placeholder
autorreferencial** ("This is the WHY section where we explain...") en sus tres secciones, con tres
`<h1>` en la misma página y anclas `#why`/`#how`/`#demo` definidas que **ningún link usa** — "About"
y "See Demo" apuntan los dos a `/`.

No hay rutas protegidas (`/events/create` y `/events/:eventId/manage` son alcanzables por URL sin
sesión) ni ruta 404 (una URL desconocida renderiza la navbar sobre el vacío). Y quedan
inconsistencias de nomenclatura: la etapa `results` se muestra como `Completed` en el listado y
como `Results` en todas las demás pantallas.

Incluye la limpieza de las tres islas en español (etiquetas de rol, un `aria-label`, datos mock) y
el retiro del código muerto.

**¿Por qué es importante?**

Es lo primero que ve alguien que llega por un link compartido. Hoy ese visitante lee texto de
andamiaje. Como el registro a un evento se hace por link compartible —el mecanismo principal de
incorporación de participantes—, la primera impresión del producto es una página sin contenido.

**Capacidades que completa:**
- C-11: Listar eventos (unificar nomenclatura de etapas)
- C-12: Ver detalle del evento
- NFR-U-04: Idioma consistente
- Corrige D-13 (rutas protegidas y 404)

**Precondiciones:**
- Escribir el contenido real de la landing: es trabajo de producto y comunicación, no de
  desarrollo. **Sin ese texto, este feature group no puede completarse.**
- FG-4 en curso o completo, para no escribir pantallas nuevas con los mismos problemas de
  responsive.

**Postcondiciones:**
- La landing tiene contenido real y navegación funcional por anclas.
- Existe un componente de ruta protegida y una pantalla 404.
- La nomenclatura de etapas es idéntica en toda la aplicación.
- No queda código muerto ni texto en español no intencional.

**Valor entregado:**
Alguien que recibe el link de una convocatoria entiende qué es Telescopio antes de registrarse.

---

## Notas de Secuenciamiento

**FG-1 (Integridad) va primero, sin excepción.** Mientras el sistema fabrique datos, cualquier
otro trabajo se valida contra información que puede ser falsa — incluidas las validaciones de
avance de etapa de FG-3, que cuentan participantes.

**FG-2 (Autorización) es independiente de FG-1** y puede hacerse en paralelo: toca el backend,
mientras que FG-1 es todo frontend. Van juntos en prioridad crítica porque son los dos que
producen daño real hoy.

**FG-3 (Ciclo de vida) depende de FG-1**, por lo anterior.

**FG-4 (Responsive/A11y) puede empezar en paralelo con FG-3**, son áreas disjuntas. Pero
**necesita antes una definición de objetivo de accesibilidad**: sin eso no tiene criterio de cierre.

**FG-5 (Resultado oficial) está bloqueado por una decisión de producto**, no por trabajo técnico.
Conviene resolverlo temprano aunque se implemente después, porque **FG-6 depende de él**: no se
puede refactorizar el cálculo de resultados sin saber cuál importa.

**FG-6 (Robustez del motor) después de FG-5.**

**FG-7 (Interfaz pública) es el único que puede postergarse sin costo técnico**, pero tiene un
bloqueo no técnico: hay que escribir el contenido de la landing.

### Resumen de dependencias

```
FG-1 (Integridad) ──┬──> FG-3 (Ciclo de vida) ──┐
                    │                            │
FG-2 (Autorización) ┘                            ├──> FG-7 (Interfaz pública)
                                                 │
FG-4 (Responsive/A11y) ──────────────────────────┘
   ↑ requiere: objetivo WCAG definido

FG-5 (Resultado oficial) ──> FG-6 (Robustez del motor)
   ↑ BLOQUEADO: decisión de producto
```

### Bloqueos no técnicos

Tres feature groups no pueden cerrarse sin una decisión o un insumo que no es de desarrollo:

| FG | Bloqueo | Quién lo resuelve |
|----|---------|-------------------|
| FG-4 | Objetivo de accesibilidad (¿WCAG 2.1 AA?) | Producto |
| FG-5 | ¿El ranking oficial es `G` o `G'`? | Producto |
| FG-7 | Contenido real de la landing | Producto / comunicación |
