# Configuration

Telescope has two kinds of configuration: what you may change when running it **locally**,
and what a **server** must set. Locally nothing is required.

## Locally

Every setting has a working default in `deploy/docker-compose.yml`. To change one, create
`deploy/.env` — it is read both by docker compose and by the `Makefile`, so the same file
applies whether you use `make up` or `make api` / `make web`. It is not versioned.

### Login with Google

The only setting most people will want. Without it, login is by email and password only, and
the web hides the Google button.

```sh
# deploy/.env
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
```

In the Google Cloud console, the client ID must list `http://localhost:3000` among its
authorised JavaScript origins. No client secret is needed: the web uses the implicit flow, and
the api checks with Google that the token was issued for this client ID and that the email is
verified.

Rebuild afterwards (`make up`, or restart `make web`): the web reads the client ID at build
time.

### Everything else

| Variable | Default | What it is for |
|---|---|---|
| `WEB_PORT` / `API_PORT` | `3000` / `8080` | Published ports of the web and the api |
| `POSTGRES_PORT` | `5432` | Published port of the database |
| `MINIO_API_PORT` / `MINIO_CONSOLE_PORT` | `9000` / `9001` | Published ports of MinIO |
| `JWT_SECRET` | a fixed development value | Signs the session tokens |
| `EMAIL_ENABLED` | `false` | Set to `true` to send email; needs the `SMTP_*` variables below |
| `GIN_MODE` | `release` (`debug` with `make api`) | `debug` for verbose api logs |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `telescope_db` / `telescope` / `telescope_password` | Database credentials |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET` | `minioadmin` / `minioadmin123` / `telescope` | Storage credentials and bucket |

Changing the database credentials after the first start has no effect on the existing
database: PostgreSQL only reads them when it initialises an empty volume. `make reset` starts
over.

## On a server

The published images carry the api's configuration as environment variables, read at
startup. The web is different: its settings are baked in when the image is built.

### api

**These must be set.** Their defaults are for development and are public:

| Variable | What goes in it |
|---|---|
| `JWT_SECRET` | A random secret: `openssl rand -base64 32`. Changing it logs everybody out |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | The PostgreSQL connection |
| `DB_SSLMODE` | `require` if the database is not on the same private network |
| `STORAGE_PROVIDER` | `minio` — the default, `local`, writes to the container's disk |
| `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` | The S3-compatible storage. **The bucket must exist**: the api does not create it |
| `MINIO_USE_SSL`, `MINIO_REGION` | `true` for a TLS endpoint; the region, default `us-east-1` |
| `FRONTEND_URL` | The public URL of the web, used in the links inside emails |
| `CORS_ALLOW_ORIGINS` | The public URL of the web. The default, `*`, accepts any origin |

> If `JWT_SECRET` is missing, the api still starts, with a hardcoded default and only a warning
> in the log. Anyone who knows that default can sign valid tokens. Always set it.

**Optional:**

| Variable | Default | What it is for |
|---|---|---|
| `PORT` | `8080` | Port the api listens on |
| `GIN_MODE` | `debug` | Set `release` in production. `debug` logs the database connection string, password included |
| `MAX_FILE_SIZE` | `10485760` (10 MB) | Largest proposal accepted, in bytes |
| `GOOGLE_CLIENT_ID` | empty | Enables login with Google. Must be the one the web was built with |
| `EMAIL_ENABLED` | `false` | With `false`, no email is sent and nothing fails |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | —, `587`, —, — | The mail server |
| `SMTP_SECURE` | `false` | `true` for TLS from the start (port 465), `false` for STARTTLS (587) |
| `EMAIL_FROM`, `EMAIL_FROM_NAME` | —, `Telescopio` | The sender |
| `CORS_ALLOW_METHODS`, `CORS_ALLOW_HEADERS` | the ones the web uses | Rarely changed |

Configuration is not validated at startup: a wrong value shows up later, when it is first
used. Check `/health` after deploying — it reports whether the database is reachable.

### web

Built into the image, not read at startup. Changing either means building a new image.

| Build argument | What goes in it |
|---|---|
| `REACT_APP_API_URL` | The public URL of the api, **as the browser sees it** — never an internal container name |
| `REACT_APP_GOOGLE_CLIENT_ID` | Same value as the api's `GOOGLE_CLIENT_ID`, or empty |

The images published by CI are built with these fixed per environment: the `dev` tag points at
`https://api.telescope.dev.grava.io`, and release tags at `https://api.telescope.grava.io`.
To point at another api, build the image yourself:

```sh
docker build web -f web/docker/Dockerfile \
  --build-arg REACT_APP_API_URL=https://api.example.com \
  -t telescope-web
```
