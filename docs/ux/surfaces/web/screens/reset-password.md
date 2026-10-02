---
name: reset-password
surface: web
route: "/reset-password"
viewports: [desktop, mobile]
audiences: [participante, organizador]
fidelity: mid
status: diseñada
version: "2.0"
date: 2026-10-02
---

# Pantalla: Definir nueva contraseña (S-06)

## Identidad

- **Audiencia primaria (co-primary):** [participante](../../../audiences/participante/research-context.md), [organizador](../../../audiences/organizador/research-context.md).
- **JTBD / Propósito:** definir la contraseña desde el enlace del email y entrar. Cubre C-06 y REQ-003 RF 10. Derivada de 1b.
- **Viewports:**
  - **desktop** — layout dividido igual que S-07.
  - **mobile** — franja de marca compacta y formulario a ancho completo (la v1.0 no tenía media queries).

## Entrada y salida

**Entradas:**
- Enlace del email `/reset-password?token=…`.

**Salidas user-driven:**
- A S-07 · "Iniciar sesión" tras el éxito.
- A S-09 · "Pedir un enlace nuevo" con token inválido o vencido.

**Salidas automáticas:** ninguna.

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | Panel de marca | section | — | layout | ambos | viewport_overrides: mobile→franja con logo y título | AuthLayout |
| 2 | Título de marca | heading | h2 | content | ambos | — | Mensaje |
| 3 | Título | heading | h1 | content | ambos | state_overrides: success→"Contraseña actualizada"; not found→"El enlace no es válido o venció" | Título |
| 4 | Campo contraseña | text-input | default | input | ambos | hidden_in_states: success, not found | Nueva contraseña |
| 5 | Campo repetir | text-input | default | input | ambos | hidden_in_states: success, not found | Repetir contraseña |
| 6 | Error de envío | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Falla |
| 7 | Botón guardar | button | primary | input | ambos | hidden_in_states: success, not found · state_overrides: loading→disabled | Guardar |
| 8 | Mensaje de resultado | paragraph | body | content | ambos | visible_only_in_states: success, not found | Qué sigue |
| 9 | Botón siguiente paso | button | primary | input | ambos | visible_only_in_states: success, not found | Iniciar sesión / Pedir enlace nuevo |

## Layout por viewport

### desktop · 1200px
- row `auth`
  - col 5/12: Panel de marca, Título de marca
  - col 7/12: Título, Campo contraseña, Campo repetir, Error de envío, Botón guardar, Mensaje de resultado, Botón siguiente paso

### mobile · 400px
- Panel de marca
- Título de marca
- Título
- Campo contraseña
- Campo repetir
- Error de envío
- Botón guardar
- Mensaje de resultado
- Botón siguiente paso

## Contenido

### Panel de marca
- Texto/label: "TELESCOPIO"

### Título de marca
- Texto/label: "Un paso más y volvés a tus eventos."

### Título
- Texto/label: "Definí tu nueva contraseña"

### Campo contraseña
- Texto/label: "Nueva contraseña" · placeholder "Al menos 8 caracteres" · acción "Mostrar" / "Ocultar"

### Campo repetir
- Texto/label: "Repetí la contraseña"

### Error de envío
- Texto/label: "No pudimos guardar la contraseña. Probá de nuevo."

### Botón guardar
- Texto/label: "Guardar contraseña"

### Mensaje de resultado
- Texto/label: success "Ya podés iniciar sesión con tu nueva contraseña." · not found "Los enlaces de recuperación vencen en 1 hora y sirven una sola vez. Pedí uno nuevo."

### Botón siguiente paso
- Texto/label: success "Iniciar sesión" · not found "Pedir un enlace nuevo"

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
- Cambios: Botón guardar variant=disabled con el texto de carga.

### error de validación
- Aplica: Sí
- Mensaje: "Usá al menos 8 caracteres." / "Las contraseñas no coinciden."
- Cambios: Campo contraseña o Campo repetir state=error con su mensaje.

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos guardar la contraseña. Probá de nuevo."
- Cambios: Error de envío visible.

### success
- Aplica: Sí
- Mensaje: "Contraseña actualizada"
- Cambios: campos y Botón guardar ocultos; Mensaje de resultado y Botón siguiente paso ("Iniciar sesión") visibles.

### not found
- Aplica: Sí — token ausente, inválido o vencido.
- Mensaje: "El enlace no es válido o venció"
- Cambios: campos ocultos; Botón siguiente paso = "Pedir un enlace nuevo". Ya no es un callejón sin salida.

### estado terminal / readonly
- Aplica: No.

## Interacciones

**Eventos:**
- Botón guardar · on submit → guarda la contraseña → success.
- Botón siguiente paso · on click → success: `/login` · not found: `/forgot-password`.

**Validaciones:**
- Campo contraseña · < 8 caracteres → "Usá al menos 8 caracteres."
- Campo repetir · distinto → "Las contraseñas no coinciden."

**Feedback:** el resultado se muestra en la misma pantalla.

## Accesibilidad

- **Orden de foco:** Campo contraseña → "Mostrar" → Campo repetir → Botón guardar.
- **Landmarks y jerarquía:** igual que S-07. h1 = Título.
- **Foco y teclado:** en success y not found el foco va al Título.
- **Propio de esta composición:** el cambio de estado se anuncia en región live.

## Decisiones y descartes

**Decisiones tomadas:**
- Reescrita por REQ-003 con el layout de 1b (RF 10).
- El token inválido ofrece "Pedir un enlace nuevo": resuelve el callejón sin salida de la v1.0 (UF-04).
- Tras el éxito se va a iniciar sesión, no a la home.

**Alternativas descartadas:**
- Iniciar sesión automáticamente tras guardar: el flujo actual no lo hace y el REQ no lo pide.

**Preguntas abiertas:** ninguna.
