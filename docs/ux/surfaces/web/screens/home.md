---
name: home
surface: web
route: "/"
viewports: [desktop, mobile]
audiences: [participante]
fidelity: mid
status: as-is-sin-validar
version: "1.0"
date: 2026-09-18
---

# Home (landing)

## Identidad

- **Audiencia primaria:** participante (y visitante anónimo, que es su estado previo)
- **JTBD:** ninguno. **Esta pantalla no resuelve ningún trabajo del usuario hoy**: es andamiaje
  con texto placeholder.
- **Viewports:** `desktop` (base), `mobile` (≤768px)
- **Acceso:** público

> **Transcripta del código existente** (`docs/analysis/ux/web/screens/home.md`).
> `status: as-is-sin-validar` — documenta lo que hay, no un diseño validado.

## Entrada y salida

**Se llega desde:** el logo `TELESCOPIO` de la navbar, los links `About` y `See Demo`, o
directamente por URL.

**Se sale hacia:** `/events` por el link `Events` de la navbar. **No hay ninguna otra salida**: el
contenido no tiene links ni controles.

## Estructura

| Bloque | Tipo | Contenido |
|---|---|---|
| Navbar (chrome global) | navegación | Logo + menú + bloque de sesión. Renderizada por `AppContent`, presente en las 6 rutas |
| Sección WHY | sección | `<h1>` + párrafo. `min-height: 100vh` |
| Sección HOW | sección | `<h1>` + párrafo. `min-height: 100vh` |
| Sección DEMO | sección | `<h1>` + párrafo. `min-height: 100vh` |

Tres bloques idénticos en estructura, cada uno a alto completo de viewport.

**Origen:** `web/src/App.tsx:22-56` (componente inline, no archivo propio), `App.css:78-85`.

## Layout por viewport

**desktop** (base)
- Tres secciones apiladas verticalmente, cada una ocupando la altura completa del viewport.
- Navbar fija arriba.

**mobile** (≤768px, `App.css:105-124`)
- `.section` reduce el padding a `--spacing-md`.
- `.main-content` sube su `margin-top` de 80px a 120px, para compensar que la navbar se apila en
  dos filas.
- La estructura de tres secciones no cambia.

Sin reglas propias a 1024px, 600px ni 480px.

## Contenido

Microcopy transcripto **textual**, en inglés.

### Sección WHY
- Título: `WHY?`
- Párrafo: `This is the WHY section where we explain the purpose and motivation behind Telescopio.`

### Sección HOW
- Título: `HOW?`
- Párrafo: `This is the HOW section where we explain the process and methodology of Telescopio.`

### Sección DEMO
- Título: `DEMO`
- Párrafo: `This is the DEMO section where we showcase the capabilities of Telescopio.`

### Navbar
- Logo: `TELESCOPIO` → `/`
- `About` → `/` ⚠️ debería ir al ancla `#why`
- `See Demo` → `/` ⚠️ debería ir al ancla `#demo`
- `Events` → `/events`

> ⚠️ **Los tres párrafos son texto placeholder autorreferencial**, no contenido real. Están
> transcriptos tal cual porque es lo que el usuario lee hoy.

## Estados

| Estado | Aplica | Detalle |
|---|---|---|
| Vacío | **No** — no implementado | La pantalla es JSX estático |
| Cargando | **No** — no aplica | No hace fetch |
| Error | **No** — no aplica | No hay operación que falle |
| Éxito | **No** — no aplica | No hay acción |
| Deshabilitado | **No** — no aplica | No hay controles |
| Sin permiso | **No** — no aplica | Es pública |
| Parcial | **No** — no aplica | — |
| Offline | **No** — no implementado (ver `gaps-as-is.md`) | — |

**Ninguno de los ocho estados existe.** La pantalla no tiene lógica: sin fetch, sin controles, sin
guard.

## Interacciones

**Ninguna dentro del contenido.** No hay handlers, formularios ni navegación desde las secciones.
La única navegación disponible es la navbar global.

Las secciones definen `id="why"`, `id="how"` e `id="demo"`, pero **ningún link apunta a esas
anclas** (`App.tsx:26,36,46` vs `:157-158`).

## Accesibilidad

**Observado en el código:**
- ⚠️ **Tres `<h1>` en la misma página** (`App.tsx:28,38,48`) — jerarquía de encabezados incorrecta.
- ✅ Uso correcto de `<main className="main-content">` y de `<section>`.
- ⚠️ Las `<section>` no tienen `aria-labelledby`: no son landmarks nombrados.
- No aplica: sin imágenes (alt), sin controles (navegación por teclado dentro del contenido).

## Decisiones y descartes

- Pantalla documentada desde el código existente `[fuente: código-existente]`. No hay registro del
  rationale original; las decisiones se van a documentar cuando la pantalla se modifique.
