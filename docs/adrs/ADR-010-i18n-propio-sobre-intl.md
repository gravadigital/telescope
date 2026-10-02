# ADR-010: Internacionalización con un provider propio sobre `Intl`

**Estado:** Aceptado (pendiente de implementar)
**Fecha:** 2026-10-02
**Origen:** REQ-003 (DA-3) · **Stories:** S-011 (y todas las de pantalla)
**Tags:** frontend, i18n

---

## Contexto

REQ-003 pide la interfaz completa en español e inglés, con un selector que cambie el idioma sin
recargar y recuerde la elección en el navegador. Hoy la UI está en inglés, con textos embebidos en
los componentes. El español debe ser **neutro** (sin voseo ni modismos rioplatenses).

El producto tiene 2 idiomas y unas 15 pantallas. [ADR-007](ADR-007-css-plano-sin-framework.md)
evita dependencias de UI, y la convención `state-management` de `web` pide un Context nuevo solo
con una razón concreta (el idioma lo leen todas las ramas del árbol).

## Decisión

`web/src/i18n/` con:
- `I18nProvider` (Context) y `useT()`.
- Catálogos `es.ts` y `en.ts`; **el tipo de `en` se deriva de `es`**, así una clave faltante no
  compila.
- Interpolación simple (`{name}`) y plurales con `Intl.PluralRules`.
- Fechas con `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat` y números con `Intl.NumberFormat`
  (los helpers de `web/src/domain/` reciben el idioma).
- Idioma inicial de `navigator.language` (`es*` → español; si no, inglés), persistido en
  `localStorage` con `useLocalStorage`; `<html lang>` se actualiza al cambiar.
- Errores de la api traducidos por `code` (`errors.<code>`), con fallback genérico; nunca se
  muestra `err.message`.
- Verificación: lint contra texto embebido en JSX en las carpetas nuevas y un test que rechaza
  formas de voseo en el catálogo `es`.

## Consecuencias

### Positivas

- Sin dependencia nueva; el catálogo tipado detecta claves faltantes en compilación.
- Formatos de fecha, número y plural correctos por idioma con APIs nativas.

### Negativas

- Funcionalidades que una librería trae resueltas (namespaces, carga diferida, detección
  avanzada) quedan a cargo del equipo si hicieran falta.
- Todo el catálogo viaja en el bundle (aceptable para 2 idiomas).

## Alternativas Consideradas

- **`react-i18next`:** más capacidades de las que necesita el producto y una dependencia más.
  Es la migración natural si el catálogo crece mucho o se suman idiomas.
- **`FormatJS` / `react-intl`:** mensajes ICU completos; mismo razonamiento.

## Referencias

- `docs/stories/S-011.multilenguaje-navegacion-y-acceso.md`
- `docs/architectures/web/conventions/` (`state-management`, `error-handling`)
