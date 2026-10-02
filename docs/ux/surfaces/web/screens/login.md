---
name: login
surface: web
route: "/login"
viewports: [desktop, mobile]
audiences: [participante, organizador]
fidelity: mid
status: diseñada
version: "1.0"
date: 2026-10-02
---

# Pantalla: Iniciar sesión (S-07)

## Identidad

- **Audiencia primaria (co-primary):** [participante](../../../audiences/participante/research-context.md), [organizador](../../../audiences/organizador/research-context.md).
- **JTBD / Propósito:** entrar y volver exactamente a donde estaba (el evento que quería, la gestión, crear evento). Cubre REQ-003 RF 10, AC 7 y AC 33 (diseño 1b).
- **Viewports:**
  - **desktop** — layout dividido: marca y beneficios a la izquierda (5/12), formulario claro a la derecha (7/12).
  - **mobile** — la marca se reduce a una franja con el logo y el título; el formulario ocupa el ancho.

## Entrada y salida

**Entradas:**
- Header · "Iniciar sesión". Cualquier acción que pide sesión (`?next=<ruta>`): inscribirse, crear evento, Mis eventos, gestión, notificaciones. S-06 · "Iniciar sesión" tras definir la contraseña.

**Salidas user-driven:**
- A S-08 · "Creá una gratis". A S-09 · "¿La olvidaste?". A S-01 · "← Volver al inicio".

**Salidas automáticas:**
- A `next` (o `/events` si no hay) tras iniciar sesión.
- A S-10 si entra con Google por primera vez y falta el nombre.

## Estructura

| # | Nombre | Tipo | Variant/Level/State | Categoría | Viewports | Visibilidad | Propósito |
|---|--------|------|---------------------|-----------|-----------|-------------|-----------|
| 1 | Panel de marca | section | — | layout | ambos | viewport_overrides: mobile→franja con logo y título | AuthLayout: identidad |
| 2 | Título de marca | heading | h2 | content | ambos | — | Mensaje de bienvenida |
| 3 | Beneficios | list | — | content | ambos | hidden_in_viewports: mobile | Qué se puede hacer con cuenta |
| 4 | Volver al inicio | link | — | navigation | ambos | — | ← Volver al inicio |
| 5 | Título | heading | h1 | content | ambos | — | "Iniciar sesión" |
| 6 | Link registro | link | — | navigation | ambos | — | ¿No tenés cuenta? |
| 7 | Botón Google | button | secondary | input | ambos | — | Continuar con Google |
| 8 | Separador | label | — | content | ambos | — | "o con tu email" |
| 9 | Campo email | text-input | default | input | ambos | — | Email |
| 10 | Campo contraseña | text-input | default | input | ambos | — | Contraseña con "Mostrar" |
| 11 | Link olvido | link | — | navigation | ambos | — | ¿La olvidaste? |
| 12 | Error de login | alert | error | feedback | ambos | visible_only_in_states: error de validación, error de sistema / sin conexión | Credenciales o sistema |
| 13 | Botón iniciar sesión | button | primary | input | ambos | state_overrides: loading→disabled | Enviar |

## Layout por viewport

### desktop · 1200px
- row `auth`
  - col 5/12: Panel de marca, Título de marca, Beneficios
  - col 7/12: Volver al inicio, Título, Link registro, Botón Google, Separador, Campo email, Campo contraseña, Link olvido, Error de login, Botón iniciar sesión

### mobile · 400px
- Panel de marca
- Título de marca
- Volver al inicio
- Título
- Link registro
- Botón Google
- Separador
- Campo email
- Campo contraseña
- Link olvido
- Error de login
- Botón iniciar sesión

## Contenido

### Panel de marca
- Texto/label: "TELESCOPIO"

### Título de marca
- Texto/label: "Volvé a donde dejaste tus eventos."

### Beneficios
- Texto/label: "✓ Seguí el estado de los eventos donde participás · ✓ Subí tu propuesta y votá cuando te toque · ✓ Consultá rankings finales completos"
- Icono: check

### Volver al inicio
- Texto/label: "← Volver al inicio"

### Título
- Texto/label: "Iniciar sesión"

### Link registro
- Texto/label: "¿No tenés cuenta? Creá una gratis"

### Botón Google
- Texto/label: "Continuar con Google"

### Separador
- Texto/label: "o con tu email"

### Campo email
- Texto/label: "Email" · placeholder "nombre@correo.com"

### Campo contraseña
- Texto/label: "Contraseña" · placeholder "Tu contraseña" · acción "Mostrar" / "Ocultar"

### Link olvido
- Texto/label: "¿La olvidaste?"
- Annotation: junto al campo contraseña (1b). Lleva el email cargado a S-09.

### Error de login
- Texto/label: "El email o la contraseña no son correctos." / "No pudimos iniciar sesión. Probá de nuevo." / "No pudimos conectarte con Google. Probá de nuevo."

### Botón iniciar sesión
- Texto/label: "Iniciar sesión"

## Estados

### default
- Aplica: Sí
- Mensaje: —
- Cambios: ninguno. Si viene con `next`, Título de marca pasa a "Iniciá sesión para continuar."

### empty
- Aplica: No — formulario.

### loading
- Aplica: Sí
- Mensaje: "Iniciando sesión…"
- Cambios: Botón iniciar sesión variant=disabled con el texto de carga; Botón Google disabled.

### error de validación
- Aplica: Sí
- Mensaje: "El email o la contraseña no son correctos."
- Cambios: Error de login visible; Campo contraseña se vacía; Campo email conserva el valor. Email con formato inválido: Campo email state=error "Ingresá un email válido."

### error de sistema / sin conexión
- Aplica: Sí
- Mensaje: "No pudimos iniciar sesión. Probá de nuevo."
- Cambios: Error de login visible; campos conservan el valor.

### success
- Aplica: No — el éxito navega a `next`.

### not found
- Aplica: No.

### estado terminal / readonly
- Aplica: No. Con sesión ya iniciada, `/login` redirige a `/events`.

## Interacciones

**Eventos:**
- Botón iniciar sesión · on submit → autentica → navega a `next` o `/events`.
- Botón Google · on click → OAuth → si es usuario nuevo sin nombre, S-10; si no, `next`.
- Link registro · on click → `/register` (conserva `next`).
- Link olvido · on click → `/forgot-password`.
- "Mostrar" · on click → alterna la visibilidad de la contraseña.

**Validaciones:**
- Campo email · vacío o formato inválido → "Ingresá un email válido."
- Campo contraseña · vacía → "Ingresá tu contraseña."

**Feedback:** redirect a `next`; la pantalla de destino ya se ve con sesión.

## Accesibilidad

- **Orden de foco:** Volver al inicio → Link registro → Botón Google → Campo email → Campo contraseña → "Mostrar" → Link olvido → Botón iniciar sesión.
- **Landmarks y jerarquía:** main con dos regiones (marca `aside`, formulario). h1 = Título; el Título de marca es h2.
- **Foco y teclado:** el foco inicial va a Campo email. Enter envía el formulario.
- **Propio de esta composición:** Error de login se anuncia como alerta y el foco vuelve al primer campo con error.

## Decisiones y descartes

**Decisiones tomadas:**
- Página en vez de modal (REQ-003 RF 10, 1b): el login es destino de `next` y necesita una URL.
- Layout dividido marca / formulario, compartido con S-06, S-08, S-09, S-10 (AuthLayout).
- "¿La olvidaste?" junto al campo donde se necesita (1b).
- En mobile se ocultan los beneficios: a 400px empujaban el formulario fuera de la primera pantalla.

**Alternativas descartadas:**
- Banner "Proyecto demo · los datos pueden reiniciarse": solo si existe una configuración de entorno demo (REQ-003 agregados); no se especifica acá.

**Preguntas abiertas:** ninguna.
