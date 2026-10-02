---
name: not-found
surface: web
route: "*"
viewports: [desktop, mobile]
audiences: [participante]
fidelity: mid
status: diseñada
version: "1.0"
date: 2026-10-02
---

# Pantalla: Página no encontrada (S-13)

## Identidad

- **Audiencia primaria:** [participante](../../../audiences/participante/research-context.md) — y cualquier visitante.
- **JTBD / Propósito:** entender que lo que buscaba no está y tener una salida. Cubre REQ-003 RF 11 y AC 34 (un evento en Creación ajeno se ve igual que uno inexistente).
- **Viewports:**
  - **desktop** — mensaje centrado en una columna de 6/12.
  - **mobile** — mensaje a ancho completo.

## Entrada y salida

**Entradas:**
- Cualquier ruta inexistente. S-04 / S-05 cuando el evento no existe o está en Creación y no es del usuario.

**Salidas user-driven:**
- A S-02 · "Ir a Eventos". A S-01 · "Volver al inicio".

**Salidas automáticas:** ninguna.

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | header | header | — | layout | ambos | — | AppHeader |
| 2 | Estado vacío | empty-state | — | feedback | ambos | — | Mensaje |
| 3 | Botón ir a eventos | button | primary | input | ambos | — | Salida principal |
| 4 | Link inicio | link | — | navigation | ambos | — | Salida secundaria |
| 5 | footer | footer | — | layout | ambos | — | Pie |

## Layout por viewport

### desktop · 1200px
- row `centro`
  - col 3/12: (vacío)
  - col 6/12: Estado vacío, Botón ir a eventos, Link inicio
  - col 3/12: (vacío)

### mobile · 400px
- Estado vacío
- Botón ir a eventos
- Link inicio

## Contenido

### header
- Texto/label: "TELESCOPIO | Inicio · Eventos · Cómo funciona | sesión"

### Estado vacío
- Texto/label: "No encontramos esta página — Puede que el enlace esté mal escrito o que el evento ya no esté disponible."
- Icono: search

### Botón ir a eventos
- Texto/label: "Ir a Eventos"

### Link inicio
- Texto/label: "Volver al inicio"

### footer
- Texto/label: "Telescopio · evaluación distribuida entre pares"

## Estados

### default
- Aplica: Sí
- Mensaje: "No encontramos esta página"
- Cambios: ninguno.

### empty
- Aplica: No — la pantalla misma es un estado vacío.

### loading
- Aplica: No.

### error de validación
- Aplica: No.

### error de sistema / sin conexión
- Aplica: No.

### success
- Aplica: No.

### not found
- Aplica: Sí — es su estado base (ver default).

### estado terminal / readonly
- Aplica: No.

## Interacciones

**Eventos:**
- Botón ir a eventos · on click → `/events`.
- Link inicio · on click → `/`.

**Validaciones:** ninguna.

**Feedback:** ninguno.

## Accesibilidad

- **Orden de foco:** header → Botón ir a eventos → Link inicio.
- **Landmarks y jerarquía:** header / main / footer. h1 = título del Estado vacío.
- **Foco y teclado:** el foco inicial va al h1.
- **Propio de esta composición:** el título del documento cambia a "Página no encontrada · Telescopio".

## Decisiones y descartes

**Decisiones tomadas:**
- Nueva por REQ-003 (RF 11): la v1.0 mostraba la navbar sobre un área vacía.
- El mismo estado para un evento en Creación ajeno (AC 34): no revela que el evento existe.
- Copy que no distingue "no existe" de "no está disponible", por la misma razón.

**Alternativas descartadas:**
- Buscador en la 404: S-02 ya tiene búsqueda; una salida clara alcanza.

**Preguntas abiertas:** ninguna.
