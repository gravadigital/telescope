---
component: menu
version: 2.0.0
status: active
last_updated: 2026-10-02
related: [button, dialog]
---

# Menu

## Propósito

Lista de acciones u opciones que se despliega desde un botón.

**Cuándo usar:** menú de usuario (Mis eventos, Idioma, Notificaciones, Cerrar sesión), selector de idioma para visitantes (ES / EN), navegación del header en mobile.

**Cuándo NO usar:** filtros de una lista → [filter-tabs](./filter-tabs.md); decisiones con explicación → [dialog](./dialog.md).

## Anatomía

1. **Disparador** — [button](./button.md) (`onBand` en el header) con `aria-expanded`.
2. **Panel** — `bg.surface`, `radius.field`, `shadow.popover`.
3. **Ítem** — ícono opcional + label; ítem seleccionado con ✓ (idioma).
4. **Separador (opcional).**

## Variants

| Variant | Uso |
|---|---|
| actions | Menú de usuario |
| select | Elegir una opción con ✓ (idioma) |

## Sizes

Ítems de 40px (44px en mobile); ancho mínimo 200px.

## States

closed · open · item hover/focus (`bg.surface.subtle`) · item selected (✓).

## Spacing & sizing rules

Panel alineado al borde del disparador, a `space.sm` de distancia · padding del panel `space.xs`.

## Accesibilidad

`role="menu"` / `menuitem` (o `menuitemradio` en `select`); flechas ↑ ↓ recorren; Enter activa; Escape cierra y devuelve el foco al disparador; Tab cierra.

## Guidelines de contenido

Ítems de 1–3 palabras · los idiomas se nombran en su propio idioma ("Español", "English").

## Do's & don'ts

**Do:** cerrar al elegir.

**Don't:** anidar submenús · poner en el menú la acción principal de la pantalla.

## API

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| trigger | ReactNode | — | Disparador |
| variant | `actions \| select` | `actions` | Variant |
| items | `{id, label, icon?, selected?, onSelect}[]` | — | Ítems |
| align | `start \| end` | `end` | Alineación |

## Componentes y patterns relacionados

[button](./button.md) · [dialog](./dialog.md)

## Historial

- 2026-10-02 v2.0.0 — Creado para REQ-003 (UserMenu y selector de idioma).
