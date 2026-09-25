# 🔭 Telescopio API - Distributed Voting System

> Scalable peer review for the modern era: Distribute evaluation workload across all stakeholders using Modified Borda Count aggregation. Built for any scenario where proposals vastly outnumber available resources.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Go](https://img.shields.io/badge/Go-1.23+-blue.svg)](https://golang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-green.svg)](https://www.postgresql.org/)
[![API](https://img.shields.io/badge/API-REST-orange.svg)]()

## 📚 Table of Contents

- [Overview](#overview)
- [Theoretical Foundation](#theoretical-foundation)  
- [Mathematical Framework](#mathematical-framework)
- [System Architecture](#system-architecture)
- [API Documentation](#api-documentation)
- [Installation](#installation)
- [Usage Examples](#usage-examples)
- [Algorithm Implementation](#algorithm-implementation)
- [Performance & Scalability](#performance--scalability)
- [Contributing](#contributing)

---

## Levantar con Docker

Este repositorio levanta la **API + PostgreSQL + MinIO**. La aplicación web se levanta
aparte, desde el repositorio [`Telescopio-web`](https://github.com/gravadigital/Telescopio-web).

### Requisitos

- Docker Engine 24+ con Compose v2 (`docker compose version`)

No hace falta tener Go instalado: el binario se compila dentro del contenedor.

### Pasos

```bash
# 1. Copiar la plantilla de variables de entorno
cp .env.example .env

# 2. Generar el secreto para los JWT (obligatorio: sin esto no arranca)
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -base64 32)|" .env

# 3. Construir y levantar
docker compose up -d --build
```

La primera build tarda unos minutos. Verificar que responda:

```bash
curl http://localhost:8080/health
# {"database":"connected","service":"telescopio-api","status":"ok","version":"1.0.0"}
```

Las migraciones de la base y el bucket de MinIO se crean solos al arrancar:
no hay pasos manuales.

### Servicios

| Servicio | URL / puerto | Notas |
|---|---|---|
| API | http://localhost:8080 | `/health` para verificar |
| PostgreSQL | `localhost:5432` | credenciales según `.env` |
| Consola MinIO | http://localhost:9001 | login con `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` |
| pgAdmin (opcional) | http://localhost:5050 | `docker compose --profile tools up -d` |

### Comandos frecuentes

```bash
docker compose ps                  # estado de los contenedores
docker compose logs -f api         # ver logs de la API
docker compose restart api
docker compose down                # bajar (los datos persisten)
docker compose down -v             # bajar y BORRAR datos (base + archivos subidos)
```

---

## Variables de entorno

Todo se configura desde el `.env` (plantilla completa y comentada en `.env.example`).
`.env` está en `.gitignore`: no se commitea nunca.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `JWT_SECRET` | **sí** | Secreto para firmar los tokens. `openssl rand -base64 32`. Al cambiarlo, todas las sesiones se invalidan. |
| `API_PORT`, `POSTGRES_PORT`, `MINIO_API_PORT`, `MINIO_CONSOLE_PORT` | no | Puertos publicados. Cambiar si alguno está ocupado. |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | no | Credenciales de la base. |
| `STORAGE_PROVIDER` | no | `minio` (default) o `local`. |
| `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_BUCKET` | no | Sólo con `STORAGE_PROVIDER=minio`. |
| `CORS_ALLOW_ORIGINS` | no | `*` en local; la URL exacta de la web en producción. |
| `FRONTEND_URL` | no | URL de la web, usada en los links de los emails. |
| `GOOGLE_CLIENT_ID` | no | Login con Google. Vacío = sólo email + contraseña. Debe coincidir con el de la web. |
| `EMAIL_ENABLED` + `SMTP_*` | no | `false` (default) = no se envían mails (recuperación de contraseña, invitaciones). |

### Conectar la web a esta API

En el repo `Telescopio-web`, poner en su `.env`:

```
REACT_APP_API_URL=http://localhost:8080
```

Si cambiaste `API_PORT`, usar ese puerto. Son dos stacks independientes: la web
se comunica con la API por HTTP desde el navegador, no por la red interna de Docker.

---

## Datos de ejemplo

Al crear la base por primera vez se cargan usuarios y un evento de demo
(`admin@telescopio.com`, `alice@university.edu`, …). **No tienen contraseña**: existen
sólo como datos de prueba. Para entrar hay que registrarse desde la web.

---

## Desarrollo

<details>
<summary>Correr la API localmente (sin Docker)</summary>

Necesita Go 1.26+ y un PostgreSQL accesible. Se puede usar el del stack:

```bash
docker compose up -d postgres minio
cp .env.example .env
# descomentar el bloque "Desarrollo SIN Docker" al final del .env
go run ./cmd/api
```
</details>

<details>
<summary>Hot reload dentro de Docker</summary>

```bash
docker compose -f docker-compose.dev.yml --profile with-api up -d
```

Usa `Dockerfile.dev` + [air](https://github.com/air-verse/air) (configuración en `.air.toml`).
</details>

---

## Problemas comunes

**`port is already allocated`** — otro proceso usa ese puerto. Cambiarlo en `.env`
(ej. `API_PORT=8081`) y volver a levantar. Acordate de actualizar el `REACT_APP_API_URL` de la web.

**La API reinicia en loop** — `docker compose logs api`. Casi siempre es la base:
verificar que `telescopio-postgres` figure como `healthy` en `docker compose ps`.

**Error de CORS desde la web** — `CORS_ALLOW_ORIGINS` tiene que incluir la URL de la web
(o ser `*`), y `REACT_APP_API_URL` tiene que apuntar a la URL pública de la API
(`http://localhost:8080`), nunca al nombre interno del contenedor.

**Los tokens dejan de funcionar** — pasa al cambiar `JWT_SECRET`: cerrar sesión y volver a entrar.

**`pull access denied` / `unauthorized` al bajar MinIO** — MinIO dejó de publicar imágenes
tanto en Docker Hub como en quay.io; los compose usan `pgsty/minio` y `pgsty/mc`, builds
comunitarios del mismo código, con tag fijo.

**Empezar de cero** — `docker compose down -v && docker compose up -d --build`
(borra la base y los archivos subidos).

---

