---
document: Benchmark — Participante
version: "1.0"
date: 2026-09-18
status: Draft - Investigación de escritorio
audiencia: participante
---

# Benchmark — Audiencia `participante`

> Referencias mentales: productos que esta audiencia ya usa y de los que trae expectativas.
> Investigación de escritorio con fuentes citadas. **No reemplaza entrevistas con usuarios reales.**

## Alcance de esta investigación

Se buscaron dos familias de referencias, porque el producto es de propósito general y el
participante puede venir de cualquiera de las dos:

1. **Revisión por pares académica** — de donde viene el modelo. Incluye los dos únicos casos
   conocidos de revisión por pares **distribuida** en producción real.
2. **Concursos con voto** — el otro caso de uso declarado del producto.

**Limitación declarada:** no se pudieron verificar capturas ni detalles de interfaz de las
plataformas revisadas. Lo que sigue describe **modelos de interacción documentados**, no diseños
concretos de pantalla. No se inventaron detalles visuales.

---

## Familia 1: Revisión por pares distribuida (el modelo directo)

### ESO — Distributed Peer Review

**Es la referencia más directa que existe: el mismo modelo, en producción, a escala real.**

- Desde el período P110 (oct 2022 – mar 2023), ESO usa DPR para asignar tiempo de telescopio a las
  propuestas por debajo de cierto umbral de horas. **Alrededor de la mitad de las propuestas a ESO
  se evalúan así.**
- El principio es idéntico al de Telescopio: *"en lugar de que pocas personas revisen muchas
  propuestas, muchas personas revisan unas pocas"*.
- **Evaluar es condición para que tu propia propuesta sea considerada.** No es opcional.

**Qué significa para el participante de Telescopio:** la obligación de evaluar no es una
particularidad rara del producto — es el estándar del modelo, y un participante que venga del
mundo académico probablemente ya lo conoce. `[fuente: benchmark]`

### ALMA — Cycle 8 en adelante

- Adoptó DPR en 2021.
- **El proceso es doble ciego:** los evaluadores no conocen la identidad del equipo proponente, y
  los proponentes no conocen la de sus evaluadores.

**Contraste relevante con Telescopio:** el producto actual **no es ciego en ninguna dirección**.
Los resultados muestran `participant_name` junto a cada propuesta, y la asignación entrega el
archivo con su nombre original. Un participante que venga de ALMA o ESO **va a esperar anonimato y
no lo va a encontrar**. `[fuente: benchmark]`

### Evidencia sobre la calidad del modelo

- Un estudio publicado en *Nature Astronomy* no encontró diferencia significativa entre los
  comités tradicionales y los evaluadores distribuidos en cuanto al grado de acuerdo entre
  evaluadores.
- En casi todas las métricas, **el feedback de DPR resultó mejor** que el del comité.

**Qué significa:** el escepticismo previsible del participante ("¿me van a evaluar mis
competidores?") tiene respuesta empírica. Es un argumento que la interfaz podría usar y hoy no
usa en ningún lado. `[fuente: benchmark]`

---

## Familia 2: Gestión de conferencias académicas

### EasyChair

- En uso desde 2002, nacido en la Universidad de Manchester. Es el sistema de referencia por
  ubicuidad: gran parte de la comunidad académica lo usó alguna vez.
- Cubre envío de papers, revisión por pares y armado de programa.

### OpenReview

- Revisión abierta y transparente. Impulsa las grandes conferencias de machine learning (ICLR,
  NeurIPS, UAI).

### Microsoft CMT

- Gratuito para conferencias académicas, muy usado en ciencias de la computación.

**Diferencia estructural con Telescopio:** en los tres, **la asignación de revisores la hace el
comité o un algoritmo de afinidad**, combinando las preferencias declaradas por el revisor
(*bids*), la similitud de texto entre el paper y las publicaciones del revisor, y las áreas
temáticas. El revisor **elige o influye sobre qué revisa**.

En Telescopio, **la asignación es automática y el participante no elige nada**: recibe `m`
propuestas y las ordena. Es una diferencia de expectativa que conviene tener presente: alguien que
viene de EasyChair puede buscar dónde declarar sus preferencias y no encontrarlo.
`[fuente: benchmark]`

---

## Familia 3: Concursos con voto

Relevante porque el producto es de propósito general y el caso "concurso fotográfico" está
explícitamente en alcance.

| Plataforma | Modelo de selección |
|---|---|
| **Gleam** | Ganadores al azar, por panel de jurado, o por **voto público** |
| **SweepWidget** | Galería pública navegable con conteo de votos por pieza |
| **Woobox** | Puntaje privado de jurado con criterios ponderados **junto a** voto público. Flujo multi-etapa: las mejores por voto pasan a jurado |
| **Submittable** | Voto abierto al público o panel de jurado, con puntaje configurable. **Puede ocultar el nombre del autor durante la votación** |
| **PollUnit** | Genera rankings relativos a partir de preferencias recolectadas |

**Diferencia estructural:** todas resuelven el problema con **voto público** (cualquiera vota) o
**jurado** (un panel designado). **Ninguna hace evaluar a los propios participantes entre sí.**

**Qué significa para Telescopio:** en el mundo de los concursos, el modelo del producto **no tiene
precedente conocido**. Un organizador que venga de ahí no va a reconocer el mecanismo, y el
participante tampoco. La interfaz tiene que explicar el modelo, no asumirlo.
`[fuente: benchmark]`

Dos detalles que sí son transferibles:
- **Woobox y Submittable ofrecen ocultar el nombre del autor durante la votación.** Es una función
  esperable que Telescopio no tiene.
- **Anti-fraude** (voto verificado por email, límites por IP) es una preocupación central en esa
  familia. En Telescopio no aplica del mismo modo —solo vota quien tiene asignación— pero la
  equivalencia funcional es el sistema de calidad del evaluador.

---

## Expectativas que el participante trae

Derivadas de lo anterior. Cada una es una **hipótesis a validar**, no una conclusión.

| # | Expectativa | Origen | Se cumple hoy en Telescopio |
|---|---|---|---|
| E-01 | Evaluar es obligatorio y condiciona mi resultado | ESO/ALMA | **Sí**, y con más fuerza: afecta la posición de mi propuesta. **Pero la interfaz no lo explica en ningún lado** |
| E-02 | El proceso es anónimo en ambas direcciones | ALMA (doble ciego) | **No.** Los resultados muestran el nombre del autor de cada propuesta |
| E-03 | Puedo influir en qué me toca evaluar (bids, áreas) | EasyChair, OpenReview, CMT | **No.** La asignación es automática y no negociable |
| E-04 | Sé cuándo vence cada plazo | Todas | **Parcialmente.** El deadline existe, pero **en mobile desaparece por debajo de 600px** (ver gaps) |
| E-05 | Puedo guardar mi evaluación a medio hacer | Plataformas de revisión en general | **Sí.** Los borradores de voto están implementados |
| E-06 | Puedo ver las propuestas que me tocaron antes de ordenarlas | Todas | ⚠️ **No verificable desde la interfaz:** el endpoint de descarga existe pero el frontend no lo consume |

**E-06 es el hallazgo más importante de este benchmark.** En toda referencia de revisión por pares,
el revisor **lee** lo que evalúa. En Telescopio, la pantalla de ranking presenta las propuestas
asignadas para ordenarlas, pero el frontend **no declara el endpoint de descarga**
(`GET /api/v1/attachments/{id}/download`), que el backend sí expone. Si el participante no puede
abrir los archivos, está ordenando nombres de archivo. Ver pregunta abierta #5 del PRD.

---

## Lo que NO sabemos

Agenda de investigación. Ninguna de estas preguntas se responde con búsqueda de escritorio:

1. **¿De qué mundo viene el participante real?** Si viene de ESO/ALMA, el modelo le resulta
   familiar y va a extrañar el anonimato. Si viene de concursos, el modelo le va a resultar
   completamente nuevo y hay que explicárselo.
2. **¿Cuánto esfuerzo está dispuesto a poner en evaluar?** Define si `m` debe tender al mínimo del
   modelo o puede ser mayor.
3. **¿Entiende que evaluar mal lo perjudica?** Es el supuesto central del sistema de incentivos, y
   la interfaz no lo comunica.
4. **¿Cómo lee las propuestas hoy?** Ligado a E-06.
5. **¿Evalúa desde el teléfono o desde la computadora?** El responsable confirmó que el responsive
   importa, pero no de dónde viene el uso real.

---

## Fuentes

- [What is the Distributed Peer Review (DPR) — ESO Operations Helpdesk](https://support.eso.org/en-US/kb/articles/what-is-the-distributed-peer-review-dpr)
- [The Distributed Peer Review Experiment — The Messenger, ESO](https://doi.eso.org/10.18727/0722-6691/5147)
- [Distributed peer review passes test for allocating telescope slots — Physics Today](https://physicstoday.aip.org/news/distributed-peer-review-passes-test-for-allocating-telescope-slots)
- [ESO is Using a New System to Allocate Telescope Time — Universe Today](https://www.universetoday.com/articles/eso-is-using-a-new-system-to-allocate-telescope-time-its-working-well)
- [Telescope Time Without Tears: A Distributed Approach to Peer Review (Merrifield & Saari)](https://arxiv.org/pdf/0906.1943)
- [Distributed peer review enhanced with NLP and machine learning](https://arxiv.org/pdf/2004.04165)
- [EasyChair — Conference Management](https://easychair.org/conference_management)
- [Best peer review software (2026) — Fourwaves](https://fourwaves.com/blog/best-peer-review-software/)
- [Photo Contest App & Software — Gleam](https://gleam.io/solutions/photo-contest-app)
- [Online Photo Contest Software — Submittable](https://www.submittable.com/solutions/photo-contests)
- [Free Photo Contest Maker — Woobox](https://woobox.com/photocontests)
- [Create online photo contests — PollUnit](https://pollunit.com/en/photo-contest)
