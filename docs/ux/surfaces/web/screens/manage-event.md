---
name: manage-event
surface: web
route: "/events/:eventId/manage"
viewports: [desktop, mobile]
audiences: [organizador]
fidelity: mid
status: diseñada
version: "2.0"
date: 2026-10-02
---

# Pantalla: Gestión del evento (S-05)

## Identidad

- **Audiencia primaria:** [organizador](../../../audiences/organizador/research-context.md)
- **JTBD / Propósito:** saber cómo va el evento y dar el siguiente paso sabiendo qué consecuencias tiene: abrir la inscripción, abrir la votación, publicar, recordar a los pendientes. Cubre JTBD-01, 02 y 03 del organizador y REQ-003 RF 17, 22–29 (diseños 2a, 2c, 2e, más la gestión en Resultados).
- **Viewports:**
  - **desktop** — encabezado oscuro; métricas en fila; debajo, tabla de participantes (8/12) y columna con el próximo paso y el resumen (4/12).
  - **mobile** — el próximo paso va primero, después las métricas en grilla de 2, la tabla apilada y las acciones secundarias al final.
- **Acceso:** con sesión y autor del evento. Sin sesión → `/login?next=…`; otro usuario → estado "sin permiso" (AC 32).

## Entrada y salida

**Entradas:**
- S-03 · "Crear evento" (éxito). S-02 / S-11 · "Gestionar". Redirect desde S-04. O-13 / S-12 · acción de una notificación de organizador.

**Salidas user-driven:**
- A S-11 · "← Mis eventos".
- A O-15, O-16, O-17 · botón del próximo paso según etapa.
- A O-07 · "editar" en la línea de etapas. A O-18 · "Editar datos". A O-19 · recordatorio. A O-14 · "Compartir".

**Salidas automáticas:**
- A S-07 sin sesión. A S-13 si el evento no existe.

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | header | header | — | layout | ambos | — | AppHeader |
| 2 | Volver | link | — | navigation | ambos | hidden_in_states: permiso denegado | ← Mis eventos |
| 3 | Estado del evento | badge | — | content | ambos | hidden_in_states: permiso denegado | StatusPill: etapa / visibilidad / cierre |
| 4 | Rol | badge | — | content | ambos | hidden_in_states: permiso denegado | "Organizás este evento" |
| 5 | Título del evento | heading | h1 | content | ambos | — | Nombre (en permiso denegado: título del aviso) |
| 6 | Meta del evento | label | — | content | ambos | hidden_in_states: permiso denegado | Organizador · creado el |
| 7 | Botón editar datos | button | secondary | input | ambos | visible_only_in_states: default, participación | Abre O-18 |
| 8 | Botón compartir | button | secondary | input | ambos | hidden_in_states: default, permiso denegado | Abre O-14 |
| 9 | Línea de etapas | progress-bar | — | feedback | ambos | hidden_in_states: permiso denegado · viewport_overrides: mobile→solo etapa actual | StageTimeline con cierre editable |
| 10 | Métrica inscriptos | card | — | content | ambos | hidden_in_states: default, permiso denegado | StatTile "Inscriptos" |
| 11 | Métrica archivos | card | — | content | ambos | visible_only_in_states: participación | StatTile "Archivos recibidos" |
| 12 | Métrica rankings | card | — | content | ambos | visible_only_in_states: votación | StatTile "Rankings enviados" + barra |
| 13 | Métrica cierre | card | — | content | ambos | visible_only_in_states: participación, votación | StatTile días al cierre |
| 14 | Título participantes | heading | h2 | content | ambos | hidden_in_states: permiso denegado | "Participantes" |
| 15 | Botón recordar | button | secondary | input | ambos | visible_only_in_states: participación, votación, pausado, error de sistema / sin conexión · oculto si no hay pendientes | Abre O-19 |
| 16 | Tabla de participantes | table | — | content | ambos | hidden_in_states: default, empty, permiso denegado, error de sistema / sin conexión · viewport_overrides: mobile→filas apiladas | ParticipantsTable |
| 17 | Sin inscriptos | empty-state | — | feedback | ambos | visible_only_in_states: default, empty | Todavía no hay inscriptos |
| 18 | Error de bloque | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Error con reintento (REQ-001) |
| 19 | Eyebrow próximo paso | label | — | content | ambos | hidden_in_states: resultados, permiso denegado | "PRÓXIMO PASO" |
| 20 | Título próximo paso | heading | h2 | content | ambos | hidden_in_states: resultados, permiso denegado | Acción de la etapa |
| 21 | Texto próximo paso | paragraph | body | content | ambos | hidden_in_states: resultados, permiso denegado | Qué pasa al ejecutarla |
| 22 | Checklist de creación | list | — | content | ambos | visible_only_in_states: default | Qué está listo |
| 23 | Consecuencias | alert | warning | feedback | ambos | visible_only_in_states: participación, votación | Quién queda afuera / cuántos faltan |
| 24 | Botón próximo paso | button | primary | input | ambos | hidden_in_states: resultados, permiso denegado · state_overrides: votación→secondary; error de sistema / sin conexión→disabled | Abre O-15 / O-16 / O-17 |
| 25 | Configuración aplicada | alert | info | feedback | ambos | visible_only_in_states: votación, resultados | Parámetros de la votación |
| 26 | Resumen | list | — | content | ambos | visible_only_in_states: default | Participantes · archivos · cierre |
| 27 | Después | alert | info | feedback | ambos | visible_only_in_states: default | Qué pasa en Participación |
| 28 | Podio | card-list | — | content | ambos | visible_only_in_states: resultados | Top 3, igual que S-04 |
| 29 | Ranking completo | table | — | content | ambos | visible_only_in_states: resultados | Lista completa, igual que S-04 |
| 30 | Botón pausar | button | tertiary | input | ambos | visible_only_in_states: default, participación, votación, pausado · state_overrides: pausado→"Reanudar evento" | Acción secundaria |
| 34 | Aviso de éxito | toast | success | feedback | ambos | visible_only_in_states: success | Confirmación tras un diálogo |
| 31 | Aviso pausado | alert | warning | feedback | ambos | visible_only_in_states: pausado | El evento está pausado |
| 32 | Aviso sin permiso | empty-state | — | feedback | ambos | visible_only_in_states: permiso denegado | No es el autor |
| 33 | footer | footer | — | layout | ambos | — | Pie |

## Layout por viewport

### desktop · 1200px
- Volver
- row `hero`
  - col 8/12: Estado del evento, Rol, Título del evento, Meta del evento
  - col 2/12: Botón editar datos
  - col 2/12: Botón compartir
- Aviso de éxito
- Línea de etapas
- Aviso pausado
- row `metricas`
  - col 3/12: Métrica inscriptos
  - col 3/12: Métrica archivos
  - col 3/12: Métrica rankings
  - col 3/12: Métrica cierre
- row `cuerpo`
  - col 8/12: Título participantes, Botón recordar, Tabla de participantes, Sin inscriptos, Error de bloque, Podio, Ranking completo
  - col 4/12: Eyebrow próximo paso, Título próximo paso, Texto próximo paso, Checklist de creación, Consecuencias, Botón próximo paso, Configuración aplicada, Resumen, Después, Botón pausar
- Aviso sin permiso

### mobile · 400px
- Volver
- Estado del evento
- Rol
- Título del evento
- Meta del evento
- Aviso de éxito
- Línea de etapas
- Aviso pausado
- Eyebrow próximo paso
- Título próximo paso
- Texto próximo paso
- Checklist de creación
- Consecuencias
- Botón próximo paso
- row `metricas-1`
  - col 6/12: Métrica inscriptos
  - col 6/12: Métrica archivos
- row `metricas-2`
  - col 6/12: Métrica rankings
  - col 6/12: Métrica cierre
- Título participantes
- Botón recordar
- Tabla de participantes
- Sin inscriptos
- Error de bloque
- Podio
- Ranking completo
- Configuración aplicada
- Resumen
- Después
- Botón editar datos
- Botón compartir
- Botón pausar
- Aviso sin permiso

## Contenido

### header
- Texto/label: "TELESCOPIO | Inicio · Eventos · Cómo funciona | campana · menú de usuario"

### Volver
- Texto/label: "← Mis eventos"

### Estado del evento
- Texto/label: creación "Borrador · no visible" · participación "Inscripción abierta · cierra en {n} días" · votación "Votación en curso · cierra en {n} días" · resultados "Finalizado · resultados publicados" · pausado "Pausado"

### Rol
- Texto/label: "Organizás este evento"

### Título del evento
- Texto/label: nombre del evento (permiso denegado: "No tenés permiso para gestionar este evento")

### Meta del evento
- Texto/label: "{organizador} · creado el {fecha}"

### Botón editar datos
- Texto/label: "Editar datos"
- Icono: edit

### Botón compartir
- Texto/label: participación "Copiar enlace de invitación" · votación y resultados "Compartir"
- Icono: share

### Línea de etapas
- Texto/label: "Creación · {fecha o 'ahora — Configurás el evento'} | Participación · {'Sin fecha de cierre' / 'ahora — Cierra {fecha} · editar' / '{n} archivos recibidos'} | Votación · {'—' / 'ahora — Cierra {fecha} · editar'} | Resultados · {'—' / 'Publicados'}"
- Annotation: "editar" solo en la etapa actual (Participación o Votación); abre O-07.

### Métrica inscriptos
- Texto/label: "Inscriptos · {n} / {cupo}"

### Métrica archivos
- Texto/label: "Archivos recibidos · {n} / {inscriptos}"

### Métrica rankings
- Texto/label: "Rankings enviados · {n} de {m}" + barra de progreso

### Métrica cierre
- Texto/label: "Cierre · {n} días" (último día: "Cierra hoy")

### Título participantes
- Texto/label: "Participantes"

### Botón recordar
- Texto/label: participación "Recordar a quienes no subieron archivo ({n})" · votación "Enviar recordatorio a {n} pendientes"
- Icono: bell
- Annotation: no se muestra con 0 pendientes (AC 47). Tras enviar queda deshabilitado con "Recordatorio enviado" hasta recargar.

### Tabla de participantes
- Texto/label: participación: columnas "NOMBRE · EMAIL · ARCHIVO · INSCRIPCIÓN" (archivo: "✓ {nombre de archivo}" o "Falta archivo") · votación: "NOMBRE · EMAIL · ARCHIVO · VOTO" (voto: "✓ Enviado" / "Pendiente" / "No participa" para quien no subió propuesta)
- Annotation: en mobile cada fila se apila con su etiqueta.

### Sin inscriptos
- Texto/label: "Todavía no hay inscriptos" · creación: "Cuando abras la inscripción vas a poder compartir el enlace." · participación: "Compartí el enlace de invitación para sumar participantes." + "Copiar enlace de invitación"

### Error de bloque
- Texto/label: "No pudimos cargar los participantes." / "No pudimos cargar las estadísticas de votación." · acción "Reintentar"

### Eyebrow próximo paso
- Texto/label: "PRÓXIMO PASO"

### Título próximo paso
- Texto/label: creación "Abrí la inscripción" · participación "Pasar a votación" · votación "Publicar resultados"

### Texto próximo paso
- Texto/label: creación "Mientras esté en creación, nadie puede ver ni sumarse al evento. Revisá que esté todo listo:" · participación "Se cierra la inscripción y cada participante con propuesta recibe propuestas de otros para evaluar." · votación "Recomendado cuando todos hayan votado o al llegar el cierre ({fecha})."

### Checklist de creación
- Texto/label: "✓ Nombre y descripción · ✓ Cupo: {n} participantes · ○ Fecha de cierre de inscripción (la definís al abrir)"

### Consecuencias
- Texto/label: participación "{n} participante(s) todavía no subió su archivo y no va a evaluar ni ser evaluado." (con menos de 3 propuestas: "Se necesitan al menos 3 participantes con propuesta para abrir la votación. Hoy hay {n}.") · votación "Faltan {n} de {m} rankings."
- Annotation: plurales con el catálogo i18n.

### Botón próximo paso
- Texto/label: creación "Abrir inscripción →" · participación "Configurar y abrir votación →" · votación "Cerrar votación y publicar"
- Annotation: en votación es de contorno mientras falten rankings, para no invitar a cerrar antes de tiempo (2e). Con datos sin verificar (error de bloque) queda deshabilitado.

### Configuración aplicada
- Texto/label: "Configuración aplicada — {m} propuestas por evaluador · mínimo {k} evaluaciones por archivo · ajustes de calidad {recomendados / personalizados}"

### Resumen
- Texto/label: "Resumen — Participantes 0 / {cupo} · Archivos 0 · Cierre inscripción: Sin definir"

### Después
- Texto/label: "Después — Los participantes se inscriben y suben su archivo hasta la fecha de cierre que definas."

### Podio
- Texto/label: igual que S-04: posiciones 1–3 con "{puntaje} pts"

### Ranking completo
- Texto/label: "POSICIÓN · PARTICIPANTE · PROPUESTA · PUNTAJE"

### Botón pausar
- Texto/label: "Pausar evento" (pausado: "Reanudar evento")
- Annotation: abre un Dialog de confirmación: "¿Pausar el evento? — Mientras esté pausado nadie puede inscribirse, subir propuestas ni votar." · "Cancelar" / "Pausar evento".

### Aviso de éxito
- Texto/label: el mensaje de success de la acción (ver Estados → success)
- Annotation: se cierra solo a los 5 s.

### Aviso pausado
- Texto/label: "El evento está pausado. Los participantes no pueden inscribirse, subir propuestas ni votar hasta que lo reanudes."

### Aviso sin permiso
- Texto/label: "Solo quien creó el evento puede gestionarlo." · acción "Ir a Eventos"

### footer
- Texto/label: "Telescopio · evaluación distribuida entre pares"

## Estados

### default
- Aplica: Sí — etapa Creación (2a).
- Mensaje: —
- Cambios: Checklist de creación, Resumen, Después y Sin inscriptos visibles; métricas y tabla ocultas.

### participación
- parent_state: default
- Aplica: Sí (2c)
- Mensaje: —
- Cambios: Métricas inscriptos / archivos / cierre, Tabla de participantes, Botón recordar y Consecuencias visibles. Con menos de 3 propuestas, Botón próximo paso sigue habilitado: O-16 explica el bloqueo.

### votación
- parent_state: default
- Aplica: Sí (2e)
- Mensaje: —
- Cambios: Métrica rankings y Configuración aplicada visibles; Botón próximo paso variant=secondary mientras falten rankings, primary cuando están todos; Botón editar datos oculto (AC 46).

### resultados
- parent_state: default
- Aplica: Sí
- Mensaje: —
- Cambios: Podio y Ranking completo visibles; Tabla de participantes oculta; sin próximo paso; Botón pausar oculto.

### pausado
- parent_state: default
- Aplica: Sí
- Mensaje: "El evento está pausado."
- Cambios: Aviso pausado visible; Botón próximo paso y Botón recordar variant=disabled; Botón pausar content="Reanudar evento".

### empty
- Aplica: Sí — Participación sin inscriptos.
- Mensaje: "Todavía no hay inscriptos"
- Cambios: Tabla de participantes oculta; Sin inscriptos visible con "Copiar enlace de invitación".

### loading
- Aplica: Sí
- Mensaje: "Cargando gestión…"
- Cambios: encabezado, métricas y tabla como skeleton. Por acción: "Abriendo…", "Publicando…", "Enviando recordatorio…".

### error de validación
- Aplica: No — las validaciones viven en los diálogos O-07, O-15–O-19.

### error de sistema / sin conexión
- Aplica: Sí (AC 50, REQ-001)
- Mensaje: "No pudimos cargar los participantes."
- Cambios: Error de bloque en el bloque que falló, con "Reintentar"; Tabla de participantes oculta (nunca vacía ni con datos inventados); Botón próximo paso y Botón recordar variant=disabled hasta que la recarga funcione.

### success
- Aplica: Sí
- Mensaje: "Inscripción abierta. Compartí el enlace para sumar participantes." · "Votación abierta. Se asignaron las propuestas." · "Resultados publicados." · "Recordatorio enviado a {n} participantes." · "Datos actualizados." · "Cierre actualizado."
- Cambios: Aviso de éxito visible arriba de la línea de etapas; la pantalla pasa al estado de la nueva etapa.

### not found
- Aplica: Sí — evento inexistente → S-13.

### permiso denegado
- parent_state: default
- Aplica: Sí (AC 32)
- Mensaje: "No tenés permiso para gestionar este evento"
- Cambios: solo Título del evento y Aviso sin permiso visibles.

### estado terminal / readonly
- Aplica: Sí — Resultados es terminal (sin acciones de avance); evento cancelado: Estado del evento "Cancelado" y sin acciones.

## Interacciones

**Eventos:**
- Botón próximo paso · on click → creación: O-15 · participación: O-16 · votación: O-17.
- "editar" en Línea de etapas · on click → O-07.
- Botón editar datos · on click → O-18.
- Botón recordar · on click → O-19.
- Botón compartir · on click → O-14 (en participación copia el enlace directamente con "✓ Copiado").
- Botón pausar · on click → Dialog de confirmación → pausa / reanuda.
- "Reintentar" · on click → vuelve a pedir el bloque.

**Validaciones:** ninguna en la pantalla; viven en los diálogos.

**Feedback:** tras cada diálogo exitoso, aviso de success y recarga de la gestión. Ya no hay acción para volver de Votación a Participación (AC 39).

## Accesibilidad

- **Orden de foco:** header → Volver → Botón editar datos → Botón compartir → Línea de etapas ("editar") → Botón próximo paso → Botón recordar → Tabla de participantes → Botón pausar.
- **Landmarks y jerarquía:** header / main / aside (próximo paso y resumen) / footer. h1 = Título del evento; h2 = Título participantes, Título próximo paso.
- **Foco y teclado:** O-07, O-14–O-19 atrapan el foco y lo devuelven al disparador. Tras un cambio de etapa el foco va al Título próximo paso de la nueva etapa.
- **Propio de esta composición:** en desktop el próximo paso está a la derecha pero en el DOM va antes de la tabla, para que el orden de lectura coincida con la importancia. Los avisos de success se anuncian en región live.

## Decisiones y descartes

**Decisiones tomadas:**
- Reescrita por REQ-003 sobre 2a, 2c y 2e: el título es el nombre del evento y el avance es el paso destacado, no un botón más (2a).
- "Organizás este evento" en vez de "Sos organizadora": copy neutro (L-11).
- Las reglas de avance viven solo acá (cierra D-05); S-04 ya no avanza etapas.
- Publicar con rankings faltantes se permite con aviso (L-1); el botón es de contorno mientras falten.
- La consecuencia de no subir archivo se dice antes de abrir la votación (L-2, AC 18).
- Error por bloque con reintento y avance deshabilitado: REQ-001 (AC 50).
- "← Mis eventos" reemplaza a "Back to Event Details": elimina el loop de la v1.0.
- Gestión en Resultados reutiliza Podio y Ranking completo de S-04 (no hay diseño propio).
- Mobile pone el próximo paso primero: es lo que se viene a hacer; las métricas en grilla de 2 entran a 400px.

**Alternativas descartadas:**
- "Ver página pública" (2a, 2c, 2e): con el redirect actual el autor no puede ver S-04; queda como pregunta abierta en el product-map.
- Botón de cancelar evento: sigue fuera de alcance (C-16).

**Preguntas abiertas:**
- ¿Cómo ve el autor su evento como lo ven los demás? (ver product-map).
