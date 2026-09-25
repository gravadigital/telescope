# Changelog

Los cambios notables del proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el
versionado es [Semantic Versioning](https://semver.org/lang/es/).

## Política de versionado

Todo el monorepo comparte **una sola versión**: `api` y `web` se publican juntas y
llevan siempre el mismo número.

Qué significa cada salto:

| Salto | Cuándo |
|---|---|
| **major** | Cambio incompatible en la API HTTP. |
| **minor** | Funcionalidad nueva, compatible hacia atrás. |
| **patch** | Correcciones y cambios internos sin efecto en el contrato. |

El esquema de la base no se versiona aparte: las migraciones corren al arrancar la
api y se esperan aditivas.

### Sacar un release

La versión vive en `VERSION` y en `web/package.json`. Un script escribe los dos:

```sh
scripts/set-version.sh 1.2.3      # sube todo
scripts/set-version.sh --check    # verifica que coincidan (lo corre el CI)
```

Después pasá las entradas de `[Unreleased]` bajo el encabezado nuevo, commiteá en
`dev`, mergeá a `main` y tagueá:

```sh
git tag v1.2.3 && git push origin v1.2.3
```

Pushear el tag es lo que publica. `release.yml` vuelve a verificar que el tag coincida
con el árbol, corre la suite y sube dos imágenes a Docker Hub —
`gravadigital/telescope-{api,web}`, cada una con los tags `1.2.3`, `1.2` y `latest`.

Un tag que no coincide con `VERSION` falla antes de construir nada, así que una imagen
mal etiquetada nunca llega al registry.

### El tag `dev`

Aparte de los releases, cada push a `dev` republica las dos imágenes con el tag `dev`,
pisando las anteriores. Es un puntero móvil a la punta de la rama, útil para un entorno
de staging; no es un release y no promete estabilidad.

Cada build publica además un tag inmutable `dev-<sha>`, para que una imagen dev puntual
siga siendo alcanzable después de que el tag `dev` se movió.

Para correr un servidor contra él, su compose (en el repo de deploy) tiene que bajar
`gravadigital/telescope-{api,web}:dev`.

---

## [Unreleased]

### Agregado

- **Monorepo**: `api`, `web` y `deploy` pasan a vivir en un solo repositorio.
- **Documentación de producto** en `docs/`: PRD, arquitecturas por servicio con sus
  convenciones, 8 ADRs, flujos cross-service, relevamiento de UX y design system.
- **CI en GitHub Actions**: `ci.yml` (suite en cada PR), `dev-images.yml` (imágenes
  `dev` en cada push a la rama) y `release.yml` (imágenes inmutables por tag).
- **Versionado único** del monorepo, con `scripts/set-version.sh` como única puerta.

### Cambiado

- **`deploy/` es sólo para levantarlo local**, sin `.env`: cada variable trae su default,
  incluido un `JWT_SECRET` de desarrollo, y el bucket de MinIO lo crea el propio compose.
  Se eliminan `local.sh`, `.env.dist` y el compose de servidor, que pasa al repo de deploy.
- **`Makefile` en la raíz** como único punto de entrada: `make up` / `stop` / `down` /
  `reset` para el stack en Docker, `make infra` + `make api` + `make web` para correr cada
  parte a mano, y `make test` / `test-integration`.
- **`documentation/`** (en inglés): features, instalación, configuración y referencia de la
  API. `README.md` y `CONTRIBUTING.md` nuevos en la raíz.
- Se eliminan la documentación, los composes y los scripts propios de `api/` y `web/`,
  restos de cuando eran repositorios separados. La licencia pasa a la raíz.
- **CI**: los tests de web vuelven a correr.

- **La imagen de la web ya no lleva configuración adentro.** La URL de la api y el Client
  ID de Google se leen al arrancar el contenedor (`API_URL`, `GOOGLE_CLIENT_ID`) y se
  escriben en `config.js`. La misma imagen publicada sirve para cualquier instalación, y el
  CI deja de pasar build-args. Se eliminan las URLs `localhost:8080` escritas a mano.

  > ⚠️ **Requiere un cambio en cada servidor antes de actualizar la imagen de la web.** El
  > servicio web tiene que recibir `API_URL` (la URL pública de la api) y, si se usa login
  > con Google, `GOOGLE_CLIENT_ID`. Sin `API_URL`, la web apunta a `http://localhost:8080`
  > y deja de funcionar. En dev: `API_URL=https://api.telescope.dev.grava.io`. El secret
  > `REACT_APP_GOOGLE_CLIENT_ID` de GitHub deja de usarse.

### Corregido

- **`make up` fallaba en `go mod download`** en máquinas con una copia vieja de
  `golang:1.26-alpine` (Go 1.26.5 contra el 1.26.6 que pide `go.mod`). Las imágenes base
  quedan fijadas: `golang:1.26.6-alpine` y `node:22-alpine`, alineadas con `go.mod` y
  `.nvmrc`.

### Seguridad

- **Login con Google**: la api rechaza access tokens emitidos para otras apps y cuentas
  con el email sin verificar.

### Conocido

- **Los evaluadores no pueden abrir las propuestas que tienen asignadas** (D-15): la
  descarga no los incluye entre quienes tienen permiso, y el panel de ranking la abre sin
  token.
