# deploy

The Docker Compose stack that runs Telescope locally: PostgreSQL, MinIO with its bucket, and
the api and web built from the repository.

Use it through the `Makefile` at the repository root (`make up`, `make infra`, …). Without
`make`, from this directory:

```sh
docker compose up -d --build   # start
docker compose stop            # stop, keeping the data
docker compose down -v         # remove everything, data included
```

No `.env` is needed; an optional `deploy/.env` overrides the defaults.

- How to run it: [documentation/installation.md](../documentation/installation.md)
- What can be configured: [documentation/configuration.md](../documentation/configuration.md)

Local only: the default secrets are public. Server deployments are kept in a separate
repository.
