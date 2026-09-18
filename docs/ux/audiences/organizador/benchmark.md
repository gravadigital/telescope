---
document: Benchmark — Organizador
version: "1.0"
date: 2026-09-18
status: Draft - Investigación de escritorio
audiencia: organizador
---

# Benchmark — Audiencia `organizador`

> Referencias mentales: productos que esta audiencia ya usa y de los que trae expectativas.
> Investigación de escritorio con fuentes citadas. **No reemplaza entrevistas con usuarios reales.**

## Alcance de esta investigación

Se buscó cómo resuelven **la conducción del proceso** las plataformas que el organizador
probablemente conoce: gestión de conferencias académicas (donde el rol equivalente es el *chair*) y
plataformas de concursos.

**Limitación declarada:** no se verificaron capturas ni detalles de interfaz. Lo que sigue describe
**capacidades documentadas**, no diseños concretos de pantalla. No se inventaron detalles visuales.

---

## Referencia principal: EasyChair (el rol de *chair*)

En uso desde 2002, es el sistema de referencia por ubicuidad. El rol de *chair* es el equivalente
más cercano al organizador de Telescopio.

### Capacidades del chair, documentadas

| Capacidad | Detalle |
|---|---|
| **Monitoreo del progreso de revisión** | Vista de "Review Information" con, por cada envío, **cuántas revisiones se completaron** y cuántos revisores fueron invitados |
| **Pestaña de revisiones** | Progreso de las revisiones bajo su responsabilidad |
| **Asignación automática por afinidad** | Los miembros del comité declaran sus áreas de expertise, y el chair **ejecuta un algoritmo** que asigna papers a revisores |
| **Gestión de deadlines** | Seguimiento de quién completó y **capacidad de contactar a los revisores** cuando se acerca el vencimiento |
| **Múltiples tracks** | Cada track con su comité y sus chairs, más un *superchair* que supervisa |

### Contraste con Telescopio

| Aspecto | EasyChair | Telescopio |
|---|---|---|
| Asignación | El chair **ejecuta** el algoritmo, sobre expertise declarado y *bids* | Automática, sin expertise ni preferencias. `expertise_match_score` existe en la base y **nunca se escribe** |
| Progreso por pieza | Cuántas revisiones tiene **cada** propuesta | ⚠️ **No existe.** Solo hay un agregado: `{n} de {m} participantes votaron` |
| Contactar evaluadores | Sí, el chair puede recordar el deadline | **No.** Los únicos emails son automáticos por cambio de etapa |
| Etapas | Configurables por conferencia | Cuatro fijas, unidireccionales |

**El contraste de "progreso por pieza" es el más relevante.** En EasyChair el chair ve qué envío
está corto de revisiones y actúa. En Telescopio ese dato **es exactamente el que determina si el
ranking es confiable** —una propuesta con pocas evaluaciones tiene un MBC menos sólido— y el
organizador no lo ve. Se agrava porque el algoritmo **puede dejar propuestas por debajo del mínimo
configurado sin avisar** (D-10 del PRD). `[fuente: benchmark]`

---

## Otras referencias académicas

### OpenReview

Revisión abierta y transparente; impulsa ICLR, NeurIPS y UAI. Su diferencia es la **visibilidad
pública del proceso**: revisiones y discusión son consultables.

**Qué sugiere:** hay un modelo donde la legitimidad del resultado se sostiene en que el proceso sea
auditable públicamente, no en la autoridad del comité. Telescopio sostiene la legitimidad en que el
cálculo sea determinístico y reproducible — **pero hoy no expone nada de eso al organizador**, que
solo ve el ranking final.

### Microsoft CMT

Gratuito para conferencias académicas, muy usado en computación. Como OpenReview, integra con
**TPMS** (Toronto Paper Matching System) para calcular afinidad por similitud de texto.

### Fourwaves

De las plataformas revisadas, es la que más se acerca en *features* de asignación: revisión simple
o doble ciego, **asignación automática con detección de conflictos**, **topes de carga de trabajo**,
matching por expertise y subcomités por track.

**Los dos conceptos que Telescopio ya tiene, y conviene nombrar igual:**
- **Detección de conflictos** — En Telescopio es la garantía de que nadie evalúa lo propio,
  validada en dos capas.
- **Tope de carga** — Es el parámetro `m` (`attachments_per_evaluator`).

`[fuente: benchmark]`

### Nota transversal de las tres

Ni OpenReview ni Microsoft CMT manejan registro, pagos ni sitio del evento: **funcionan mejor
cuando la revisión por pares es el único requisito.** Telescopio está en esa misma categoría, y es
una decisión de alcance razonable.

---

## Referencias de concursos

| Plataforma | Cómo conduce el proceso el organizador |
|---|---|
| **Woobox** | Flujo **multi-etapa**: las mejores por voto público pasan a puntaje de jurado con criterios ponderados |
| **Submittable** | Elige entre voto abierto o panel; puntaje configurable; **puede ocultar nombres** de autor o de jurado |
| **Gleam** | Selección al azar, por jurado o por voto público |
| **Launchpad6** | Jurado formal o voto popular |

**Diferencia estructural:** en todas, el organizador **elige el modelo de selección**. En
Telescopio el modelo es uno solo y no es configurable — lo configurable son sus parámetros
matemáticos.

**Qué significa:** un organizador que venga de este mundo va a buscar "¿cómo se eligen los
ganadores?" y va a encontrar, en cambio, un formulario que le pide `attachments_per_evaluator` y
dos umbrales de calidad. **La configuración de Telescopio expone el modelo matemático, no la
decisión de producto.** El valor recomendado que precarga el campo mitiga esto, pero no lo resuelve.
`[fuente: benchmark]`

---

## Expectativas que el organizador trae

Cada una es una **hipótesis a validar**, no una conclusión.

| # | Expectativa | Origen | Se cumple hoy en Telescopio |
|---|---|---|---|
| E-01 | Veo el progreso de la evaluación y puedo actuar si va lento | EasyChair | **Parcialmente.** Hay un agregado (`{n} de {m} votaron`) y estado por participante, pero **no por propuesta** |
| E-02 | Puedo recordarle el deadline a quien no completó | EasyChair | **No.** No hay forma de contactar participantes desde la interfaz |
| E-03 | Controlo cuándo abre y cierra cada etapa | Todas | **Sí.** Es el control central del producto |
| E-04 | Puedo corregir una asignación si algo salió mal | EasyChair (el chair reasigna) | **No.** Las asignaciones se generan una sola vez y no hay endpoint para rehacerlas |
| E-05 | Entiendo cómo se eligen los ganadores sin ser experto | Concursos | ⚠️ **Débil.** La pantalla pide parámetros matemáticos. Hay un recomendado precargado, pero el modelo no se explica |
| E-06 | Puedo leer las propuestas que recibí | Todas | ⚠️ **No.** El endpoint de descarga existe, sin auth, y el frontend no lo consume |
| E-07 | Sé que el resultado es defendible ante quien lo cuestione | Todas | **Parcialmente.** El cálculo es determinístico y reproducible, pero la interfaz no expone nada que permita auditarlo |

**E-04 merece atención.** En EasyChair el chair reasigna cuando hace falta. En Telescopio las
asignaciones son irreversibles desde la interfaz: si se generan con una configuración equivocada,
**no hay camino de vuelta**. Es una diferencia de expectativa con consecuencias serias, porque el
error se descubre tarde.

---

## Lo que NO sabemos

Agenda de investigación:

1. **¿El organizador entiende el modelo matemático, o solo quiere un resultado?** Determina si la
   pantalla de configuración debe explicar el modelo o esconderlo detrás del recomendado.
2. **¿Qué hace cuando la evaluación va lenta?** Hoy no tiene ninguna herramienta. Si en la práctica
   contacta a la gente por fuera del sistema, eso es un requerimiento.
3. **¿Necesita leer las propuestas?** Ligado a E-06 y a la pregunta abierta #5 del PRD.
4. **¿Con qué frecuencia organiza?** Alguien que organiza una convocatoria por año no recuerda nada
   entre una y otra; alguien que organiza seguido quiere velocidad. Son dos diseños distintos.
5. **¿Ante quién responde por el resultado?** Define cuánta auditabilidad hace falta exponer.

---

## Fuentes

- [EasyChair — Conference Management](https://easychair.org/conference_management)
- [Services Provided by EasyChair](https://easychair.org/docs/services)
- [Managing Peer Review using EasyChair 2024 (PDF)](https://dataforpolicy.org/wp-content/uploads/2023/11/Managing-Peer-Review-using-EasyChair-2024.pdf)
- [A Practical Guide for Chairs — Review Process by Stages, EAI](https://help.eai-conferences.org/faq/what-are-my-duties-3-44-3-2/)
- [EasyChair: Frequently Asked Questions](https://easychair.org/faq)
- [Best peer review software (2026) — Fourwaves](https://fourwaves.com/blog/best-peer-review-software/)
- [Best EasyChair alternatives for academic conferences — Fourwaves](https://fourwaves.com/blog/easychair-alternative/)
- [Free Photo Contest Maker — Woobox](https://woobox.com/photocontests)
- [Online Photo Contest Software — Submittable](https://www.submittable.com/solutions/photo-contests)
- [Photo Contest App & Software — Gleam](https://gleam.io/solutions/photo-contest-app)
- [Online Photo Contest Software — Launchpad6](https://www.launchpad6.com/photo-contest-software)
