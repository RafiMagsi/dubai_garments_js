#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-docker}"
REF="${2:-main}"
SKIP_GIT_SYNC="${SKIP_GIT_SYNC:-false}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STOREFRONT_DIR="$ROOT_DIR/apps/storefront-dubai_garments"
FASTAPI_DIR="$ROOT_DIR/services/fastapi_quote_api"

log() {
  printf "\n==> %s\n" "$1"
}

ensure_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_file() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo "Missing required file: $file"
    exit 1
  fi
}

load_root_env() {
  if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "$ROOT_DIR/.env"
    set +a
  fi
}

sync_code() {
  if [ "$SKIP_GIT_SYNC" = "true" ]; then
    log "Skipping git sync (SKIP_GIT_SYNC=true)"
    return
  fi
  log "Syncing code ($REF)"
  ensure_cmd git
  git fetch origin "$REF"
  git checkout "$REF"
  git pull --ff-only origin "$REF"
}

deploy_docker() {
  log "Deploy mode: docker"
  ensure_cmd docker
  sync_code

  ./scripts/deploy-docker-core.sh
}

deploy_docker_prod() {
  log "Deploy mode: docker-prod"
  ensure_cmd docker
  sync_code

  require_file ".env"
  require_file "apps/storefront-dubai_garments/.env"
  require_file "services/fastapi_quote_api/.env"
  require_file "docker-compose.prod.yml"
  load_root_env

  log "Building production services"
  docker compose -f docker-compose.prod.yml build

  log "Starting production services"
  docker compose -f docker-compose.prod.yml up -d

  log "Running database migrations"
  docker compose -f docker-compose.prod.yml run --rm -T \
    -e DATABASE_URL="postgresql://${POSTGRES_USER:-rafi}:${POSTGRES_PASSWORD:-secret}@postgres:5432/${POSTGRES_DB:-dubai_garments}" \
    -v "$STOREFRONT_DIR:/work" \
    -w /work \
    postgres sh ./scripts/db-migrate.sh

  log "Production docker deploy completed"
}

deploy_systemd() {
  log "Deploy mode: systemd"
  ensure_cmd node
  ensure_cmd npm
  ensure_cmd python3

  sync_code

  ./scripts/non-docker-setup.sh --skip-seed

  if command -v systemctl >/dev/null 2>&1; then
    if sudo -n true >/dev/null 2>&1; then
      log "Restarting systemd services"
      sudo systemctl restart dubai-garments-fastapi.service
      sudo systemctl restart dubai-garments-worker.service
      sudo systemctl restart dubai-garments-storefront.service
    else
      log "Skipping systemctl restart (sudo password required)"
      echo "Run manually:"
      echo "  sudo systemctl restart dubai-garments-fastapi dubai-garments-worker dubai-garments-storefront"
    fi
  fi

  log "Running DB migrate + Prisma generate (post-restart safety)"
  (
    cd "$STOREFRONT_DIR"
    npm run prisma:generate
    ./scripts/db-migrate.sh
  )

  log "Systemd deploy completed"
}

cd "$ROOT_DIR"

case "$MODE" in
  docker) deploy_docker ;;
  docker-prod) deploy_docker_prod ;;
  systemd) deploy_systemd ;;
  *)
    echo "Invalid mode: $MODE"
    echo "Usage: ./scripts/github-deploy.sh [docker|docker-prod|systemd] [branch]"
    exit 1
    ;;
esac

echo
echo "Deploy completed."
if [ "$MODE" = "docker-prod" ]; then
  echo "Storefront: http://127.0.0.1:3005"
  echo "FastAPI:    internal-only via docker network"
else
  echo "Storefront: http://localhost:3000"
  echo "FastAPI:    http://localhost:8000/health"
fi
