---
document: Research Context — Organizador
version: "1.0"
date: 2026-09-18
status: hipótesis-preliminar
audiencia: organizador
---

# Research Context — Audiencia `organizador`

> **Todo en este documento es hipótesis.** No hay entrevistas con usuarios reales. Cada ítem cita
> su fuente y declara su fuerza. **El código no aporta nada acá**: dice qué hace el sistema, nunca
> para quién ni por qué. Ver [`benchmark.md`](./benchmark.md) primero.

---

## Persona Genérica

**Quién es:** quien convoca. Abre la convocatoria, decide cuándo cierra cada etapa y publica un
resultado del que se hace responsable.

| Dimensión | Hipótesis |
|---|---|
| **Rol** | Conduce el proceso. **No compite en él**: el creador no puede registrarse ni subir propuesta a su propio evento `[fuente: código-existente]` |
| **Cuándo usa el producto** | Al crear el evento, y después en cada punto de decisión: abrir participación, abrir votación, cerrar. Entre medio, a mirar cómo viene |
| **Dónde** | Probablemente desktop — la pantalla de gestión es densa en datos. **No verificado**; el responsive es requisito para todo el producto |
| **Nivel de expertise** | En su dominio, alto. **En el modelo matemático del producto, probablemente nulo** |
| **Frecuencia esperada** | Muy baja. Una convocatoria por ciclo — puede ser una vez al año |
| **Qué trae puesto** | Si viene del mundo académico, el rol de *chair* de EasyChair. Si viene de concursos, plataformas donde **elige el modelo de selección** `[fuente: benchmark]` |

**Lo que define el diseño para esta persona:** toma decisiones **irreversibles** (avanzar de etapa,
generar asignaciones) con **baja frecuencia** y **sin dominar el modelo** que está configurando.
Esa combinación es la más riesgosa que hay: nada de lo que hace se puede deshacer, y no tiene
práctica haciéndolo.

---

## Jobs To Be Done

Máximo 3. Se documentan 3.

### JTBD-01 — Abrir una convocatoria y hacer que llegue a quien tiene que llegar

> Cuando necesito seleccionar entre muchas propuestas, quiero crear el evento y compartirlo, para
> que la gente que me interesa se registre y entregue.

`[fuente: PRD §F-02, C-10, C-17]` · **Fuerza: `inferida-PRD`**

Base: el link compartible se genera al crear el evento, y el registro por link es público y crea
el usuario en el acto. Todo el mecanismo de incorporación se apoya en compartir esa URL.

### JTBD-02 — Conducir el proceso hasta un resultado, sabiendo si va bien

> Cuando el evento está en marcha, quiero saber si la gente está entregando y evaluando, para
> decidir cuándo cerrar cada etapa sin arruinar el resultado.

`[fuente: PRD §F-02, C-13, C-34]` + `[fuente: benchmark]` · **Fuerza: `inferida-benchmark`**

Base del benchmark: en EasyChair, monitorear el progreso de las revisiones y actuar sobre los
rezagados es la tarea central del chair. Es la actividad que más tiempo consume del rol.

### JTBD-03 — Publicar un resultado que pueda defender

> Cuando cierro la evaluación, quiero un ranking que resista ser cuestionado por quien no quedó
> seleccionado.

`[fuente: PRD §G-02, F-05]` · **Fuerza: `inferida-PRD`**

Base: es el objetivo G-02 del PRD. El determinismo del cálculo —desempate por UUID incluido— es
una decisión tomada específicamente para que el resultado sea reproducible.

---

## Pains

Máximo 3. Redactados en términos de capacidad y resultado concreto (Regla 6).

### P-01 — Decide sobre datos que pueden ser falsos

Tres cargas de `ManageEventPage` fallan solo a consola. **Si la API de participantes cae, la
pantalla muestra `No participants have registered yet.` como si realmente no hubiera ninguno.** Y
el componente `Participants` **rellena la lista con tres personas inventadas** cuando falla, que se
ven junto al mensaje de error y con el mismo aspecto que las reales.

El organizador puede avanzar de etapa, cancelar el evento o decidir que la convocatoria fracasó
**sobre información que el sistema fabricó**.

`[fuente: código-existente — ManageEventPage.tsx:74-77, :92-96, :116-120; Participants.tsx:24-56]` ·
**Fuerza: `inferida-PRD`**

> No es hipótesis sobre el usuario: es un hecho verificado del sistema. Es el pain de mayor
> consecuencia de todo el producto, porque **corrompe la entrada de las decisiones irreversibles**.

### P-02 — No sabe si el ranking va a ser confiable antes de que sea tarde

El organizador ve **cuántos participantes votaron**, en agregado. No ve **cuántas evaluaciones
recibió cada propuesta** — que es el dato que determina si el MBC de esa propuesta es sólido.

Se agrava porque el algoritmo **puede dejar propuestas por debajo del `min_evaluations_per_file`
que él mismo configuró, sin avisar** (D-10 del PRD).

`[fuente: código-existente]` + `[fuente: benchmark]` · **Fuerza: `inferida-benchmark`**

Base del benchmark: EasyChair muestra al chair, por cada envío, cuántas revisiones se completaron.
Es precisamente el dato que falta.

### P-03 — No puede corregir una asignación mal generada

Las asignaciones se generan **una sola vez** y no hay endpoint para rehacerlas. Si se generan con
una configuración equivocada —un `m` demasiado alto, umbrales mal puestos— **no hay camino de
vuelta desde la interfaz**.

En EasyChair el chair reasigna cuando hace falta.

`[fuente: código-existente]` + `[fuente: benchmark]` · **Fuerza: `inferida-benchmark`**

---

## Gains

Máximo 3.

### G-01 — No tiene que entender el modelo para largar un evento

El sistema **precalcula el `m` recomendado** con la fórmula de convergencia y lo precarga en el
campo, mostrando `Recommended: {n} (max: {m})`. Los otros cuatro parámetros tienen defaults.

`[fuente: código-existente — VotingConfigurationPanel.tsx:25-31]` · **Fuerza: `inferida-PRD`**

### G-02 — Controla los tiempos sin depender de nadie

El avance de etapa es manual. Los deadlines son estimados e informativos, no disparadores: nada
ocurre automáticamente a sus espaldas.

`[fuente: PRD §C-13, C-14]` · **Fuerza: `inferida-PRD`**

### G-03 — Puede frenar el evento sin cancelarlo

`is_paused` es independiente de la etapa. Permite detener registros y entregas sin perder el
evento ni volver atrás.

`[fuente: PRD §C-15]` · **Fuerza: `inferida-PRD`**

---

## Hipótesis de Comportamiento

Máximo 5. Se documentan 4.

| # | Hipótesis | Fuerza | Cómo validarla |
|---|---|---|---|
| H-01 | **Acepta el `m` recomendado sin cuestionarlo**, porque no tiene criterio para evaluarlo | `inferida-benchmark` | Comparar `attachments_per_evaluator` guardado contra el recomendado calculado. **El dato ya está en la base**: es medible hoy |
| H-02 | Avanza de etapa **cuando le parece que ya pasó suficiente tiempo**, no por un criterio de completitud | `por-analogía` | Correlacionar el momento del avance con la tasa de completitud en ese momento |
| H-03 | Si viene de concursos, busca "cómo se eligen los ganadores" y **no reconoce** que la respuesta es el formulario de parámetros | `inferida-benchmark` | Prueba de usabilidad sobre la pantalla de configuración |
| H-04 | **No lee las propuestas que recibe.** Confía en que el proceso las evalúe por él | `por-analogía` | Entrevista. Define si el organizador necesita acceso a los archivos |

**H-01 es la más barata de validar y la de mayor consecuencia.** El dato está en la base: si en la
práctica todos aceptan el recomendado, entonces **la pantalla de configuración expone complejidad
que nadie usa**, y podría colapsarse a un modo avanzado. Si en cambio lo ajustan seguido, hay que
explicar mejor qué significa cada parámetro.

---

## Restricciones de Contexto

- **Las decisiones son irreversibles.** El avance de etapa no admite retroceso ni salto; las
  asignaciones se generan una vez. `[fuente: PRD §C-13, C-26]`
- **Frecuencia muy baja.** No se puede asumir memoria del producto entre convocatorias.
- **No compite en su propio evento.** El creador no puede registrarse ni subir propuesta.
  `[fuente: código-existente]`
- **No tiene forma de contactar a los participantes** desde el producto. Los únicos emails son
  automáticos por cambio de etapa. `[fuente: PRD §F-06]`
- **El modelo de selección no es negociable.** A diferencia de las plataformas de concursos, no
  elige entre voto público, jurado o pares: es siempre evaluación distribuida.
  `[fuente: benchmark]`

---

## Lo que NO sabemos

Agenda de investigación, ordenada por lo que más cambiaría el diseño:

1. **¿Entiende el modelo matemático, o solo quiere un resultado?** (H-01, H-03) Determina si la
   configuración debe explicar el modelo o esconderlo detrás del recomendado. **Parcialmente
   medible con los datos que ya existen.**
2. **¿Qué hace cuando la evaluación va lenta?** Hoy no tiene ninguna herramienta. Si en la práctica
   contacta a la gente por fuera del sistema, eso es un requerimiento que falta.
3. **¿Ante quién responde por el resultado?** (JTBD-03) Define cuánta auditabilidad hay que
   exponer: hoy el cálculo es reproducible pero la interfaz no muestra nada que permita verificarlo.
4. **¿Necesita leer las propuestas?** (H-04)
5. **¿Cómo decide cuándo cerrar una etapa?** (H-02) Si es por tiempo y no por completitud, el
   producto debería advertirle activamente antes de cerrar.
6. **¿Organiza solo, o hay más de una persona detrás de una convocatoria?** El modelo asume un
   único `creator` por evento. Si en la práctica son varios, falta una capacidad entera.
