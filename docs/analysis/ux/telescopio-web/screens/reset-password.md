# Pantalla: Definir nueva contraseña

| | |
|---|---|
| **Ruta** | `/reset-password` |
| **Componente** | `src/pages/reset-password/ResetPasswordPage.tsx` |
| **Acceso** | Público. Requiere un `?token=` válido en la query (`:9`) |
| **Viewports** | Uno solo — sin media queries propias |

Es la pantalla más simple de la aplicación.

## Bloques

Tres renders **mutuamente excluyentes**: nunca coexisten.

| # | Bloque | Origen | Contenido |
|---|---|---|---|
| A | Tarjeta de token inválido | `:45-54` | Título y un bloque de error. Sin formulario ni salida |
| B | Tarjeta de confirmación | `:56-73` | Título propio, mensaje de éxito y un botón de salida |
| C | Tarjeta de formulario | `:75-110` | Título, dos campos de contraseña con label y placeholder, error condicional y botón de envío |

## Microcopy

Todo en inglés.

| Elemento | Texto | Origen |
|---|---|---|
| Título (formulario y error) | `🔭 Reset Password` | `:49`, `:78` |
| Título (éxito) | `🔭 Password Updated` | `:60` |
| Error de token | `Invalid or missing reset token.` | `:50` (estático), `:31` (estado) |
| Éxito | `Your password has been updated successfully.` | `:62` |
| Botón de salida | `Go to home` | `:68` |
| Label 1 | `New password` | `:81` |
| Placeholder 1 | `At least 8 characters` | `:87` |
| Label 2 | `Confirm password` | `:94` |
| Placeholder 2 | `Repeat your new password` | `:99` |
| Validación | `Password must be at least 8 characters.` | `:22` |
| Validación | `Passwords do not match.` | `:26` |
| Error de API | `err.message` crudo, o el fallback `Something went wrong. The link may have expired.` | `:39` |
| Submit | `Updating...` mientras carga · `Set new password` en reposo | `:105` |

## Estados

| Estado | Presente | Detalle |
|---|---|---|
| Vacío | N/A | Es un formulario |
| **Cargando** | **Parcial** | Solo el label del botón y `disabled={loading}` (`:104-105`). **Los inputs no se deshabilitan** durante el envío. Sin spinner |
| **Error** | **Sí** | `.error-message` (`:103`) con cuatro textos distintos |
| **Éxito** | **Sí** | Pantalla completa dedicada (`:56-73`) con título propio, mensaje y salida clara. **Es el estado de éxito mejor resuelto de toda la aplicación** |
| **Deshabilitado** | **Parcial** | Solo el submit por `loading` (`:104`). **No se deshabilita por formulario inválido**: a diferencia de la pantalla de crear evento, acá el botón siempre está activo y la validación ocurre al enviar |
| **Sin permiso** | **Sí, como token inválido** | `Invalid or missing reset token.` con render dedicado si falta el token (`:45-54`). Es el equivalente funcional |
| **Parcial** | **No** | Sin contador ni indicador de fortaleza de contraseña |
| **Offline** | **No** | Un fallo de red cae en `err.message` o en el fallback genérico, **que atribuye el problema a un link expirado incluso cuando la causa fue la red** |

## Layout por viewport

**`ResetPasswordPage.css` (43 líneas) no tiene ninguna media query.** La pantalla no define
comportamiento responsive propio.

Funciona igual en mobile por construcción del layout base: `.reset-password-page` es un flex
centrado con `padding: 24px` (`:1-8`) y `.reset-password-card` usa `width: 100%` con
`max-width: 420px` (`:11-12`). Por debajo de ~468px la tarjeta se encoge de forma fluida. Los
inputs heredan `width:100%` y `box-sizing:border-box` de `Auth.css:70,78`.

> **Acoplamiento implícito.** La pantalla usa clases de `Auth.css` (`.auth-form`,
> `.form-group`, `.error-message`, `.auth-submit-btn`) **sin importar ese archivo**:
> `ResetPasswordPage.tsx:4` solo importa su propio CSS. Funciona porque CRA inyecta en el
> bundle todos los CSS importados en cualquier parte de la app, y `Auth.tsx:2` importa
> `Auth.css`. De rebote hereda el corte a 480px de `Auth.css:275-287`, que reduce el padding
> de los inputs y del botón de envío.

## Interacciones

**Submit** (`:17-43`), con **tres validaciones secuenciales**, cada una con retorno temprano:

| # | Regla | Umbral | Mensaje |
|---|---|---|---|
| 1 | `password.length < 8` | **8** | `Password must be at least 8 characters.` (`:21-24`) |
| 2 | `password !== confirm` | — | `Passwords do not match.` (`:25-28`) |
| 3 | `!token` | — | `Invalid or missing reset token.` (`:29-32`) — **inalcanzable**: el render A ya cortó antes si no hay token (`:45`). Código muerto |

**Validación nativa en paralelo** — `required` + `minLength={8}` en el primer campo
(`:88-89`); **solo `required` en el segundo** (`:100`). Asimetría: el campo de confirmación
no tiene `minLength`.

**Éxito** → `setDone(true)` (`:37`), que cambia el render completo. **No hay redirección
automática**: el usuario debe pulsar `Go to home` (`:66`).

## Accesibilidad observada

- **Ambos inputs tienen `<label htmlFor>` correctamente asociado** a sus `id` (`:81/84`,
  `:94/97`).
- El bloque de error (`:103`) **sin `role="alert"` ni `aria-live`**: no se anuncia al
  aparecer.
- **Sin `autoComplete="new-password"`** en ningún campo: los gestores de contraseñas no
  reciben la pista.
- El emoji `🔭` está dentro del `<h2>` (`:49`, `:60`, `:78`) sin `aria-hidden`: se lee junto
  al título.
- **El cambio de pantalla al confirmar no mueve el foco ni lo anuncia**: para un lector de
  pantalla el contexto cambia por completo en silencio.
- Un solo `<h2>` por render y **ningún `<h1>` en la página** (la navbar usa `<h2>` para el
  logo, `App.tsx:153`). Jerarquía de encabezados irregular.

## Observaciones

- El estado de éxito es el mejor resuelto de la aplicación: pantalla dedicada, mensaje claro
  y una salida explícita.
- El mensaje de fallback culpa al link expirado ante cualquier error no identificado,
  incluidos los de red.
- La tercera validación del submit es código muerto.
