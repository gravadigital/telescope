#!/usr/bin/env bash
#
# Fija la versión de todo el monorepo de una sola vez.
#
# Los dos servicios se publican juntos y llevan siempre el mismo número —ver la
# política de versionado en CHANGELOG.md—. Ese número vive en más de un lugar, así
# que subirlo a mano significa editar tres archivos sin olvidarse de ninguno. Este
# script es la única puerta de entrada.
#
#   scripts/set-version.sh 1.2.3
#   scripts/set-version.sh --check      # verifica que todos coincidan
#
# release.yml corre --check contra el tag de git, así que un tag que no coincide con
# el árbol falla el build en vez de publicar imágenes mal etiquetadas.
#
# VERSION (en la raíz) es la fuente: la api en Go no tiene dónde declarar su versión
# —no hay package.json— y meterle un version.go sería código que existe sólo para
# eso. El Dockerfile la recibe por --build-arg y la compila con -ldflags.
#
# Sólo se toca deploy/.env.dist, que es la plantilla versionada. Un deploy/.env real
# puede apuntar las mismas variables al tag `dev`: ese archivo no se versiona y este
# script no lo lee.

set -euo pipefail

cd "$(dirname "$0")/.."

VERSION_FILE=VERSION
WEB_PACKAGE=web/package.json
ENV_DIST=deploy/.env.dist
ENV_VARS=(API_VERSION WEB_VERSION)

die() { echo "error: $*" >&2; exit 1; }

# --check: reporta la discrepancia en vez de escribir. Imprime cada versión que
# encuentra, así un fallo de CI muestra dónde está el desajuste y no sólo un exit code.
if [[ "${1:-}" == "--check" ]]; then
  expected=$(cat "$VERSION_FILE")
  status=0

  got=$(node -p "require('./$WEB_PACKAGE').version")
  if [[ "$got" != "$expected" ]]; then
    echo "MISMATCH $WEB_PACKAGE: $got (VERSION dice $expected)"
    status=1
  fi

  for var in "${ENV_VARS[@]}"; do
    got=$(grep -E "^${var}=" "$ENV_DIST" | cut -d= -f2-)
    if [[ "$got" != "$expected" ]]; then
      echo "MISMATCH $ENV_DIST $var: $got (VERSION dice $expected)"
      status=1
    fi
  done

  if [[ $status -eq 0 ]]; then
    echo "ok: todo reporta $expected"
  fi
  exit $status
fi

VERSION="${1:-}"
[[ -n "$VERSION" ]] || die "uso: $0 <version> | --check"

# Rechaza cualquier cosa que no sea semver pelado. El desliz común es la 'v' de
# adelante: la lleva el tag de git, el archivo no.
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
  die "'$VERSION' no es semver (se espera 1.2.3 o 1.2.3-rc.1, sin 'v' adelante)"
fi

echo "Fijando el monorepo en $VERSION"

echo "$VERSION" > "$VERSION_FILE"
echo "  $VERSION_FILE"

node -e "
  const fs = require('fs');
  const p = '$WEB_PACKAGE';
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  d.version = '$VERSION';
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
"
echo "  $WEB_PACKAGE"

# Los *_VERSION eligen qué tag de imagen publicada levanta un compose. Siguen al
# release para que un clon de un árbol tagueado apunte a las imágenes que le
# corresponden.
for var in "${ENV_VARS[@]}"; do
  grep -qE "^${var}=" "$ENV_DIST" || die "$ENV_DIST no tiene $var para actualizar"
  sed -i -E "s|^${var}=.*|${var}=${VERSION}|" "$ENV_DIST"
  echo "  $ENV_DIST $var"
done

# Mantiene el lockfile en sintonía. --package-lock-only no toca node_modules.
(cd web && npm install --package-lock-only >/dev/null 2>&1)
echo "  web/package-lock.json"

echo
echo "Listo. Revisá con 'git diff' y después:"
echo "  - pasá las entradas de [Unreleased] del CHANGELOG bajo [$VERSION]"
echo "  - commiteá, mergeá a main y tagueá v$VERSION"
