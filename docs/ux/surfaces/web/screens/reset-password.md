---
name: reset-password
surface: web
route: "/reset-password"
viewports: [desktop, mobile]
audiences: [participante]
fidelity: mid
status: as-is-sin-validar
version: "1.0"
date: 2026-09-18
---

# Definir nueva contraseña

## Identidad

- **Audiencia primaria:** participante
- **JTBD:** habilitador de todos los JTBD — sin acceso no hay nada. **Para quien entró por un link
  compartible, esta pantalla no es "recuperar" una contraseña: es la única forma de obtener una**,
  porque el registro a un evento crea el usuario con `password_hash` nulo.
- **Viewports:** `desktop`, `mobile` — **con el mismo layout**: es la única pantalla sin media
  queries propias
- **Acceso:** público. Requiere `?token=` en la query

> **Transcripta del código existente** (`docs/analysis/ux/web/screens/reset-password.md`).
> `status: as-is-sin-validar`.

## Entrada y salida

**Se llega desde:** el link del email de recuperación, con el token en la query string.

**Se sale hacia:** `/` por el botón `Go to home`, disponible **solo tras el éxito**.

⚠️ **El estado de token inválido no tiene salida**: la tarjeta muestra el error y no ofrece ningún
botón ni link.

## Estructura

Tres renders **mutuamente excluyentes**: nunca coexisten.

| Bloque | Tipo | Contenido |
|---|---|---|
| Tarjeta de token inválido | tarjeta | Título + bloque de error. **Sin formulario ni salida** |
| Tarjeta de confirmación | tarjeta | Título propio + mensaje de éxito + botón de salida |
| Tarjeta de formulario | formulario | Título + dos campos de contraseña con label y placeholder + error condicional + botón de envío |

**Origen:** `web/src/pages/reset-password/ResetPasswordPage.tsx:45-110`.

Es la pantalla más simple del producto.

## Layout por viewport

**desktop** y **mobile** — **idéntico**.

Una tarjeta centrada, ancho acotado. **No hay ninguna media query propia en esta pantalla**: el
layout no cambia en ningún ancho. Hereda solo lo que aporten los estilos globales.

## Contenido

Microcopy transcripto **textual**, en inglés.

### Tarjeta de formulario
- Título: `🔭 Reset Password`
- Label 1: `New password` · Placeholder: `At least 8 characters`
- Label 2: `Confirm password` · Placeholder: `Repeat your new password`
- Botón (reposo): `Set new password`
- Botón (enviando): `Updating...`

### Tarjeta de token inválido
- Título: `🔭 Reset Password`
- Error: `Invalid or missing reset token.`

### Tarjeta de confirmación
- Título: `🔭 Password Updated`
- Mensaje: `Your password has been updated successfully.`
- Botón: `Go to home`

### Mensajes de validación
- `Password must be at least 8 characters.`
- `Passwords do not match.`
- Error de API: `err.message` crudo, o el fallback `Something went wrong. The link may have expired.`

## Estados

| Estado | Aplica | Detalle |
|---|---|---|
| Vacío | **No** — no aplica | Es un formulario |
| Cargando | **Sí** | El botón cambia a `Updating...` |
| Error | **Sí** | Dos vías: token inválido (tarjeta completa, excluyente) y error de validación o de API (inline en el formulario) |
| Éxito | **Sí** | Tarjeta de confirmación completa, excluyente, con salida a `/` |
| Deshabilitado | **Sí** | El botón durante el envío |
| Sin permiso | **No** — no aplica | El control de acceso es el token |
| Parcial | **No** — no aplica | — |
| Offline | **No** — no implementado (ver `gaps-as-is.md`) | Un fallo de red cae en el error genérico |

**Es la pantalla con mejor cobertura de estados del producto**, en proporción a su tamaño.

## Interacciones

- **Al montar:** lee el `token` de la query (`:9`). Si falta, renderiza la tarjeta de token
  inválido.
- **Validación client-side** antes de enviar: longitud ≥ 8 y coincidencia entre los dos campos.
- **Envío:** llama a la API con token y contraseña nueva. En éxito, reemplaza toda la pantalla por
  la tarjeta de confirmación.

## Accesibilidad

**Observado en el código:**
- Los dos campos tienen `<label>` visible.
- ⚠️ El bloque de error no tiene `role="alert"` ni `aria-live`: al aparecer no se anuncia.
- ⚠️ El emoji `🔭` del título no tiene `aria-hidden`: será leído literalmente.

## Decisiones y descartes

- Pantalla documentada desde el código existente `[fuente: código-existente]`. No hay registro del
  rationale original; las decisiones se van a documentar cuando la pantalla se modifique.
