---
date: 2026-09-25
type: technical-change
service: api, web
---

# Cambio Técnico: api, web — sincronizar la documentación con el código

## Requerimiento Original

> actualizá lo de docs que quedó desactualizado

## Resumen

La documentación técnica se había quedado atrás en tres cambios de código:
- el commit `625b6f4`, que protegió la descarga de propuestas, agregó su eliminación y la descripción opcional;
- el endurecimiento del login con Google;
- la reorganización del repo: stack local sin `.env`, `Makefile` en la raíz, tests de web en CI y borrado de la documentación y los scripts propios de cada servicio.

Al revisar el código aparecieron un defecto nuevo (D-15) y dos afirmaciones que eran incorrectas desde la importación.

## Documentos Modificados

| Documento | Cambio |
|-----------|--------|
| `docs/apis/api.yaml` | La descarga exige JWT, con permiso en el handler. Se agrega `DELETE /attachments/{id}`, el campo `description` en la carga y en el listado, y las validaciones de `aud` y email verificado en `/auth/google/verify` |
| `docs/db-schemas/telescopio_db.md` | Columna `attachments.description` y migración 021. Se quita la nota sobre el SQL suelto que se borró |
| `docs/architectures/api/overview.md` | La deuda #1 pasa de "descarga sin auth" a "evaluadores sin descarga" (D-15). `DeleteAttachment` ya tiene ruta |
| `docs/architectures/api/conventions/auth-jwt.md` | Google OAuth: verificación con `tokeninfo` (`aud`, email) y `userinfo` (`sub`) |
| `docs/architectures/api/conventions/http-server.md`, `file-storage.md` | La descarga ya no es pública. Se agrega la limitación del borrado de archivos |
| `docs/architectures/api/conventions/testing.md` | `make test` y `make test-integration` con la base `telescope_test` |
| `docs/architectures/web/conventions/testing.md`, `index.md`, `overview.md` | Cuatro suites que corren en CI, y el `moduleNameMapper` que las hace andar |
| `docs/architectures/web/conventions/data-fetching.md` | La descarga ya está declarada y se hace con `downloadFile`. Queda la excepción de `RankingVotePanel` |
| `docs/prd/requirements.md` | D-02 marcado como resuelto; nuevo D-15; se corrige la pregunta abierta #3 |
| `docs/prd/goals-and-context.md`, `architecture.md` | Ya no se citan `deploy/.env.dist`, `api/README.md` ni `verify-minio-production.sh`; el deploy de servidor vive en otro repo |
| `docs/flows/registro-y-carga-de-propuesta.md` | Campo `description`, reemplazo de la propuesta, y corrección sobre la validación de tamaño en el backend |
| `docs/ux/audiences/participante/benchmark.md` | E-06: el evaluador no puede abrir los archivos por D-15 |

## Correcciones a lo documentado en la importación

- **El backend sí valida el tamaño del archivo** contra `MAX_FILE_SIZE`, desde antes del monorepo. Tanto el flujo como la pregunta abierta #3 decían que no validaba nada.
- **WebP:** el cliente lo acepta y el backend no. Esto no estaba registrado; quedó anotado en el flujo.

## Defecto nuevo

- **D-15 (crítico):** los evaluadores no pueden abrir las propuestas que tienen asignadas. `canDownload` no los incluye, y `RankingVotePanel` usa un `<a href>` sin token con la URL `localhost:8080` fija.
