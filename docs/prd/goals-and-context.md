---
created: 2026-09-18
last_updated: 2026-09-18
status: Draft - Generado desde código existente
---

# Objetivos y Contexto

> **Documento generado por `/product-consolidate-services` a partir del código existente.**
> Lo que sale del código está marcado como tal. Lo que es inferencia está marcado como
> **[supuesto]** y necesita confirmación: el código dice *qué hace* el sistema, no *para
> quién* ni *por qué*.

---

## Visión General del Producto

### Nombre

**Telescopio**

El nombre aparece en el logo de la navbar (`App.tsx:151`), en los títulos de la pantalla de
reset de contraseña (`🔭 Reset Password`) y en el módulo Go
(`github.com/gravadigital/api`).

### Problema que Resuelve

Cuando una convocatoria recibe muchas más propuestas de las que un comité puede leer, la
evaluación se convierte en el cuello de botella. Un comité chico no da abasto; uno grande es
caro y lento de coordinar. El resultado habitual es que se evalúa poco, se evalúa tarde, o se
evalúa con criterios que varían según quién haya leído qué.

Telescopio reparte la evaluación entre los propios participantes: cada quien evalúa un
subconjunto de las propuestas ajenas, y de ese conjunto de rankings parciales se deriva un
ranking global. Eso resuelve la escala, pero abre dos problemas nuevos que el producto ataca
explícitamente:

1. **Conflicto de interés** — nadie debe evaluar su propia propuesta. El sistema lo garantiza
   dos veces: en el código Go y en un trigger de PostgreSQL.
2. **Evaluación de mala fe o desinteresada** — si evaluar no tiene consecuencias, conviene
   hacerlo rápido y mal. El sistema mide la calidad de cada evaluador (cuánto se aparta del
   consenso) y ajusta la posición de *su propia propuesta* en función de eso: evaluar bien
   mejora tu resultado.

La implementación sigue el modelo de **Merrifield & Saari (2009)** de revisión por pares
distribuida, con Modified Borda Count. El dominio original del paper es la asignación de
tiempo de observación en telescopios, que es de donde viene el nombre del producto.

### Usuarios Objetivo

Los tres roles salen del código con evidencia directa. **No hay un usuario real fijo**: el
producto es de propósito general y el dominio concreto (astronomía, fotografía, becas) es
intercambiable, así que las audiencias se definen por su función en el proceso —quien convoca
y quien se presenta— y no por su profesión. Eso es deliberado y acota el trabajo de UX: no se
diseña para "el astrónomo", se diseña para "quien presenta una propuesta a una convocatoria".

- **U-01: Organizador de convocatoria** — Crea el evento, define los parámetros del algoritmo
  de votación, hace avanzar las etapas y publica los resultados. En el código es el
  `creator` del evento (`event_participants.role = 'creator'`, y `events.author_id`).
  Tiene una pantalla exclusiva (`/events/:eventId/manage`) y es el único que puede pausar,
  cancelar y avanzar de etapa. **Cualquier usuario puede crear un evento**: ser organizador no
  requiere un permiso previo, se es organizador del evento que uno creó. Es quien responde por
  la legitimidad del resultado ante quien sea que convoque.

- **U-02: Participante / investigador** — Se registra al evento por un link compartible, sube
  **una** propuesta (una sola por persona y por evento), recibe una asignación de propuestas
  ajenas para evaluar, las ordena en un ranking y ve el resultado final. Es el rol
  `participant`. **[supuesto]** Su motivación primaria es que su propuesta sea seleccionada;
  evaluar es un costo que el sistema de incentivos convierte en algo que le conviene hacer bien.
  Un mismo usuario es organizador en un evento y participante en otro: los roles son por evento,
  no por persona.

- **U-03: Visitante anónimo** — Ve la landing, el listado de eventos y el detalle de un evento
  sin sesión. No puede participar ni evaluar. Es el estado previo a registrarse.

> **No hay un cuarto rol de usuario.** El rol global `users.role` (`admin` / `organizer` /
> `participant`) es **deuda a eliminar**, no una audiencia: ver "Decisiones ya Tomadas".
> La administración de un evento la ejerce su creador (U-01), que es el modelo vigente.

### Propuesta de Valor

Un proceso de selección **de propósito general** que **escala con la cantidad de propuestas**
en lugar de saturarse con ella, y que es **auditable**: el ranking no es el juicio de un comité sino una función
determinística (con desempate por UUID, para que dos cálculos den el mismo orden) sobre los
rankings que emitieron los propios participantes.

El mecanismo **no está atado al dominio astronómico**: la idea nace del problema de asignar
tiempo de telescopio, pero el producto tiene que servir igual para un concurso fotográfico o
cualquier otra convocatoria donde muchos presentan y no hay comité que dé abasto. Eso es una
**definición de producto, no una consecuencia del código** — y tiene implicancias concretas:
el vocabulario de la interfaz debe ser neutral (`propuesta`, `evento`, `participante`, no
`observación` ni `telescopio`), y nada del dominio astronómico puede quedar embebido en el
modelo. Hoy el código ya cumple esto: las entidades son `events`, `attachments` y
`participants`, sin rastro de astronomía salvo el nombre del producto.

---

## Objetivos y Criterios de Éxito

> **[supuesto]** Los objetivos están inferidos de lo que el código optimiza. Un objetivo que
> el código persigue con esfuerzo visible —como G-02, con su doble validación de conflicto de
> interés y su sistema de incentivos— es una inferencia fuerte. Las métricas son propuestas:
> **el sistema hoy no instrumenta ninguna de ellas.**

### Objetivos Primarios

1. **G-01: Hacer viable evaluar convocatorias que exceden la capacidad de un comité.**
   Repartir la carga de evaluación entre los participantes, de modo que el costo por persona
   sea acotado (`m` propuestas, configurable) sin importar cuántas propuestas haya en total.

2. **G-02: Producir un ranking en el que se pueda confiar aunque lo produzcan las partes
   interesadas.** Los evaluadores son los propios competidores, así que el sistema tiene que
   neutralizar tanto el conflicto de interés directo (nadie evalúa lo propio) como el
   incentivo a evaluar mal. Es el objetivo que más código concentra.

3. **G-03: Que el organizador controle el proceso sin tener que intervenir en cada paso.**
   Una máquina de estados de cuatro etapas (`creation → participation → voting → results`),
   sin retrocesos ni saltos, con avance manual y deadlines estimados por etapa. Los parámetros
   del algoritmo siguen la misma lógica: **el sistema calcula y recomienda una base, y el
   organizador puede editarla** — no tiene que entender el modelo matemático para largar un
   evento, pero puede intervenir si sabe lo que hace.

4. **G-04: Que participar tenga la menor fricción posible.** Registro por link compartible
   que crea el usuario en el acto si no existe, login con Google, y borradores de voto para
   no perder el ranking a medio armar.

### Criterios de Éxito

> **Ninguna de estas métricas está instrumentada hoy.** No hay analytics, ni telemetría, ni
> tabla de eventos de uso. Son la propuesta de qué medir, no un reporte de lo que se mide.

| Métrica | Objetivo | Plazo | Valida |
|---|---|---|---|
| Tasa de completitud de evaluación (asignaciones con `is_completed = true` sobre el total) | > 90% | Por evento, al cerrar la etapa de votación | G-01, G-02 |
| Cobertura mínima efectiva (propuestas que alcanzan `min_evaluations_per_file`) | 100% | Por evento, al generar asignaciones | G-01 |
| Calidad media de los evaluadores (`AVG(assignments.quality_score)`) | > 0.6 (el umbral de "buen evaluador" por defecto) | Por evento, al calcular resultados | G-02 |
| Proporción de evaluadores por debajo de `quality_bad_threshold` | < 15% | Por evento | G-02 |
| Propuestas subidas sobre participantes registrados | > 85% | Al cerrar la etapa de participación | G-04 |
| Tiempo desde que se abre la participación hasta que se publican resultados | Dentro del deadline estimado que fijó el organizador | Por evento | G-03 |

---

## Contexto

### Sistemas Existentes

El producto **ya está construido**. Este PRD se generó desde el código, no al revés. Lo
existente es:

- **`api`** — Backend Go/Gin con 30 endpoints, PostgreSQL, y el algoritmo de
  votación implementado en `internal/domain/vote/voting_service.go`.
- **`web`** — SPA React con 6 rutas, única interfaz del producto.
- **PostgreSQL `telescopio_db`** — 9 tablas, 21 migraciones versionadas. **Una parte
  sustancial de las reglas de negocio vive en triggers plpgsql**, no en Go.
- **Google OAuth** — Login alternativo al de email/password.
- **SMTP** — Notificaciones de cambio de etapa, cancelación y reset de contraseña.
- **MinIO** — Storage de propuestas. El stack local (`deploy/docker-compose.yml`) y el
  `Makefile` fijan `STORAGE_PROVIDER=minio`; el filesystem local queda como alternativa.
  **Atención**: el default del código Go es `local` (`internal/config/config.go:86`), así que
  quien corra la api sin el compose ni el `Makefile` obtiene filesystem local sin saberlo.

### Decisiones ya Tomadas

Estas condicionan cualquier trabajo futuro y están documentadas en detalle en
[`docs/adrs/`](../adrs/):

- **El algoritmo es Merrifield & Saari (2009) con Modified Borda Count.** No es una decisión
  de implementación: es el producto.
- **Backend monolítico + SPA.** No hay microservicios, ni bus de eventos, ni comunicación
  backend-a-backend.
- **Reglas de negocio en triggers de PostgreSQL.** Conflicto de interés, completitud de
  asignaciones y `vote_count` se validan/mantienen en plpgsql.
- **Go + Gin + GORM** en el backend; **React 19 + Create React App + CSS plano** en el
  frontend. Ambos divergen del catálogo de convenciones del workflow (que sugiere chi y
  sqlc para Go, y Next.js para frontend).
- **Una propuesta por participante por evento.** Restricción impuesta por la aplicación.
- **El producto es de propósito general.** El dominio astronómico es el origen del problema,
  no un límite del producto: tiene que servir para cualquier convocatoria con evaluación por
  pares. El vocabulario de producto y de interfaz debe ser neutral.
- **Los parámetros del algoritmo son recomendados por el sistema y editables por el
  organizador.** No son fijos institucionales ni configuración obligatoria: hay un default
  calculado que funciona sin intervención.
- **El rol global `users.role` es deuda a eliminar.** Los tres valores (`admin`, `organizer`,
  `participant`) quedaron desplazados por el rol por evento (`creator` / `participant`), que es
  el modelo vigente: cualquiera puede crear eventos y participar en otros. `admin` es hoy un
  superusuario global que saltea toda verificación de permiso sobre cualquier evento, alcanzable
  únicamente escribiendo en la base. Retirarlo es una tarea de seguridad, no de limpieza.
- **La interfaz debe ser responsive.** No es aspiracional: define que los gaps de mobile
  documentados en `docs/ux/gaps-as-is.md` son defectos a corregir, no decisiones de alcance.
- **El idioma de la interfaz es inglés**, con tres islas en español que son inconsistencias,
  no una decisión (ver `docs/ux/gaps-as-is.md`).

---

## Alcance

### Dentro del Alcance (implementado hoy)

- **Ciclo de vida del evento**: creación, cuatro etapas con avance unidireccional, pausa y
  reanudación, cancelación, deadlines estimados por etapa (solo posponibles), link compartible.
- **Identidad**: registro y login con email/password (bcrypt, mínimo 8 caracteres), Google
  OAuth con paso de completar nombre, recuperación de contraseña por token con vigencia de
  1 hora, JWT HS256 de 24 horas.
- **Roles en dos niveles**: global (`admin`/`organizer`/`participant`) y por evento
  (`creator`/`participant`).
- **Participación**: registro a un evento por link, con creación del usuario en el acto si el
  email no existe; cupo máximo configurable (default 20).
- **Propuestas**: una por participante por evento; 8 tipos MIME aceptados; límite de 10 MB
  validado en el cliente (la base admite hasta 100 MB); storage local o MinIO.
- **Motor de votación distribuida**: configuración de parámetros por evento, generación de
  asignaciones con conflicto de interés y cobertura mínima, validación de la condición de
  convergencia `m ≥ 2·log₂(k)`, cálculo de MBC, cálculo de calidad por evaluador y
  aplicación del sistema de incentivos.
- **Borradores de voto**: guardado parcial del ranking, uno por par (asignación, participante).
- **Resultados**: ranking global `G`, ranking ajustado `G'`, calidades por participante y
  estadísticas de votación.
- **Notificaciones por email**: cambio de etapa, cancelación del evento y reset de contraseña.

### Fuera del Alcance (no implementado)

Esto no es una lista de deseos: es lo que el código **no** hace, verificado.

- **Pantalla de administración global.** El rol `admin` de `users.role` no tiene interfaz — y
  no la va a tener: es deuda a eliminar, no funcionalidad pendiente.
- **Instrumentación y analytics.** Ninguna de las métricas de éxito de arriba se mide.
- **i18n.** Los textos están embebidos en el JSX.
- **Rutas protegidas en el frontend.** `/events/create` y `/events/:eventId/manage` son
  alcanzables por URL sin sesión; el control se hace (o no) dentro de cada pantalla.
- **Ruta 404.** Una URL desconocida renderiza la navbar sobre contenido vacío.
- **Tema claro.** Solo dos componentes responden a `prefers-color-scheme: light`.
- **Estado offline.** No hay manejo de pérdida de conectividad en ninguna pantalla.
- **Contenido real de la landing.** Las tres secciones de `/` tienen texto placeholder.
- **Múltiples rondas de asignación.** `assignments.assignment_round` existe y siempre vale 1.
- **Campos de votación avanzados.** `confidence`, `evaluation_time_seconds`, `notes` e
  `is_quality_vote` existen en la base y nunca se escriben.
- **Matching por expertise.** `expertise_match_score` y las columnas
  `use_expertise_matching` / `enable_co_idetection` existen en la base y el dominio no las lee.
- **Descarga de propuestas por los evaluadores.** La descarga exige autenticación y la ofrece
  la pantalla del organizador, pero un evaluador no puede abrir las propuestas que tiene
  asignadas (D-15).

### Restricciones

- **Tecnología**: Go 1.26.6 + Gin + GORM + PostgreSQL en el backend; React 19 + CRA +
  TypeScript + CSS plano en el frontend. Cambiar cualquiera de estas es un proyecto en sí.
- **Las reglas en triggers son parte del contrato.** Escribir contra la base salteando la API
  falla con `RAISE EXCEPTION`, que llega como un 500 genérico. Los tests de integración tienen
  que construir datos coherentes con la `voting_configuration` del evento.
- **Convergencia del algoritmo**: `m ≤ k-1` (nadie evalúa lo propio) y `m ≥ 2·log₂(k)` (con
  una relajación al 60% del máximo para `k ≤ 10`). Con pocas propuestas, los parámetros
  posibles son muy acotados.
- **Responsive obligatorio, sobre una base desktop-first**: el CSS describe el desktop y va
  restando ancho, con un único corte estructural real en 768px. Que la responsividad sea un
  requisito y no una preferencia convierte en defectos —no en limitaciones aceptadas— a los
  gaps de mobile ya detectados: los deadlines ocultos por debajo de 600px y la tabla de
  participantes ilegible al apilarse.

---

## Interesados

| Interesado | Rol | Evidencia |
|---|---|---|
| **gravadigital** | Organización propietaria | Módulo Go `github.com/gravadigital/api` |
| **Ivan** | Desarrollo / mantenimiento | Autor de los commits del monorepo |
| U-01 Organizadores | Usuario primario | **[supuesto]** — no identificados en el código |
| U-02 Participantes | Usuario primario | **[supuesto]** — no identificados en el código |

---

## Preguntas Abiertas

Estado tras la validación con el responsable del producto (2026-09-18).

### Resueltas

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Quién es el usuario real? | **No hay uno fijo.** El producto es de propósito general: nace del problema del telescopio pero debe servir igual para un concurso fotográfico o cualquier convocatoria con evaluación por pares |
| 2 | ¿El rol global `organizer` se usa? | **No.** Quedó desplazado: cualquiera puede crear eventos y participar en otros. Todo `users.role` es deuda |
| 3 | ¿Quién define los parámetros del algoritmo? | **El sistema calcula y recomienda una base; el organizador la puede editar** |
| 5 | ¿El rol `admin` se opera por base, o falta pantalla? | Pregunta mal planteada de mi parte. La administración *de un evento* la ejerce su creador y ya funciona. El `admin` **global** de `users.role` es otra cosa y es deuda a eliminar |
| 6 | ¿`STORAGE_PROVIDER` en producción? | **`minio`.** Es lo que usan el stack local y las imágenes publicadas; el compose de servidor vive en el repo de deploy |
| 7 | ¿Dispositivo prioritario? | **Responsive es importante.** Los gaps de mobile son defectos a corregir |

### Pendientes

| # | Pregunta | Por qué importa |
|---|---|---|
| 4 | **¿Cuál es el ranking oficial: `G` (global) o `G'` (ajustado por incentivos)?** | **Sin definir.** Es la pregunta de producto más importante que queda abierta: si el oficial es `G`, el sistema de incentivos —que es la mitad del valor diferencial del producto y una porción sustancial del código— no tiene ningún efecto sobre el resultado. Hoy el sistema calcula y persiste los dos, y la interfaz no declara cuál muestra como definitivo |

Nuevas preguntas que surgen de las respuestas:

- **La recomendación de parámetros ya está implementada**, y coincide con la definición: el
  frontend calcula `recommendedM = min(max(⌈2·log₂(k)⌉, 1), k-1)` y lo usa como valor inicial
  editable, mostrando `Recommended: {n} (max: {m})` junto al campo
  (`VotingConfigurationPanel.tsx:25-31`, `:124`). Los otros cuatro parámetros toman los
  defaults del backend (`vote.go:295-296`). **Queda una asimetría a revisar:** el cálculo vive
  en el frontend, mientras que el backend lo recalcula para *validar* (`voting_service.go:48-68`)
  y rechaza con error si `m` es menor. Dos implementaciones de la misma fórmula en lenguajes
  distintos: si una cambia y la otra no, el organizador ve un recomendado que el backend rechaza.
- **¿Retirar `users.role` implica migración de datos?** Hay usuarios existentes con valores en
  esa columna y middlewares que la leen.
