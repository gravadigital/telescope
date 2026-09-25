#!/usr/bin/env bash
#
# local.sh — levanta todo Telescope en esta máquina.
#
#   ./local.sh up      levanta todo
#   ./local.sh stop    frena los contenedores y conserva los datos
#   ./local.sh down    baja todo y borra los datos
#   ./local.sh logs    sigue los logs (opcional: ./local.sh logs api)
#
# Antes del primer arranque hay una sola cosa que preparar:
#
#   cp .env.dist .env   y completar JWT_SECRET
#
# El resto ya viene apuntado en .env.dist. El storage es local: `up` levanta MinIO y
# le crea el bucket, que la api NO crea —firma contra un bucket que da por existente—.
#
# Las migraciones las corre la api al arrancar, así que la base parte vacía y no hace
# falta ningún dump.

set -euo pipefail
cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.local.yml"

[[ -f .env ]] || {
  echo "falta deploy/.env — copialo de .env.dist y completalo:" >&2
  echo "  cp deploy/.env.dist deploy/.env" >&2
  exit 1
}
set -a; . ./.env; set +a

case "${1:-up}" in
  up)
    # Se chequea acá y no se deja al contenedor porque un JWT_SECRET vacío hace que la
    # api arranque y falle recién al primer login, que es mucho más caro de diagnosticar
    # que este mensaje.
    [[ -n "${JWT_SECRET:-}" ]] || {
      echo "JWT_SECRET está vacío en deploy/.env: la api no puede firmar tokens." >&2
      echo "" >&2
      echo "Generá uno:" >&2
      echo "  openssl rand -base64 32" >&2
      exit 1
    }

    echo "==> base de datos"
    $COMPOSE up -d database
    until docker exec telescope-local-database pg_isready -U "$POSTGRES_USER" -q 2>/dev/null; do
      sleep 1
    done

    # El bucket se crea acá y no en el compose local: es bootstrap del entorno. MinIO
    # arranca con el disco vacío y la api da el bucket por existente, así que sin este
    # paso la primera subida de un archivo falla con NoSuchBucket.
    echo "==> storage"
    $COMPOSE up -d minio
    until docker exec telescope-local-minio mc ready local >/dev/null 2>&1; do sleep 1; done
    docker exec telescope-local-minio sh -c "
      until mc alias set local http://127.0.0.1:9000 '$MINIO_ACCESS_KEY' '$MINIO_SECRET_KEY' >/dev/null 2>&1; do sleep 1; done
      mc mb --ignore-existing local/'$MINIO_BUCKET' >/dev/null
    "

    # --build en cada up: la web congela REACT_APP_* al construir, así que una imagen
    # vieja seguiría apuntando a la URL anterior sin ningún aviso.
    echo "==> api y web"
    $COMPOSE up -d --build

    echo
    echo "listo:"
    echo "  web       http://localhost:${WEB_PORT:-3000}"
    echo "  api       http://localhost:${API_PORT:-8080}"
    echo "  minio     http://localhost:${MINIO_CONSOLE_PORT:-9001}  (consola)"
    ;;

  stop)
    # Sin borrar volúmenes: la base y los archivos subidos quedan para el próximo `up`.
    $COMPOSE stop
    ;;

  down)
    $COMPOSE down -v
    ;;

  logs)
    $COMPOSE logs -f "${2:-}"
    ;;

  *)
    echo "uso: ./local.sh [up|stop|down|logs]" >&2
    exit 1
    ;;
esac
