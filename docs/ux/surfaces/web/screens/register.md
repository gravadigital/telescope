---
name: register
surface: web
route: "/register"
viewports: [desktop, mobile]
audiences: [participante, organizador]
fidelity: mid
status: diseñada
version: "1.0"
date: 2026-10-02
---

# Pantalla: Crear cuenta (S-08)

## Identidad

- **Audiencia primaria (co-primary):** [participante](../../../audiences/participante/research-context.md), [organizador](../../../audiences/organizador/research-context.md).
- **JTBD / Propósito:** crear la cuenta en un paso y seguir con lo que estaba haciendo (inscribirse, crear un evento). Cubre REQ-003 RF 10, AC 7. Derivada de 1b (no tiene diseño propio).
- **Viewports:**
  - **desktop** — layout dividido igual que S-07.
  - **mobile** — franja de marca compacta arriba y formulario a ancho completo.

## Entrada y salida

**Entradas:**
- Header · "Crear cuenta". S-07 · "Creá una gratis". S-02 / S-04 · "Crear cuenta gratis" / "Crear cuenta".

**Salidas user-driven:**
- A S-07 · "¿Ya tenés cuenta? Iniciá sesión". A S-01 · "← Volver al inicio".

**Salidas automáticas:**
- A `next` (o `/events`) con la sesión iniciada tras crear la cuenta.
- A S-10 si entra con Google por primera vez y falta el nombre.

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | Panel de marca | section | — | layout | ambos | viewport_overrides: mobile→franja con logo y título | AuthLayout |
| 2 | Título de marca | heading | h2 | content | ambos | — | Mensaje |
| 3 | Beneficios | list | — | content | ambos | hidden_in_viewports: mobile | Qué permite la cuenta |
| 4 | Volver al inicio | link | — | navigation | ambos | — | ← Volver al inicio |
| 5 | Título | heading | h1 | content | ambos | — | "Crear cuenta" |
| 6 | Link login | link | — | navigation | ambos | — | ¿Ya tenés cuenta? |
| 7 | Botón Google | button | secondary | input | ambos | — | Continuar con Google |
| 8 | Separador | label | — | content | ambos | — | "o con tu email" |
| 9 | Campo nombre | text-input | default | input | ambos | — | Nombre completo |
| 10 | Campo email | text-input | default | input | ambos | — | Email |
| 11 | Campo contraseña | text-input | default | input | ambos | — | Contraseña ≥ 8 |
| 12 | Error de registro | alert | error | feedback | ambos | visible_only_in_states: error de sistema / sin conexión | Falla del alta |
| 13 | Botón crear cuenta | button | primary | input | ambos | state_overrides: loading→disabled | Enviar |

## Layout por viewport

### desktop · 1200px
- row `auth`
  - col 5/12: Panel de marca, Título de marca, Beneficios
  - col 7/12: Volver al inicio, Título, Link login, Botón Google, Separador, Campo nombre, Campo email, Campo contraseña, Error de registro, Botón crear cuenta

### mobile · 400px
- Panel de marca
- Título de marca
- Volver al inicio
- Título
- Link login
- Botón Google
- Separador
- Campo nombre
- Campo email
- Campo contraseña
- Error de registro
- Botón crear cuenta

## Contenido

### Panel de marca
- Texto/label: "TELESCOPIO"

### Título de marca
- Texto/label: "Participá en eventos donde la comunidad decide."

### Beneficios
- Texto/label: "✓ Inscribite y subí tu propuesta · ✓ Evaluá a otros participantes · ✓ Creá tus propios eventos"
- Icono: check

### Volver al inicio
- Texto/label: "← Volver al inicio"

### Título
- Texto/label: "Crear cuenta"

### Link login
- Texto/label: "¿Ya tenés cuenta? Iniciá sesión"

### Botón Google
- Texto/label: "Continuar con Google"

### Separador
- Texto/label: "o con tu email"

### Campo nombre
- Texto/label: "Nombre completo" · placeholder "Tu nombre"

### Campo email
- Texto/label: "Email" · placeholder "nombre@correo.com"

### Campo contraseña
- Texto/label: "Contraseña" · placeholder "Al menos 8 caracteres" · acción "Mostrar" / "Ocultar"

### Error de registro
- Texto/label: "No pudimos crear tu cuenta. Probá de nuevo."

### Botón crear cuenta
- Texto/label: "Crear cuenta"

## Estados

### default
- Aplica: Sí
- Mensaje: —
- Cambios: ninguno.

### empty
- Aplica: No.

### loading
- Aplica: Sí
- Mensaje: "Creando cuenta…"
- Cambios: Botón crear cuenta variant=disabled con el texto de carga; Botón Google disabled.

### error de validación
- Aplica: Sí
- Mensaje: según el campo (ver Validaciones)
- Cambios: campo state=error con su mensaje. Email ya registrado: Campo email state=error "Ya hay una cuenta con este email. Iniciá sesión o recuperá tu contraseña."

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos crear tu cuenta. Probá de nuevo."
- Cambios: Error de registro visible; los campos conservan el valor salvo la contraseña.

### success
- Aplica: No — navega a `next` con la sesión iniciada.

### not found
- Aplica: No.

### estado terminal / readonly
- Aplica: No. Con sesión iniciada redirige a `/events`.

## Interacciones

**Eventos:**
- Botón crear cuenta · on submit → crea la cuenta, inicia sesión y navega a `next` o `/events`.
- Botón Google · on click → OAuth (igual que S-07).
- Link login · on click → `/login` (conserva `next`).

**Validaciones:**
- Campo nombre · vacío → "Ingresá tu nombre."
- Campo email · formato inválido → "Ingresá un email válido."
- Campo contraseña · < 8 caracteres → "Usá al menos 8 caracteres."

**Feedback:** redirect a `next`.

## Accesibilidad

- **Orden de foco:** Volver al inicio → Link login → Botón Google → Campo nombre → Campo email → Campo contraseña → Botón crear cuenta.
- **Landmarks y jerarquía:** igual que S-07. h1 = Título.
- **Foco y teclado:** foco inicial en Campo nombre.
- **Propio de esta composición:** la regla de 8 caracteres se asocia al campo como descripción (no solo como placeholder).

## Decisiones y descartes

**Decisiones tomadas:**
- Página con el layout de 1b (REQ-003 RF 10, clarificaciones: "Páginas con el estilo de 1b").
- Mismos campos que el registro actual (nombre completo, email, contraseña ≥ 8): el REQ no cambia el alta.
- El link de error de email duplicado ofrece las dos salidas para quien se inscribió por link sin contraseña (UF-04).

**Alternativas descartadas:**
- Confirmar contraseña en el registro: no existe hoy; "Mostrar" cubre el error de tipeo.

**Preguntas abiertas:** ninguna.
