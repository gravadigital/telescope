---
id: config
display_name: Configuración de entorno (os.Getenv + godotenv)
language: golang
description: Manual env loading into a nested Config struct with defaults, no validation at startup
applies_to: [api]
required_by: []
package: github.com/joho/godotenv
---

# Configuration (telescopio-api)

> **Reemplaza la convención del catálogo**, que usa `caarlos0/env` con tags y validación
> al arranque. Acá la carga es **manual** con `os.Getenv` y helpers de conversión.

## Cómo funciona

`config.Load()` (`internal/config/config.go`) carga un `.env` si existe y llena un struct
anidado por área:

```go
cfg := config.Load()
cfg.DB.Host
cfg.Storage.Provider
cfg.Email.Enabled
```

Helpers: `getEnv(key, default)`, `getEnvAsInt64`, `getEnvAsBool`. Un valor vacío o no
parseable cae al default silenciosamente.

## Agregar una variable

1. Agregá el campo al área que corresponde del struct `Config`.
2. Cargalo en `Load()` con el helper y un default explícito.
3. Documentalo en la tabla de abajo y en el `.env.example` si existe.

Si el área es nueva, creá un struct anidado nuevo en vez de colgar el campo en la raíz.

## Variables

| Variable | Default | Para qué |
|---|---|---|
| `DB_HOST` | `localhost` | Postgres |
| `DB_PORT` | `5432` | |
| `DB_USER` | `telescopio` | |
| `DB_PASSWORD` | `telescopio_password` | |
| `DB_NAME` | `telescopio_db` | |
| `DB_SSLMODE` | `disable` | |
| `PORT` | `8080` | Puerto HTTP |
| `GIN_MODE` | `debug` | Modo de Gin; también define el nivel de log |
| `FRONTEND_URL` | `http://localhost:3000` | Base para links en emails |
| `UPLOADS_DIR` | `./uploads` | |
| `MAX_FILE_SIZE` | `10485760` (10MB) | Límite de subida |
| `STORAGE_PROVIDER` | `local` | `local` o `minio` |
| `STORAGE_LOCAL_PATH` | `./uploads` | |
| `MINIO_ENDPOINT` | `localhost:9000` | |
| `MINIO_ACCESS_KEY` | `""` | Obligatoria si el provider es `minio` |
| `MINIO_SECRET_KEY` | `""` | Obligatoria si el provider es `minio` |
| `MINIO_BUCKET` | `telescopio` | |
| `MINIO_USE_SSL` | `false` | |
| `MINIO_REGION` | `us-east-1` | |
| `CORS_ALLOW_ORIGINS` | `*` | Lista separada por comas, o `*` |
| `CORS_ALLOW_METHODS` | `GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS` | |
| `CORS_ALLOW_HEADERS` | `Origin,Content-Length,Content-Type,Authorization` | |
| `EMAIL_ENABLED` | `false` | Si es `false`, los envíos se saltean sin error |
| `SMTP_HOST` / `SMTP_PORT` | `""` / `587` | |
| `SMTP_USER` / `SMTP_PASSWORD` | `""` | |
| `SMTP_SECURE` | `false` | `true` = TLS directo (465), `false` = STARTTLS (587) |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | `""` / `Telescopio` | |
| `GOOGLE_CLIENT_ID` | `""` | Google OAuth |
| `JWT_SECRET` | ⚠️ ver abajo | Firma de tokens |

## Limitación importante: no hay validación al arranque

Todos los valores tienen default y **ninguno se valida**. El servicio arranca aunque falte
configuración crítica, y falla después en runtime:

- **`JWT_SECRET` no se lee en `config.Load()`** sino en el `init()` de
  `internal/middleware/auth/jwt.go`, y si falta usa un default hardcodeado con solo un
  warning por consola. En producción eso es explotable.
- Las credenciales de MinIO sí se chequean, pero recién al construir el storage.
- Una `DB_PASSWORD` incorrecta se descubre al fallar la conexión.

Al agregar una variable que no puede tener default seguro (secretos, credenciales), validá
su presencia explícitamente en `Load()` y abortá el arranque. Es preferible a fallar más
tarde, y es lo que pide el catálogo.
