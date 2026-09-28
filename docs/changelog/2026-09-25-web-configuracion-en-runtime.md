---
date: 2026-09-25
type: technical-change
service: web
---

# Cambio Técnico: web — configuración al arrancar el contenedor

## Requerimiento Original

> las variables de entorno de la app deberían setearse en tiempo de ejecución: como va a
> estar publicada en Docker Hub, no puede tener configuración preestablecida en la imagen

## Resumen

La imagen de la web tenía escritas adentro la URL de la api y el Client ID de Google, porque
CRA reemplaza cada `REACT_APP_*` por su valor en el build y el CI las pasaba como build-args.
Ahora el contenedor escribe `config.js` al arrancar con `API_URL` y `GOOGLE_CLIENT_ID`,
`index.html` lo carga antes que la app, y `src/config/runtime.ts` es el único lugar que lee la
configuración. La imagen publicada no lleva nada propio de una instalación.

## Documentos Modificados

| Documento | Cambio |
|-----------|--------|
| `docs/architectures/web/conventions/project-structure.md` | Variables de entorno: resolución al arrancar, `RUNTIME_CONFIG` como única fuente |
| `docs/architectures/web/conventions/auth.md` | El Client ID de Google sale de `RUNTIME_CONFIG` |
| `docs/architectures/web/overview.md` | Integración con la API: de dónde sale la URL base |
| `docs/prd/architecture.md` | Base URL configurable al arrancar |
