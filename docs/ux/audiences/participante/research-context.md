---
document: Research Context — Participante
version: "1.0"
date: 2026-09-18
status: hipótesis-preliminar
audiencia: participante
---

# Research Context — Audiencia `participante`

> **Todo en este documento es hipótesis.** No hay entrevistas con usuarios reales. Cada ítem cita
> su fuente y declara su fuerza. **El código no aporta nada acá**: dice qué hace el sistema, nunca
> para quién ni por qué. Ver [`benchmark.md`](./benchmark.md) primero.

---

## Persona Genérica

**Quién es:** alguien que se presenta a una convocatoria con una propuesta propia y, como
condición para que la suya sea considerada, evalúa un subconjunto de las ajenas.

| Dimensión | Hipótesis |
|---|---|
| **Rol** | Proponente y evaluador **a la vez**. No son dos personas: es la misma, en dos momentos del mismo proceso |
| **Cuándo usa el producto** | En ráfagas, alrededor de tres momentos: cuando se entera del evento, cuando entrega, y cuando le toca evaluar. **Entre medio no entra** |
| **Dónde** | No determinado. El responsable confirmó que el responsive es requisito, lo que sugiere que el teléfono es un contexto real `[fuente: input-cliente]` |
| **Nivel de expertise** | En su dominio, alto. **En el producto, nulo y recurrentemente nulo**: si organiza o participa una vez por año, cada vez vuelve como si fuera la primera |
| **Frecuencia esperada** | Baja. Unas pocas sesiones por evento |
| **Qué trae puesto** | Depende de su origen. Si viene de ESO/ALMA conoce el modelo distribuido y espera anonimato. Si viene de concursos, **el modelo le es completamente nuevo** `[fuente: benchmark]` |

**Lo que define el diseño para esta persona:** no hay curva de aprendizaje que amortizar. Cada
interacción es, en la práctica, un primer uso.

---

## Jobs To Be Done

Máximo 3. Se documentan 3 porque hay base para los 3.

### JTBD-01 — Entregar mi propuesta antes de que cierre

> Cuando me entero de una convocatoria que me interesa, quiero registrarme y dejar mi propuesta
> cargada, para no quedar afuera por un tema de plazos.

`[fuente: PRD §F-03]` · **Fuerza: `inferida-PRD`**

Base: el flujo de registro y carga es público, crea el usuario en el acto si no existe, y está
acotado por etapa y por cupo. Todo el diseño del flujo apunta a bajar la fricción de entrada.

### JTBD-02 — Cumplir con la evaluación que me tocó, sin que me cueste demasiado

> Cuando el evento pasa a votación, quiero ordenar las propuestas que me asignaron y enviarlas,
> para cumplir mi parte sin dedicarle más tiempo del necesario.

`[fuente: PRD §F-04]` + `[fuente: benchmark]` · **Fuerza: `inferida-benchmark`**

Base: en ESO el principio es "muchas personas revisan unas pocas" — el costo por persona es
acotado a propósito. Los borradores de voto existen justamente para que abandonar la pantalla no
cueste el progreso.

### JTBD-03 — Saber cómo quedó mi propuesta

> Cuando el evento cierra, quiero ver el ranking final, para saber si mi propuesta fue
> seleccionada.

`[fuente: PRD §F-05]` · **Fuerza: `inferida-PRD`**

Base: es el desenlace del proceso. El panel de resultados existe y se usa en tres pantallas.

---

## Pains

Máximo 3. Redactados en términos de capacidad y resultado concreto (Regla 6).

### P-01 — No puede ver el plazo desde el teléfono

Por debajo de 600px, `EventTimeline` oculta las fechas límite. La única otra forma de ver un
deadline es la ficha de `ManageEventPage`, **que es exclusiva del organizador**. Un participante
que abre el evento en el teléfono **no tiene forma de saber cuándo vence**.

`[fuente: código-existente — EventTimeline.css:239-259]` · **Fuerza: `inferida-PRD`**

> Este pain no es una hipótesis sobre el usuario: es un hecho verificado del sistema. Lo que es
> hipótesis es cuánto le importa — depende de si efectivamente usa el teléfono.

### P-02 — El enlace para leer las propuestas apunta a `localhost` en producción

El panel de ranking **sí ofrece** un enlace `📥 Download / View File` por cada propuesta asignada.
Pero el `href` tiene **`http://localhost:8080` hardcodeado**, ignorando `REACT_APP_API_URL`:

```tsx
href={`http://localhost:8080${att.url}`}
```

En cualquier despliegue que no sea la máquina de quien desarrolla, **ese enlace no lleva a ningún
lado**. El evaluador ve un botón de descarga que no funciona, y queda ordenando propuestas por
nombre de archivo, fecha y tamaño — los únicos datos que la tarjeta muestra.

`[fuente: código-existente — RankingVotePanel.tsx:241-247]` + `[fuente: benchmark]` ·
**Fuerza: `inferida-benchmark`**

Base del benchmark: en toda referencia de revisión por pares, el revisor lee lo que evalúa. Es la
premisa del modelo, no una comodidad.

> **Verificado en el código.** La corrección es de una línea (usar la base URL configurada), pero
> el impacto mientras no se corrija es el máximo posible: **invalida el JTBD-02**. Un ranking
> emitido sin haber leído las propuestas no mide calidad, y el `Q_i` derivado de él tampoco.
>
> Se suma que ese mismo endpoint **no exige autenticación** (D-02 del PRD): cuando se corrija la
> URL, hay que corregir las dos cosas juntas o se expone la descarga a cualquiera con el UUID.

### P-03 — No sabe que evaluar mal lo perjudica

El sistema de incentivos ajusta la posición de la propuesta propia según la calidad de la
evaluación. **La interfaz no lo comunica en ningún lado.** Si el participante no lo sabe antes de
evaluar, el incentivo no opera: es un castigo retroactivo por una regla que no se le enunció.

`[fuente: PRD §F-04, C-33]` + `[fuente: benchmark]` · **Fuerza: `inferida-PRD`**

---

## Gains

Máximo 3.

### G-01 — Entrar sin tener que crear una cuenta antes

El registro a un evento **crea el usuario en el acto** si el email no existe. Se puede pasar del
link compartible a estar registrado sin un paso previo de alta.

`[fuente: PRD §C-18]` · **Fuerza: `inferida-PRD`**

### G-02 — No perder el ranking a medio armar

Los borradores se guardan por asignación. Se puede abandonar la pantalla y volver.

`[fuente: PRD §C-28]` · **Fuerza: `inferida-PRD`**

### G-03 — No perder el contexto cuando vence la sesión

Ante un 401 la aplicación desloguea **sin recargar la página**: el usuario sigue en la pantalla
donde estaba.

`[fuente: código-existente — AuthContext.tsx:81-95]` · **Fuerza: `inferida-PRD`**

---

## Hipótesis de Comportamiento

Máximo 5. Se documentan 4.

| # | Hipótesis | Fuerza | Cómo validarla |
|---|---|---|---|
| H-01 | Entra al producto **solo cuando recibe un email** de cambio de etapa. No vuelve por iniciativa propia | `inferida-PRD` | Analítica de sesiones cruzada con envíos de email. **Hoy no hay instrumentación** |
| H-02 | Deja la evaluación para el final del plazo | `por-analogía` | Distribución temporal de `votes.voted_at` respecto del deadline. **Requiere entrevistas para entender el porqué** |
| H-03 | Si viene del mundo académico, **espera que el proceso sea anónimo** y le llama la atención que no lo sea | `inferida-benchmark` | Entrevista corta. ALMA es doble ciego en ambas direcciones; Telescopio no lo es en ninguna |
| H-04 | Prioriza entregar sobre evaluar: si tuviera que elegir, entrega y no evalúa | `por-analogía` | Comparar tasa de entrega contra tasa de completitud de asignaciones por evento |

**H-04 es la hipótesis de mayor consecuencia.** Si es cierta, el sistema de incentivos es
exactamente el mecanismo que la contrarresta — y entonces P-03 (que el participante no sabe que
existe) deja de ser un detalle de comunicación y pasa a ser un defecto estructural.

---

## Restricciones de Contexto

- **Uso en ráfagas, con meses de por medio.** No se puede asumir ninguna memoria del producto entre
  sesiones. `[fuente: PRD]`
- **El responsive es requisito confirmado.** `[fuente: input-cliente]`
- **Una sola propuesta por participante y por evento.** No hay reemplazo ni segunda entrega.
  `[fuente: PRD §C-19]`
- **El envío del ranking es irreversible.** No admite reenvío ni corrección.
  `[fuente: PRD §C-30]`
- **El participante no elige qué evalúa.** A diferencia de EasyChair, no hay *bids* ni áreas
  declaradas. `[fuente: benchmark]`

---

## Lo que NO sabemos

Agenda de investigación, ordenada por lo que más cambiaría el diseño:

1. ~~¿Puede leer las propuestas que evalúa?~~ **Resuelto por inspección del código:** el enlace
   existe pero apunta a `localhost` hardcodeado (P-02). Lo que queda por saber es **qué hace hoy el
   participante ante un enlace roto** — ¿pide el archivo por fuera del sistema, o rankea igual sin
   leer? La segunda respuesta significaría que hay eventos ya cerrados cuyo ranking no mide nada.
2. **¿De qué mundo viene?** Académico (conoce el modelo, espera anonimato) o concursos (el modelo
   le es nuevo). Cambia cuánto hay que explicar.
3. **¿Entiende el sistema de incentivos?** (P-03, H-04)
4. **¿Desde qué dispositivo evalúa?** (P-01) El responsive es requisito, pero no se sabe de dónde
   viene el uso real.
5. **¿Qué lo hace abandonar a mitad de la evaluación?** Los borradores existen, lo que sugiere que
   alguien pensó que abandonar era frecuente — pero no hay dato que lo confirme.
6. **¿Cuánto esfuerzo acepta?** Define si `m` debe tender al mínimo del modelo.
