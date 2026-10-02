---
foundation: typography
version: 2.0.0
last_updated: 2026-10-02
status: diseñada
---

# Tipografía

> **v2.0.0 — tipografía del rediseño (REQ-003).** Familias, tamaños, pesos e interlineados contados
> sobre `documentation/Telescopio Rediseño Vistas.html`. `[fuente: diseño REQ-003]`

## Familias

| Token | Valor | Uso |
|---|---|---|
| `font.family.base` | `'Plus Jakarta Sans', system-ui, sans-serif` | Toda la interfaz |
| `font.family.mono` | `'JetBrains Mono', monospace` | Eyebrows ("TU PRÓXIMO PASO"), metadatos, números de etapa, tipo de archivo |

**Cambio respecto de la v1.0:** el producto pasa de fuentes de sistema a dos fuentes web. Las dos
están en Google Fonts con licencia OFL; el bundle del diseño trae los subsets woff2. Cargar con
`font-display: swap` y solo los pesos de abajo.

## Escala de tamaños

| Token | Tamaño | Uso |
|---|---|---|
| `font.size.2xs` | 12px | Eyebrows, etiquetas de tabla, contadores |
| `font.size.xs` | 13px | Metadatos, ayudas de campo, captions |
| `font.size.sm` | 14px | Texto de botones, celdas de tabla, chips |
| `font.size.md` | 15px | **Cuerpo** (el tamaño más usado del diseño) |
| `font.size.lg` | 16px | Cuerpo destacado, inputs |
| `font.size.xl` | 18px | Títulos de tarjeta (h3) |
| `font.size.2xl` | 20px | Títulos de sección (h2), "Tu próximo paso" |
| `font.size.3xl` | 28px | Títulos de diálogo grandes, métricas |
| `font.size.4xl` | 36px | h1 de pantalla en desktop |
| `font.size.5xl` | 44px | h1 de la landing y del EventHero en desktop |

En mobile, h1 baja un paso de la escala (`5xl → 3xl`, `4xl → 3xl`). Los demás tamaños no cambian.

## Pesos

| Token | Valor | Uso |
|---|---|---|
| `font.weight.regular` | 400 | Cuerpo largo (descripciones) |
| `font.weight.medium` | 500 | Ítems leídos, texto de apoyo |
| `font.weight.semibold` | 600 | Botones, etiquetas, cuerpo de UI |
| `font.weight.bold` | 700 | Títulos h2/h3, ítems no leídos |
| `font.weight.extrabold` | 800 | h1, métricas grandes |

## Interlineado y espaciado de letras

| Token | Valor | Uso |
|---|---|---|
| `font.leading.tight` | 1 | Métricas, números de podio |
| `font.leading.snug` | 1.35 | Títulos |
| `font.leading.normal` | 1.55 | Cuerpo de UI |
| `font.leading.relaxed` | 1.6 | Párrafos largos |
| `font.tracking.tight` | -0.02em | h1 y h2 |
| `font.tracking.wide` | 0.12em | Eyebrows en mono y mayúsculas |

## Tokens semánticos

| Token | Composición | Uso |
|---|---|---|
| `text.display` | `5xl` / `extrabold` / `tight` tracking | h1 de landing y EventHero |
| `text.heading.l` | `4xl` / `extrabold` / `tight` tracking | h1 de pantalla |
| `text.heading.m` | `2xl` / `bold` | h2 |
| `text.heading.s` | `xl` / `bold` | h3 |
| `text.body` | `md` / `regular` / `normal` | Cuerpo |
| `text.ui` | `sm` / `semibold` | Botones, tabs, chips |
| `text.caption` | `xs` / `medium` | Metadatos, ayudas |
| `text.eyebrow` | mono / `2xs` / `semibold` / `wide` tracking / mayúsculas | "TU PRÓXIMO PASO", "CÓMO FUNCIONA" |
| `text.metric` | `3xl` / `extrabold` / `tight` leading | StatTile |

## Guidelines

**Do:**
- Un solo h1 por pantalla y secuencia `h1 → h2 → h3` sin saltos.
- Usar `text.eyebrow` para rotular secciones, nunca como título.
- Usar mono solo para datos y rótulos cortos.

**Don't:**
- No escribir tamaños literales (deuda de la v1.0).
- No usar mono para párrafos.
- No usar `extrabold` fuera de h1 y métricas.

## Accesibilidad

- Tamaños en `rem` (base 16px) en la implementación, para respetar el zoom del navegador.
- Mínimo 12px solo en eyebrows en mayúsculas con tracking; el texto de lectura nunca baja de 13px.
- Verificar a 200% de zoom sin pérdida de contenido (AC 3).

## Historial

- 2026-09-18 v1.0.0 — Sembrado desde `web/src/styles/global.css` (fuentes de sistema, 7 pasos).
- 2026-10-02 v2.0.0 — **Breaking.** Tipografía del rediseño de REQ-003: Plus Jakarta Sans + JetBrains
  Mono, escala de 10 pasos, tokens de peso, interlineado y tracking.
