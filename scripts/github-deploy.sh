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

  ./scripts/setup-install.sh
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
  systemd) deploy_systemd ;;
  *)
    echo "Invalid mode: $MODE"
    echo "Usage: ./scripts/github-deploy.sh [docker|systemd] [branch]"
    exit 1
    ;;
esac

echo
echo "Deploy completed."
echo "Storefront: http://localhost:3000"
echo "FastAPI:    http://localhost:8000/health"
