---
name: complete-profile
surface: web
route: "/complete-profile"
viewports: [desktop, mobile]
audiences: [participante, organizador]
fidelity: mid
status: diseñada
version: "1.0"
date: 2026-10-02
---

# Pantalla: Completar perfil (S-10)

## Identidad

- **Audiencia primaria (co-primary):** [participante](../../../audiences/participante/research-context.md), [organizador](../../../audiences/organizador/research-context.md).
- **JTBD / Propósito:** elegir el nombre con el que aparece en los eventos después de entrar con Google por primera vez, y seguir. Reemplaza al `UsernameModal`. Cubre REQ-003 RF 10. Derivada de 1b.
- **Viewports:**
  - **desktop** — layout dividido igual que S-07.
  - **mobile** — franja de marca compacta y formulario a ancho completo.
- **Acceso:** solo dentro del flujo de Google; fuera de él redirige a `/`.

## Entrada y salida

**Entradas:**
- S-07 / S-08 · "Continuar con Google" (usuario nuevo).

**Salidas user-driven:** ninguna aparte de guardar.

**Salidas automáticas:**
- A `next` (o `/events`) tras guardar.

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | Panel de marca | section | — | layout | ambos | viewport_overrides: mobile→franja con logo y título | AuthLayout |
| 2 | Título de marca | heading | h2 | content | ambos | — | Mensaje |
| 3 | Título | heading | h1 | content | ambos | — | "Elegí tu nombre" |
| 4 | Explicación | paragraph | body | content | ambos | — | Dónde se ve |
| 5 | Campo nombre | text-input | default | input | ambos | — | Precargado desde Google |
| 6 | Error de envío | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Falla |
| 7 | Botón continuar | button | primary | input | ambos | state_overrides: loading→disabled | Guardar y seguir |

## Layout por viewport

### desktop · 1200px
- row `auth`
  - col 5/12: Panel de marca, Título de marca
  - col 7/12: Título, Explicación, Campo nombre, Error de envío, Botón continuar

### mobile · 400px
- Panel de marca
- Título de marca
- Título
- Explicación
- Campo nombre
- Error de envío
- Botón continuar

## Contenido

### Panel de marca
- Texto/label: "TELESCOPIO"

### Título de marca
- Texto/label: "Ya casi estás."

### Título
- Texto/label: "Elegí tu nombre"

### Explicación
- Texto/label: "Es el nombre que ven los organizadores y el que aparece en los resultados de los eventos."

### Campo nombre
- Texto/label: "Nombre" · placeholder "Al menos 3 caracteres"
- Annotation: precargado con el nombre que devuelve Google.

### Error de envío
- Texto/label: "No pudimos guardar tu nombre. Probá de nuevo."

### Botón continuar
- Texto/label: "Continuar"

## Estados

### default
- Aplica: Sí
- Mensaje: —
- Cambios: ninguno.

### empty
- Aplica: No.

### loading
- Aplica: Sí
- Mensaje: "Guardando…"
- Cambios: Botón continuar variant=disabled.

### error de validación
- Aplica: Sí
- Mensaje: "Usá al menos 3 caracteres." / "Ese nombre ya está en uso. Probá con otro."
- Cambios: Campo nombre state=error.

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos guardar tu nombre. Probá de nuevo."
- Cambios: Error de envío visible.

### success
- Aplica: No — navega a `next`.

### not found
- Aplica: No.

### estado terminal / readonly
- Aplica: No.

## Interacciones

**Eventos:**
- Botón continuar · on submit → guarda el nombre → `next` o `/events`.

**Validaciones:**
- Campo nombre · < 3 caracteres → "Usá al menos 3 caracteres."

**Feedback:** redirect a `next`.

## Accesibilidad

- **Orden de foco:** Campo nombre → Botón continuar.
- **Landmarks y jerarquía:** igual que S-07. h1 = Título.
- **Foco y teclado:** foco inicial en Campo nombre con el texto seleccionado.
- **Propio de esta composición:** ninguno.

## Decisiones y descartes

**Decisiones tomadas:**
- Página/paso con el layout de 1b en vez de modal (REQ-003 RF 10).
- Mismo mínimo de 3 caracteres que el modal actual.

**Alternativas descartadas:**
- Permitir saltear el paso: el nombre se muestra en tablas de participantes y resultados.

**Preguntas abiertas:**
- ¿El nombre tiene que ser único? Se incluyó el mensaje por si el backend lo rechaza; confirmar con el backend.
