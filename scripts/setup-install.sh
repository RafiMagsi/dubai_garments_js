#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

OPEN_BROWSER="false"
if [ "${1:-}" = "--open" ]; then
  OPEN_BROWSER="true"
fi

echo "==> Dubai Garments one-command setup"

copy_if_missing() {
  src="$1"
  dst="$2"
  if [ ! -f "$dst" ]; then
    if [ ! -f "$src" ]; then
      echo "ERROR: template file not found: $src"
      exit 1
    fi
    cp "$src" "$dst"
    echo "Created $dst from template."
  fi
}

copy_if_missing ".env.docker.example" ".env.docker.local"
copy_if_missing "apps/storefront-dubai_garments/.env.docker.example" "apps/storefront-dubai_garments/.env.docker.local"
copy_if_missing "services/fastapi_quote_api/.env.docker.example" "services/fastapi_quote_api/.env.docker.local"

if [ -f ".env.docker.local" ]; then
  set -a
  # shellcheck disable=SC1091
  . "./.env.docker.local"
  set +a
fi

echo "==> Starting docker services (build + detached)..."
docker compose up -d --build

echo "==> Waiting for storefront to become reachable..."
ATTEMPTS=90
SLEEP_SECS=2
i=1
while [ "$i" -le "$ATTEMPTS" ]; do
  if curl -fsS "http://localhost:3000/api/metrics" >/dev/null 2>&1; then
    echo "Storefront is up."
    break
  fi
  sleep "$SLEEP_SECS"
  i=$((i + 1))
done

if [ "$i" -gt "$ATTEMPTS" ]; then
  echo "ERROR: Storefront did not become ready in time."
  echo "Check logs: docker compose logs -f storefront"
  exit 1
fi

echo "==> Running database migrations inside storefront container..."
MIGRATE_OK="false"
j=1
while [ "$j" -le 20 ]; do
  if docker compose run --rm -T \
    -e DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-change_this_password}@postgres:5432/${POSTGRES_DB:-dubai_garments}" \
    -v "$ROOT_DIR/apps/storefront-dubai_garments:/work" \
    -w /work \
    postgres sh ./scripts/db-migrate.sh >/tmp/dg_migrate.log 2>&1; then
    MIGRATE_OK="true"
    break
  fi
  sleep 2
  j=$((j + 1))
done

if [ "$MIGRATE_OK" != "true" ]; then
  echo "ERROR: Migration failed."
  cat /tmp/dg_migrate.log || true
  exit 1
fi

TOKEN="$(grep -E '^INSTALL_SETUP_TOKEN=' apps/storefront-dubai_garments/.env.docker.local 2>/dev/null | head -n1 | cut -d'=' -f2- || true)"
TOKEN="$(printf "%s" "$TOKEN" | tr -d '\r\n')"

INSTALL_URL="http://localhost:3000/install"
if [ -n "$TOKEN" ]; then
  INSTALL_URL="${INSTALL_URL}?token=${TOKEN}"
fi

echo ""
echo "==> Setup complete."
echo "Open this URL to run installer:"
echo "$INSTALL_URL"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f storefront"
echo "  docker compose logs -f fastapi"
echo "  docker compose down"

if [ "$OPEN_BROWSER" = "true" ]; then
  if command -v open >/dev/null 2>&1; then
    open "$INSTALL_URL" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$INSTALL_URL" >/dev/null 2>&1 || true
  fi
fi
