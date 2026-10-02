---
name: event-detail
surface: web
route: "/events/:eventId"
viewports: [desktop, mobile]
audiences: [participante]
fidelity: mid
status: diseñada
version: "2.0"
date: 2026-10-02
---

# Pantalla: Detalle del evento (S-04)

## Identidad

- **Audiencia primaria:** [participante](../../../audiences/participante/research-context.md) — también visitante sin sesión.
- **JTBD / Propósito:** saber en qué etapa está el evento y hacer lo único que me toca ahora: inscribirme, subir mi propuesta, ordenar mis asignadas o ver el resultado. Las tres JTBD del participante pasan por acá. Cubre REQ-003 RF 18–21, 30–32 (diseños 1e, 1f, 1i, 2g).
- **Viewports:**
  - **desktop** — encabezado oscuro a todo el ancho; debajo, contenido principal (8/12) y columna lateral de detalles (4/12).
  - **mobile** — todo apilado: "Tu próximo paso" va primero, detalles y "Después" al final. La línea de etapas muestra solo la etapa actual con "N de 4".
- **Acceso:** público. El autor del evento es redirigido a S-05 (se mantiene).

## Entrada y salida

**Entradas:**
- Link compartido, S-01, S-02 (acción de fila o pendiente), S-11, O-13 / S-12 (acción de una notificación).

**Salidas user-driven:**
- A S-02 · "← Eventos".
- A S-07 · "Inscribirme al evento" sin sesión (`/login?next=/events/{id}`).
- A O-14 · "Compartir".
- A O-08 · "ver" en Participantes.
- A S-02 · "Ver eventos" en el banner de resultados. A S-08 · "Crear cuenta" (visitante).

**Salidas automáticas:**
- A S-05 si quien mira es el autor.
- A S-13 si el evento no existe o está en Creación y quien mira no es el autor.

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | header | header | — | layout | ambos | — | AppHeader |
| 2 | Volver | link | — | navigation | ambos | — | ← Eventos |
| 3 | Estado del evento | badge | — | content | ambos | — | StatusPill: etapa + cierre o situación personal |
| 4 | Título del evento | heading | h1 | content | ambos | — | Nombre |
| 5 | Meta del evento | label | — | content | ambos | — | Organiza · participantes · fecha |
| 6 | Botón compartir | button | secondary | input | ambos | — | Abre O-14 |
| 7 | Línea de etapas | progress-bar | — | feedback | ambos | viewport_overrides: mobile→solo etapa actual "N de 4" | StageTimeline con "ahora" |
| 8 | Eyebrow próximo paso | label | — | content | ambos | hidden_in_states: resultados | "TU PRÓXIMO PASO" |
| 9 | Título próximo paso | heading | h2 | content | ambos | — | Lo que toca ahora |
| 10 | Texto próximo paso | paragraph | body | content | ambos | — | Explicación breve |
| 11 | Requisitos | chips | — | content | ambos | visible_only_in_states: default | Formato · tamaño · cierre |
| 12 | Botón inscribirme | button | primary | input | ambos | visible_only_in_states: default | Inscripción |
| 13 | Zona de carga | section | — | input | ambos | visible_only_in_states: subir propuesta, error de validación | FileDropzone |
| 14 | Archivo elegido | card | — | content | ambos | visible_only_in_states: archivo elegido, propuesta enviada | FileChip: tipo, nombre, tamaño, Cambiar |
| 15 | Campo comentario | textarea | default | input | ambos | visible_only_in_states: archivo elegido | Comentario opcional con contador |
| 16 | Botón enviar propuesta | button | primary | input | ambos | visible_only_in_states: subir propuesta, archivo elegido, error de validación · state_overrides: subir propuesta→disabled | Enviar |
| 17 | Ayuda envío | paragraph | caption | content | ambos | visible_only_in_states: subir propuesta, archivo elegido | Hint del botón |
| 18 | Lista de ranking | list | — | input | ambos | visible_only_in_states: votar, ranking enviado, resultados | SortableRankList |
| 19 | Botón enviar ranking | button | primary | input | ambos | visible_only_in_states: votar, ranking enviado · state_overrides: ranking enviado→"Reenviar mi ranking", secondary | Enviar / reenviar |
| 20 | Ayuda ranking | paragraph | caption | content | ambos | visible_only_in_states: votar, ranking enviado | Se puede modificar hasta el cierre |
| 21 | Cómo cuenta tu voto | alert | info | feedback | ambos | visible_only_in_states: votar, ranking enviado | InfoCallout del mecanismo real |
| 22 | Aviso del paso | alert | warning | feedback | ambos | visible_only_in_states: pausado, cupo completo, sin propuesta en votación | Por qué no hay acción |
| 23 | Mensaje de acción | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Falla de una acción |
| 24 | Podio | card-list | — | content | ambos | visible_only_in_states: resultados | Top 3 |
| 25 | Ranking completo | table | — | content | ambos | visible_only_in_states: resultados | Posición · participante · propuesta · puntaje |
| 26 | Nota del puntaje | paragraph | caption | content | ambos | visible_only_in_states: resultados | Cómo se calcula |
| 27 | Tu progreso | list | — | content | ambos | visible_only_in_states: subir propuesta, archivo elegido, propuesta enviada, votar, ranking enviado | ProgressChecklist |
| 28 | Sobre el evento | paragraph | body | content | ambos | — | Descripción |
| 29 | Detalles | list | — | content | ambos | — | Organiza · cierre · participantes "ver" |
| 30 | Después | alert | info | feedback | ambos | hidden_in_states: resultados | Qué pasa en la próxima etapa |
| 31 | Banner otros eventos | card | — | content | ambos | visible_only_in_states: resultados | CtaBanner: eventos abiertos |
| 32 | CTA ver eventos | button | primary | input | ambos | visible_only_in_states: resultados | Ir a S-02 |
| 33 | footer | footer | — | layout | ambos | — | Pie |

## Layout por viewport

### desktop · 1200px
- Volver
- row `hero`
  - col 9/12: Estado del evento, Título del evento, Meta del evento
  - col 3/12: Botón compartir
- Línea de etapas
- row `cuerpo`
  - col 8/12: Eyebrow próximo paso, Título próximo paso, Texto próximo paso, Requisitos, Botón inscribirme, Zona de carga, Archivo elegido, Campo comentario, Botón enviar propuesta, Ayuda envío, Lista de ranking, Botón enviar ranking, Ayuda ranking, Aviso del paso, Mensaje de acción, Podio, Ranking completo, Nota del puntaje, Sobre el evento
  - col 4/12: Tu progreso, Cómo cuenta tu voto, Detalles, Después
- row `banner`
  - col 9/12: Banner otros eventos
  - col 3/12: CTA ver eventos

### mobile · 400px
- Volver
- Estado del evento
- Título del evento
- Meta del evento
- Botón compartir
- Línea de etapas
- Eyebrow próximo paso
- Título próximo paso
- Texto próximo paso
- Requisitos
- Botón inscribirme
- Zona de carga
- Archivo elegido
- Campo comentario
- Botón enviar propuesta
- Ayuda envío
- Lista de ranking
- Botón enviar ranking
- Ayuda ranking
- Aviso del paso
- Mensaje de acción
- Podio
- Ranking completo
- Nota del puntaje
- Tu progreso
- Cómo cuenta tu voto
- Sobre el evento
- Detalles
- Después
- Banner otros eventos
- CTA ver eventos

## Contenido

### header
- Texto/label: "TELESCOPIO | Inicio · Eventos · Cómo funciona | campana · menú de usuario" (sin sesión: "ES/EN · Iniciar sesión · Crear cuenta")

### Volver
- Texto/label: "← Eventos"

### Estado del evento
- Texto/label según situación: "Inscripción abierta · cierra en {n} días" · "Inscripto · falta tu archivo" · "Propuesta enviada" · "Te toca votar · cierra en {n} días" · "Ranking enviado" · "Votación en curso" · "Finalizado · resultados publicados" · "Evento pausado" · "Cancelado"

### Título del evento
- Texto/label: nombre del evento

### Meta del evento
- Texto/label: "Organiza {organizador} · {n} de {cupo} participantes" (en resultados: "· finalizó el {fecha}")

### Botón compartir
- Texto/label: "Compartir"
- Icono: share

### Línea de etapas
- Texto/label: "✓ Creación — Evento configurado · Participación · ahora — Inscribite y subí tu archivo · Votación — Evaluás a otros participantes · Resultados — Ranking final"
- Annotation: etapas completadas con ✓, la actual con "ahora" y su cierre ("Cierra {fecha}"). En mobile: "Participación · ahora · etapa 2 de 4".

### Eyebrow próximo paso
- Texto/label: "TU PRÓXIMO PASO"

### Título próximo paso
- Texto/label: default "Inscribite para participar" · subir propuesta "Subí tu propuesta" · propuesta enviada "Tu propuesta está enviada" · votar "Ordená las {n} propuestas" · ranking enviado "Tu ranking está enviado" · pausado "El evento está pausado" · cupo completo "El cupo está completo" · sin propuesta en votación "No participás de esta votación" · votación sin inscripción "La votación está en curso" · resultados "Así votó la comunidad"

### Texto próximo paso
- Texto/label: default "Después de inscribirte vas a poder subir tu propuesta. Podés reemplazarla hasta el cierre." · subir propuesta "Podés reemplazarla las veces que quieras hasta el {fecha de cierre}." · propuesta enviada "Podés reemplazarla hasta el {fecha de cierre}." · votar "Arriba la que te parece mejor. Abrí cada archivo antes de decidir." · ranking enviado "Podés modificarlo y reenviarlo hasta el cierre de la votación." · pausado "Por ahora no se puede inscribir ni subir propuestas. El organizador va a reanudar el evento." · cupo completo "No quedan lugares en este evento." · sin propuesta en votación "No subiste una propuesta durante la inscripción, así que no evaluás ni sos evaluado en este evento." · votación sin inscripción "Los participantes están evaluando las propuestas. Los resultados se publican al cerrar la votación." · resultados "{n} participantes · {m} evaluaciones"

### Requisitos
- Texto/label: "Imagen o documento · Máx. 10 MB · Cierre: {fecha}"

### Botón inscribirme
- Texto/label: "Inscribirme al evento"
- Annotation: sin sesión lleva a `/login?next=/events/{id}`.

### Zona de carga
- Texto/label: "Arrastrá tu archivo acá o elegilo desde tu equipo" · "JPG, PNG, GIF, WebP, PDF, TXT, DOC, DOCX · hasta 10 MB"
- Icono: upload
- Annotation: valida tipo y tamaño al elegir; el motivo de rechazo se muestra dentro de la zona.

### Archivo elegido
- Texto/label: "{TIPO} · {nombre} · {tamaño} · listo para enviar" · acción "Cambiar" (en propuesta enviada: "Enviada el {fecha}" · "Reemplazar archivo")

### Campo comentario
- Texto/label: "Comentario (opcional)" · contador "{n} / 1000" · ayuda "Lo verán los evaluadores junto a tu archivo."

### Botón enviar propuesta
- Texto/label: "Enviar propuesta" (al reemplazar: "Enviar nueva versión")

### Ayuda envío
- Texto/label: sin archivo "Elegí un archivo para continuar" · con archivo "Vas a poder reemplazarlo hasta el cierre"

### Lista de ranking
- Texto/label: por propuesta: posición, "{nombre} · {TIPO} · {tamaño}", "Ver archivo", etiqueta de posición ("La mejor" / "Intermedia" / "La que menos"), botones ↑ ↓
- Annotation: mover intercambia con la vecina, así la posición siempre es única. Cada cambio guarda el borrador. En resultados se muestra sin botones (solo lectura).

### Botón enviar ranking
- Texto/label: "Enviar mi ranking" (ranking enviado: "Reenviar mi ranking", habilitado solo si el orden cambió)

### Ayuda ranking
- Texto/label: "Podés modificarlo hasta el cierre de la votación." · tras guardar el borrador: "Borrador guardado"

### Cómo cuenta tu voto
- Texto/label: "¿Cómo cuenta tu voto? — Tu orden se compara con el de los demás evaluadores. Si evaluás con coherencia, tu propia propuesta sube posiciones en el ranking final; si no, baja."
- Annotation: copy corregido al modelo (REQ-003 L-6, RF 32): no dice que el voto pese más.

### Aviso del paso
- Texto/label: el texto de Texto próximo paso de la situación (pausado, cupo completo, sin propuesta en votación), en formato de aviso.

### Mensaje de acción
- Texto/label: "No pudimos inscribirte. Probá de nuevo." · "No pudimos enviar tu propuesta. Probá de nuevo." · "No pudimos abrir el archivo. Probá de nuevo." · "No pudimos enviar tu ranking. Probá de nuevo." · "No pudimos guardar el borrador. Tus cambios siguen en pantalla."

### Podio
- Texto/label: posiciones 1, 2 y 3 con participante, propuesta y "{puntaje} pts"
- Annotation: puntaje = MBC × 10 con un decimal, separador según idioma ("8,9 pts" / "8.9 pts"). Orden del ranking ajustado (FG-5 sigue abierto).

### Ranking completo
- Texto/label: columnas "POSICIÓN · PARTICIPANTE · PROPUESTA · PUNTAJE"
- Annotation: desde la posición 4. En mobile, filas apiladas con etiqueta. Si el usuario participó, su fila se resalta con "Vos".

### Nota del puntaje
- Texto/label: "El puntaje combina los rankings de todos los participantes, en una escala de 0 a 10. La propuesta de quien evaluó con coherencia sube posiciones; la de quien no, baja."

### Tu progreso
- Texto/label: "Tu progreso — ✓ Inscripción · Confirmada {fecha} | 2 Subir propuesta · {Pendiente · cierra en n días / Enviada} | 3 Votar · {Te avisamos cuando empiece / Pendiente / Enviado} | 4 Ver resultados"

### Sobre el evento
- Texto/label: "Sobre el evento" + descripción

### Detalles
- Texto/label: "Detalles — Organiza {organizador} · Cierre {etapa} {fecha} · Participantes {n} / {cupo} · ver" (en resultados: "Evaluaciones {m} · Finalizó {fecha}")

### Después
- Texto/label: participación "DESPUÉS — Al cerrar la inscripción, el organizador abre la votación y te asigna propuestas para evaluar." · votación "DESPUÉS — Al cerrar la votación se publica el ranking final para todos."

### Banner otros eventos
- Texto/label: "¿TE GUSTÓ? — Hay {n} eventos con inscripción abierta ahora." (visitante: "+ Creá tu cuenta para participar en el próximo.")
- Annotation: si no hay eventos abiertos el banner no se muestra.

### CTA ver eventos
- Texto/label: "Ver eventos" (visitante: además "Crear cuenta", secondary)

### footer
- Texto/label: "Telescopio · evaluación distribuida entre pares"

## Estados

### default
- Aplica: Sí — Participación, no inscripto (o sin sesión).
- Mensaje: —
- Cambios: Requisitos y Botón inscribirme visibles.

### subir propuesta
- parent_state: default
- Aplica: Sí — inscripto sin propuesta.
- Mensaje: —
- Cambios: Zona de carga visible; Botón enviar propuesta variant=disabled; Estado del evento "Inscripto · falta tu archivo".

### archivo elegido
- parent_state: subir propuesta
- Aplica: Sí
- Mensaje: —
- Cambios: Zona de carga oculta; Archivo elegido y Campo comentario visibles; Botón enviar propuesta variant=primary.

### propuesta enviada
- parent_state: default
- Aplica: Sí
- Mensaje: "Recibimos tu propuesta."
- Cambios: Archivo elegido con "Reemplazar archivo"; Tu progreso con paso 2 ✓.

### votar
- parent_state: default
- Aplica: Sí — Votación, con asignación.
- Mensaje: —
- Cambios: Lista de ranking, Botón enviar ranking, Ayuda ranking y Cómo cuenta tu voto visibles.

### ranking enviado
- parent_state: votar
- Aplica: Sí
- Mensaje: "Recibimos tu ranking."
- Cambios: Botón enviar ranking content="Reenviar mi ranking", variant=secondary hasta que cambie el orden.

### sin propuesta en votación
- parent_state: default
- Aplica: Sí — inscripto sin propuesta en Votación (AC 41).
- Mensaje: "No participás de esta votación"
- Cambios: Aviso del paso visible; Lista de ranking oculta.

### pausado
- parent_state: default
- Aplica: Sí (AC 43)
- Mensaje: "El evento está pausado"
- Cambios: Estado del evento "Evento pausado"; Botón inscribirme, Zona de carga, Botón enviar propuesta y Botón enviar ranking ocultos; Aviso del paso visible.

### cupo completo
- parent_state: default
- Aplica: Sí (AC 44)
- Mensaje: "El cupo está completo"
- Cambios: Botón inscribirme oculto; Aviso del paso visible.

### votación sin inscripción
- parent_state: default
- Aplica: Sí — Votación, visitante o usuario no inscripto.
- Mensaje: "La votación está en curso"
- Cambios: sin acciones; Después visible.

### resultados
- parent_state: default
- Aplica: Sí — Resultados, con o sin sesión (AC 14).
- Mensaje: —
- Cambios: Podio, Ranking completo, Nota del puntaje, Banner otros eventos y CTA ver eventos visibles; Lista de ranking en solo lectura si el usuario votó (AC 40); Después oculto.

### empty
- Aplica: Sí — resultados sin ranking calculado.
- Mensaje: "Los resultados todavía no están disponibles."
- Cambios: Podio y Ranking completo ocultos.

### loading
- Aplica: Sí
- Mensaje: "Cargando evento…"
- Cambios: encabezado y cuerpo como skeleton. Por botón: "Inscribiendo…", "Enviando propuesta…", "Enviando ranking…".

### error de validación
- Aplica: Sí
- Mensaje: "El archivo supera los 10 MB." / "Ese formato no está permitido. Usá JPG, PNG, GIF, WebP, PDF, TXT, DOC o DOCX."
- Cambios: Zona de carga state=error con el motivo; Botón enviar propuesta variant=disabled.

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: carga: "No pudimos cargar el evento." + "Reintentar" y "Ir a Eventos" · acción: el texto correspondiente de Mensaje de acción
- Cambios: Mensaje de acción visible junto al bloque que falló; lo cargado (archivo elegido, orden) se conserva.

### success
- Aplica: Sí — se expresa como cambio de estado (propuesta enviada / ranking enviado), con un aviso breve que se cierra solo.

### not found
- Aplica: Sí — se resuelve navegando a S-13 (evento inexistente o en Creación ajeno, AC 34).

### estado terminal / readonly
- Aplica: Sí — evento cancelado: Estado del evento "Cancelado", Título próximo paso "Este evento fue cancelado", sin acciones.

## Interacciones

**Eventos:**
- Botón inscribirme · on click → con sesión inscribe y pasa a "subir propuesta"; sin sesión → `/login?next=/events/{id}`.
- Zona de carga · on click / drop → abre el selector o toma el archivo, valida.
- "Cambiar" en Archivo elegido · on click → vuelve a la zona de carga.
- Botón enviar propuesta · on click → sube el archivo con el comentario.
- "Ver archivo" en Lista de ranking · on click → descarga autenticada y abre en otra pestaña.
- ↑ / ↓ en Lista de ranking · on click → intercambia con la vecina; guarda borrador (debounce).
- Botón enviar ranking · on click → envía; si ya estaba enviado, lo reemplaza.
- Botón compartir · on click → abre O-14.
- "ver" en Detalles · on click → abre O-08.

**Validaciones:**
- Zona de carga · tamaño > 10 MB → "El archivo supera los 10 MB."
- Zona de carga · tipo fuera de JPG, PNG, GIF, WebP, PDF, TXT, DOC, DOCX → "Ese formato no está permitido. Usá JPG, PNG, GIF, WebP, PDF, TXT, DOC o DOCX."
- Campo comentario · > 1000 caracteres → el contador bloquea el ingreso.

**Feedback:** cada acción exitosa cambia el estado del bloque "Tu próximo paso", actualiza "Tu progreso" y muestra un aviso breve ("Recibimos tu propuesta." / "Recibimos tu ranking.").

## Accesibilidad

- **Orden de foco:** header → Volver → Botón compartir → Línea de etapas → acción de Tu próximo paso → Tu progreso → Detalles ("ver").
- **Landmarks y jerarquía:** header / main / aside (columna lateral) / footer. h1 = Título del evento; h2 = Título próximo paso, "Sobre el evento", "Detalles".
- **Foco y teclado:** O-14 y O-08 atrapan el foco y lo devuelven al botón que los abrió. En Lista de ranking, tras mover una propuesta el foco sigue al botón de la misma propuesta.
- **Propio de esta composición:** el cambio de posición se anuncia en una región live ("{nombre} pasó a la posición {n}"); el rechazo de archivo y el guardado del borrador también.

## Decisiones y descartes

**Decisiones tomadas:**
- Reescrita por REQ-003 sobre 1e, 1f, 1i y 2g: una sola pantalla con un bloque "Tu próximo paso" que cambia según etapa y rol; el resto de la pantalla es estable.
- La confirmación del archivo pasa del modal (O-06) a la zona de carga: se ve qué se va a enviar sin interrumpir.
- La propuesta se puede reemplazar hasta el cierre (RF 19); el ranking se puede reenviar (RF 31).
- Lista ordenable ↑↓ en vez de selects: hace imposible repetir posiciones (2g).
- Resultados públicos con podio y escala 0–10 (L-7, L-8). 1g descartada.
- Copy del mecanismo corregido al modelo (L-6).
- Comentario hasta 1000 caracteres, no 500 (L-9).
- Copy neutro: "Inscripto" en vez de "Estás inscripta" (L-11).
- Desktop en dos columnas (8/12 + 4/12): el paso principal no compite con los detalles. Mobile pone el paso primero porque es lo único que hay que hacer.
- S-04 ya no ofrece avanzar etapa al organizador: la regla vive solo en S-05 (cierra D-05).

**Alternativas descartadas:**
- "Contactar al organizador" (1e): fuera de alcance.
- "La votación cierra sola": el cierre automático está fuera de alcance; el copy no lo promete.
- Mostrar el `Q_i` individual: no lo pide el REQ.

**Preguntas abiertas:**
- ¿Se muestra al participante en qué puesto quedó su propia propuesta dentro del podio/lista (resaltado "Vos")? Se propone que sí.
