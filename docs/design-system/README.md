# Design System — Telescopio

Raíz del Design System. Una carpeta por superficie, con versionado independiente.

| Superficie | Plataforma | DS | Estado |
|---|---|---|---|
| [web](./web/) | `web` | v1.0.0 | **Sembrado desde el código existente** |

> **Este DS es brownfield.** Las fundaciones no son placeholders: contienen los valores que el CSS
> implementado usa hoy, relevados de `web/src/styles/global.css` e `index.css`.
>
> Eso significa que **la documentación y el código coinciden** — y que un cambio acá es un cambio
> al comportamiento de código ya desplegado. Ver `web/governance.md`.

## Cómo se actualiza

`/product-design-system-update` — modo interactivo, con bump de semver y entrada en el CHANGELOG.
