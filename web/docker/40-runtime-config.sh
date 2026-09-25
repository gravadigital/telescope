#!/bin/sh
# Escribe la configuración de la web a partir del entorno del contenedor. Lo corre el
# entrypoint de la imagen de nginx (todo lo que está en /docker-entrypoint.d/) antes de
# arrancar, así la misma imagen sirve para cualquier instalación:
#
#   docker run -e API_URL=https://api.example.com -e GOOGLE_CLIENT_ID=... telescope-web
#
# Ver src/config/runtime.ts para cómo lo lee la app.
set -eu

# Escapa \ y " para que un valor no pueda romper el literal de JavaScript.
js_string() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

cat > /usr/share/nginx/html/config.js <<CONFIG
window.__CONFIG__ = {
  API_URL: "$(js_string "${API_URL:-}")",
  GOOGLE_CLIENT_ID: "$(js_string "${GOOGLE_CLIENT_ID:-}")"
};
CONFIG

echo "runtime config: API_URL=${API_URL:-<vacío, usa http://localhost:8080>} GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:+configurado}"
