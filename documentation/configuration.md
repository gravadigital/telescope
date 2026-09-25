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

Both published images read their configuration from environment variables when the
container starts. Neither carries the settings of any installation, so the same image runs
anywhere: changing a value means recreating the container, not rebuilding the image.

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

> **Upgrading from an image built before this change:** those images had the api URL baked in
> and needed no variables. Current images need `API_URL` set on the web container, or the web
> points at `http://localhost:8080`. Add it before pulling the new image.

| Variable | What goes in it |
|---|---|
| `API_URL` | The public URL of the api, **as the browser sees it** — never an internal container name like `http://api:8080`. Empty falls back to `http://localhost:8080` |
| `GOOGLE_CLIENT_ID` | Same value as the api's `GOOGLE_CLIENT_ID`, or empty to hide the Google button |

```sh
docker run -p 80:80 \
  -e API_URL=https://api.example.com \
  -e GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com \
  gravadigital/telescope-web:1.2.3
```

How it works: the web is a static bundle, and Create React App would bake any
`REACT_APP_*` into it at build time. Instead, when the container starts, a script writes
these two variables into `/config.js`, which `index.html` loads before the app. The file is
served with `Cache-Control: no-store`, so a new value is picked up on the next page load.
The container logs what it wrote: `runtime config: API_URL=...`.

`REACT_APP_API_URL` and `REACT_APP_GOOGLE_CLIENT_ID` still work, but only outside Docker:
`make web` uses them, because there is no container to write `config.js`.
