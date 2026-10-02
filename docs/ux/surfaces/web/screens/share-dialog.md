---
name: share-dialog
surface: web
route: "/events/:eventId"
overlay: true
overlay_type: modal
triggered_by: event-detail
viewports: [desktop, mobile]
audiences: [participante, organizador]
fidelity: mid
status: diseñada
version: "1.0"
date: 2026-10-02
---

# Overlay: Compartir (O-14)

## Identidad

- **Audiencia primaria (co-primary):** [participante](../../../audiences/participante/research-context.md), [organizador](../../../audiences/organizador/research-context.md) (también desde S-05).
- **JTBD / Propósito:** pasar el enlace del evento con un toque y saber que se copió. Cubre C-17 y REQ-003 RF 21, AC 15 (diseño 1j; cierra D-07).
- **Viewports:**
  - **desktop** — diálogo de 480px; redes en grilla de 5.
  - **mobile** — diálogo a pantalla completa; redes en grilla de 3. Si el navegador tiene el menú nativo de compartir, se suma "Más opciones".

## Entrada y salida

**Entradas:** S-04 · "Compartir". S-05 · "Compartir" (Votación y Resultados).

**Salidas user-driven:** a la red elegida (otra pestaña); a la pantalla de origen · ×, Escape o click afuera.

**Salidas automáticas:** ninguna.

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | Eyebrow | label | — | content | ambos | — | "COMPARTIR" |
| 2 | Título | heading | h2 | content | ambos | — | Nombre del evento |
| 3 | Botón cerrar | button | tertiary | input | ambos | — | × |
| 4 | Qué verá | paragraph | caption | content | ambos | — | Qué ve quien abre el enlace |
| 5 | Campo enlace | text-input | default | input | ambos | — | Enlace de solo lectura |
| 6 | Botón copiar | button | primary | input | ambos | state_overrides: success→"✓ Copiado" | Copiar |
| 7 | Aviso copia fallida | alert | warning | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | La copia falló |
| 8 | Separador redes | label | — | content | ambos | — | "o enviarlo por" |
| 9 | Redes | list | — | navigation | ambos | — | WhatsApp, X, LinkedIn, Facebook, Email |
| 10 | Botón más opciones | button | secondary | input | solo mobile | oculto si no hay menú nativo | Menú de compartir del sistema |

## Layout por viewport

### desktop · 480px
- row `cabecera`
  - col 11/12: Eyebrow, Título
  - col 1/12: Botón cerrar
- Qué verá
- row `enlace`
  - col 8/12: Campo enlace
  - col 4/12: Botón copiar
- Aviso copia fallida
- Separador redes
- Redes

### mobile · 400px
- row `cabecera`
  - col 10/12: Eyebrow, Título
  - col 2/12: Botón cerrar
- Qué verá
- Campo enlace
- Botón copiar
- Aviso copia fallida
- Separador redes
- Redes
- Botón más opciones

## Contenido

### Eyebrow
- Texto/label: "COMPARTIR"

### Título
- Texto/label: nombre del evento

### Botón cerrar
- Texto/label: "×"
- Icono: close

### Qué verá
- Texto/label: Participación "Quien abra el enlace verá el evento y podrá inscribirse." · Votación "Quien abra el enlace verá el evento." · Resultados "Quien abra el enlace verá los resultados, aunque no tenga cuenta."

### Campo enlace
- Texto/label: "Enlace del evento" · valor = URL completa del evento
- Annotation: el enlace corto `/e/xxxx` del diseño está fuera de alcance; se muestra la URL real.

### Botón copiar
- Texto/label: "Copiar" → "✓ Copiado" durante 2 s
- Icono: link

### Aviso copia fallida
- Texto/label: "No pudimos copiar el enlace. Seleccionalo y copialo a mano."

### Separador redes
- Texto/label: "o enviarlo por"

### Redes
- Texto/label: "WhatsApp · X · LinkedIn · Facebook · Email"
- Annotation: logos reconocibles en lugar de emojis (1j). Email abre el cliente con asunto = nombre del evento.

### Botón más opciones
- Texto/label: "Más opciones"
- Icono: share

## Estados

### default
- Aplica: Sí
- Mensaje: —
- Cambios: ninguno.

### empty
- Aplica: No.

### loading
- Aplica: No — el enlace se arma en el cliente.

### error de validación
- Aplica: No.

### error de sistema / sin conexión
- Aplica: Sí — falla la copia al portapapeles (AC 15).
- Mensaje: "No pudimos copiar el enlace. Seleccionalo y copialo a mano."
- Cambios: Aviso copia fallida visible; Campo enlace queda con el texto seleccionado y el foco.

### success
- Aplica: Sí
- Mensaje: "✓ Copiado"
- Cambios: Botón copiar content="✓ Copiado" durante 2 s y vuelve a "Copiar".

### not found
- Aplica: No.

### estado terminal / readonly
- Aplica: No.

## Interacciones

**Eventos:**
- Botón copiar · on click → copia al portapapeles → success o error.
- Red · on click → abre la red en otra pestaña con el enlace.
- Botón más opciones · on click → menú nativo del sistema.
- Botón cerrar / Escape / click afuera → cierra.

**Validaciones:** ninguna.

**Feedback:** confirmación en el propio botón.

## Accesibilidad

- **Orden de foco:** Botón cerrar → Campo enlace → Botón copiar → redes → Botón más opciones.
- **Landmarks y jerarquía:** diálogo con `aria-labelledby` = Título (h2).
- **Foco y teclado:** foco inicial en Botón copiar; Escape cierra y devuelve el foco a "Compartir".
- **Propio de esta composición:** "✓ Copiado" y el aviso de falla se anuncian en región live; cada red tiene nombre accesible ("Compartir por WhatsApp").

## Decisiones y descartes

**Decisiones tomadas:**
- Reemplaza el menú `share-menu` de la v1.0 por el Dialog (1j, RF 5).
- Copiar arriba con confirmación (1j); aviso explícito si falla (RF 21, cierra D-07).
- "Qué verá" varía por etapa: el diseño solo cubría resultados.
- "Más opciones" solo en mobile: el menú nativo es el camino habitual en el teléfono.

**Alternativas descartadas:**
- Enlace corto `/e/xxxx`: fuera de alcance.

**Preguntas abiertas:** ninguna.
