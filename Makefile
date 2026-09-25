# Entry point for working on Telescope locally. Run `make` to list the commands.
#
# Everything runs against the stack in deploy/docker-compose.yml, so there is one
# database and one MinIO whether the api runs in a container or with `go run`.
#
# No .env is needed. deploy/.env is optional and is read both by docker compose and
# by this Makefile, so a GOOGLE_CLIENT_ID set there reaches every way of running.

COMPOSE := docker compose -f deploy/docker-compose.yml

-include deploy/.env

# Same defaults as deploy/docker-compose.yml. The api's own defaults in Go
# (telescopio / telescopio_db, local file storage) do not match the stack, so
# running it outside Docker needs these passed explicitly.
POSTGRES_DB       ?= telescope_db
POSTGRES_USER     ?= telescope
POSTGRES_PASSWORD ?= telescope_password
POSTGRES_PORT     ?= 5432
MINIO_ACCESS_KEY  ?= minioadmin
MINIO_SECRET_KEY  ?= minioadmin123
MINIO_BUCKET      ?= telescope
MINIO_API_PORT    ?= 9000
API_PORT          ?= 8080
WEB_PORT          ?= 3000
JWT_SECRET        ?= telescope-local-dev-secret-no-usar-en-produccion
GOOGLE_CLIENT_ID  ?=

API_ENV = \
	DB_HOST=localhost DB_PORT=$(POSTGRES_PORT) DB_SSLMODE=disable \
	DB_USER=$(POSTGRES_USER) DB_PASSWORD=$(POSTGRES_PASSWORD) DB_NAME=$(POSTGRES_DB) \
	STORAGE_PROVIDER=minio MINIO_ENDPOINT=localhost:$(MINIO_API_PORT) MINIO_USE_SSL=false \
	MINIO_ACCESS_KEY=$(MINIO_ACCESS_KEY) MINIO_SECRET_KEY=$(MINIO_SECRET_KEY) MINIO_BUCKET=$(MINIO_BUCKET) \
	PORT=$(API_PORT) FRONTEND_URL=http://localhost:$(WEB_PORT) GIN_MODE=debug \
	JWT_SECRET='$(JWT_SECRET)' GOOGLE_CLIENT_ID=$(GOOGLE_CLIENT_ID)

.DEFAULT_GOAL := help
.PHONY: help up stop down reset logs infra api web test test-integration

help: ## List the commands
	@awk 'BEGIN {FS = ":.*## "} /^[a-z-]+:.*## / { printf "  make %-18s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# --- The whole stack in Docker ------------------------------------------------

up: ## Build and start everything in Docker
	$(COMPOSE) up -d --build
	@echo
	@echo "  web    http://localhost:$(WEB_PORT)"
	@echo "  api    http://localhost:$(API_PORT)"

stop: ## Stop everything, keeping the data
	$(COMPOSE) stop

down: ## Remove the containers, keeping the data
	$(COMPOSE) down

reset: ## Remove everything, data included
	$(COMPOSE) down -v

logs: ## Follow the logs (one service: make logs s=api)
	$(COMPOSE) logs -f $(s)

# --- Running api and web by hand ----------------------------------------------

# The api and web containers are stopped so `make api` and `make web` can take
# their ports. The bucket is created before returning: the api assumes it exists.
infra: ## Start only the database and MinIO, to run api and web by hand
	-@$(COMPOSE) stop api web 2>/dev/null
	$(COMPOSE) up -d --wait database minio
	$(COMPOSE) up minio-init --no-log-prefix

api: ## Run the api with go run, against `make infra`
	cd api && $(API_ENV) go run ./cmd/api

web: web/node_modules ## Run the web with npm start, against `make api`
	cd web && BROWSER=none PORT=$(WEB_PORT) \
		REACT_APP_API_URL=http://localhost:$(API_PORT) \
		REACT_APP_GOOGLE_CLIENT_ID=$(GOOGLE_CLIENT_ID) \
		npm start

# --- Tests --------------------------------------------------------------------

test: web/node_modules ## Unit tests of api and web (no Docker needed)
	cd api && go vet ./... && go test -race ./...
	cd web && CI=true npm test

# Uses its own database in the stack's PostgreSQL, so running the migrations
# under test never touches the data you work with.
test-integration: ## Integration tests of the api, against the stack's database
	$(COMPOSE) up -d --wait database
	@$(COMPOSE) exec -T database psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) -tAc \
		"SELECT 1 FROM pg_database WHERE datname = 'telescope_test'" | grep -q 1 || \
		$(COMPOSE) exec -T database createdb -U $(POSTGRES_USER) telescope_test
	cd api && $(API_ENV) TEST_DB_NAME=telescope_test go test -tags=integration -count=1 ./...

web/node_modules: web/package-lock.json
	cd web && npm ci
	@touch $@
