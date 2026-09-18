# Pantalla: Home (landing)

| | |
|---|---|
| **Ruta** | `/` |
| **Componente** | `HomePage`, definido **inline** en `src/App.tsx:22-56` |
| **Acceso** | Público |
| **Viewports** | `desktop` (base) · `mobile` (≤768px) |

> Relevamiento del código. Sin audiencias ni rationale: el código no los declara.

## Chrome global

Presente en las 6 rutas: `<nav className="navbar">` renderizada por `AppContent` por encima
de `<Routes>` (`App.tsx:149-174`). Contiene el logo `TELESCOPIO` (link a `/`) y el menú
`About` · `See Demo` · `Events`, más el bloque de sesión.

## Bloques

| # | Bloque | Origen | Contenido |
|---|---|---|---|
| 1 | Sección "WHY?" | `App.tsx:26-33` | `<section id="why">` con un `<h1>` y un párrafo estático |
| 2 | Sección "HOW?" | `App.tsx:36-43` | Misma estructura |
| 3 | Sección "DEMO" | `App.tsx:46-53` | Misma estructura |

Tres bloques idénticos en estructura. Cada `.section` tiene `min-height: 100vh`
(`App.css:78-85`): cada uno ocupa una pantalla completa.

## Microcopy

Todo en inglés.

| Texto | Origen |
|---|---|
| `WHY?` | `App.tsx:28` |
| `This is the WHY section where we explain the purpose and motivation behind Telescopio.` | `App.tsx:30` |
| `HOW?` | `App.tsx:38` |
| `This is the HOW section where we explain the process and methodology of Telescopio.` | `App.tsx:40` |
| `DEMO` | `App.tsx:48` |
| `This is the DEMO section where we showcase the capabilities of Telescopio.` | `App.tsx:50` |

Los tres párrafos son **texto placeholder autorreferencial** ("This is the X section
where we…"), no contenido real.

## Estados

Ninguno de los 8 existe. La pantalla es JSX estático sin lógica: no hace fetch, no tiene
controles y no tiene guard.

| Estado | Presente |
|---|---|
| Vacío · Cargando · Error · Éxito · Deshabilitado · Sin permiso · Parcial · Offline | **No** — ninguno aplica |

## Layout por viewport

**Desktop** (base)
- Tres secciones apiladas, cada una a alto completo de viewport.

**Mobile** (≤768px, `App.css:105-124`)
- `.section` reduce el padding a `--spacing-md`.
- `.main-content` sube su `margin-top` de 80px a 120px, para compensar la navbar que se
  apila en dos filas.

Sin reglas a 1024px, 600px ni 480px.

## Interacciones

Ninguna. No hay handlers, formularios ni navegación desde el contenido: la única navegación
es la navbar global.

Las secciones definen `id="why"`, `id="how"` e `id="demo"` (`App.tsx:26,36,46`), pero
**ningún link apunta a esas anclas**: `About` y `See Demo` navegan los dos a `/` sin hash
(`App.tsx:157-158`).

## Accesibilidad observada

- **Tres `<h1>` en la misma página** (`App.tsx:28,38,48`) — jerarquía de encabezados
  incorrecta.
- Uso correcto de `<main className="main-content">` (`App.tsx:24`) y de `<section>`.
- Las `<section>` no tienen `aria-labelledby`: no son landmarks nombrados.
- Sin imágenes (alt no aplica), sin controles (navegación por teclado no aplica dentro del
  contenido).

## Observaciones

- La pantalla está **sin contenido real**: los tres párrafos son placeholders del andamiaje
  inicial.
- Las anclas definidas sin usar sugieren una navegación por secciones que quedó a medio
  implementar.
