---
name: forgot-password
surface: web
route: "/forgot-password"
viewports: [desktop, mobile]
audiences: [participante, organizador]
fidelity: mid
status: diseñada
version: "1.0"
date: 2026-10-02
---

# Pantalla: Recuperar contraseña (S-09)

## Identidad

- **Audiencia primaria (co-primary):** [participante](../../../audiences/participante/research-context.md), [organizador](../../../audiences/organizador/research-context.md).
- **JTBD / Propósito:** pedir el enlace para definir una contraseña nueva — o la primera, si se inscribió por link sin tenerla. Cubre REQ-003 RF 10 y UF-04. Derivada de 1b.
- **Viewports:**
  - **desktop** — layout dividido igual que S-07.
  - **mobile** — franja de marca compacta y formulario a ancho completo.

## Entrada y salida

**Entradas:**
- S-07 · "¿La olvidaste?". S-06 · "Pedir un enlace nuevo".

**Salidas user-driven:**
- A S-07 · "← Volver a iniciar sesión".

**Salidas automáticas:** ninguna (el enlace llega por email a S-06).

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | Panel de marca | section | — | layout | ambos | viewport_overrides: mobile→franja con logo y título | AuthLayout |
| 2 | Título de marca | heading | h2 | content | ambos | — | Mensaje |
| 3 | Volver al login | link | — | navigation | ambos | — | ← Volver a iniciar sesión |
| 4 | Título | heading | h1 | content | ambos | — | "Recuperar contraseña" |
| 5 | Explicación | paragraph | body | content | ambos | hidden_in_states: success | Qué va a pasar |
| 6 | Campo email | text-input | default | input | ambos | hidden_in_states: success | Email |
| 7 | Error de envío | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Falla |
| 8 | Botón enviar | button | primary | input | ambos | hidden_in_states: success · state_overrides: loading→disabled | Enviar enlace |
| 9 | Confirmación | alert | success | feedback | ambos | visible_only_in_states: success | Revisá tu email |

## Layout por viewport

### desktop · 1200px
- row `auth`
  - col 5/12: Panel de marca, Título de marca
  - col 7/12: Volver al login, Título, Explicación, Campo email, Error de envío, Botón enviar, Confirmación

### mobile · 400px
- Panel de marca
- Título de marca
- Volver al login
- Título
- Explicación
- Campo email
- Error de envío
- Botón enviar
- Confirmación

## Contenido

### Panel de marca
- Texto/label: "TELESCOPIO"

### Título de marca
- Texto/label: "Recuperá el acceso a tus eventos."

### Volver al login
- Texto/label: "← Volver a iniciar sesión"

### Título
- Texto/label: "Recuperar contraseña"

### Explicación
- Texto/label: "Te enviamos un enlace para definir una contraseña nueva. Si te inscribiste a un evento con un link y nunca creaste una contraseña, usá esta opción para crearla."

### Campo email
- Texto/label: "Email" · placeholder "nombre@correo.com"
- Annotation: llega precargado si viene de S-07 con el email escrito.

### Error de envío
- Texto/label: "No pudimos enviar el enlace. Probá de nuevo."

### Botón enviar
- Texto/label: "Enviar enlace"

### Confirmación
- Texto/label: "Si hay una cuenta con {email}, te enviamos un enlace. Vence en 1 hora. Revisá también la carpeta de spam."

## Estados

### default
- Aplica: Sí
- Mensaje: —
- Cambios: ninguno.

### empty
- Aplica: No.

### loading
- Aplica: Sí
- Mensaje: "Enviando…"
- Cambios: Botón enviar variant=disabled con el texto de carga.

### error de validación
- Aplica: Sí
- Mensaje: "Ingresá un email válido."
- Cambios: Campo email state=error.

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos enviar el enlace. Probá de nuevo."
- Cambios: Error de envío visible.

### success
- Aplica: Sí
- Mensaje: "Si hay una cuenta con {email}, te enviamos un enlace."
- Cambios: Explicación, Campo email y Botón enviar ocultos; Confirmación visible.

### not found
- Aplica: No — el mensaje de éxito es el mismo exista o no la cuenta.

### estado terminal / readonly
- Aplica: No.

## Interacciones

**Eventos:**
- Botón enviar · on submit → pide el enlace → estado success.
- Volver al login · on click → `/login`.

**Validaciones:**
- Campo email · formato inválido → "Ingresá un email válido."

**Feedback:** confirmación en la misma pantalla.

## Accesibilidad

- **Orden de foco:** Volver al login → Campo email → Botón enviar.
- **Landmarks y jerarquía:** igual que S-07. h1 = Título.
- **Foco y teclado:** foco inicial en Campo email; en success el foco va a Confirmación.
- **Propio de esta composición:** Confirmación se anuncia en región live.

## Decisiones y descartes

**Decisiones tomadas:**
- Página con el layout de 1b (REQ-003 RF 10).
- La explicación nombra el caso "nunca creaste una contraseña": UF-04 detectó que para quien se inscribió por link este flujo es la única forma de obtenerla.
- El éxito no revela si el email existe.

**Alternativas descartadas:** ninguna.

**Preguntas abiertas:** ninguna.
