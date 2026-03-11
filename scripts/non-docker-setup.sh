#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STOREFRONT_DIR="$ROOT_DIR/apps/storefront-dubai_garments"
FASTAPI_DIR="$ROOT_DIR/services/fastapi_quote_api"
AI_DIR="$ROOT_DIR/services/ai_openai_service"

SKIP_BUILD=false
SKIP_SEED=false

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    --skip-seed) SKIP_SEED=true ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: ./scripts/non-docker-setup.sh [--skip-build] [--skip-seed]"
      exit 1
      ;;
  esac
done

log() {
  printf "\n==> %s\n" "$1"
}

ensure_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

copy_if_missing() {
  local src="$1"
  local dest="$2"
  if [ -f "$dest" ]; then
    return
  fi
  if [ ! -f "$src" ]; then
    echo "Missing template file: $src"
    exit 1
  fi
  cp "$src" "$dest"
  echo "Created $dest from template"
}

ensure_database_url_configured() {
  local env_file="$1"
  if [ ! -f "$env_file" ]; then
    echo "Missing env file: $env_file"
    exit 1
  fi

  local line
  line="$(grep '^DATABASE_URL=' "$env_file" || true)"
  if [ -z "$line" ]; then
    echo "DATABASE_URL is missing in $env_file"
    exit 1
  fi

  if printf "%s" "$line" | grep -q '<DB_USER>'; then
    echo "DATABASE_URL in $env_file still contains placeholders."
    echo "Update env values, then re-run setup."
    exit 1
  fi
}

setup_python_service() {
  local service_dir="$1"
  local service_name="$2"

  log "Setting up Python env for $service_name"
  cd "$service_dir"

  if [ ! -d ".venv" ]; then
    python3 -m venv .venv
  fi

  ./.venv/bin/python -m pip install --upgrade pip
  ./.venv/bin/pip install -r requirements.txt
}

log "Validating local prerequisites"
ensure_cmd node
ensure_cmd npm
ensure_cmd python3
ensure_cmd psql

log "Preparing env files"
copy_if_missing "$STOREFRONT_DIR/.env.example" "$STOREFRONT_DIR/.env.local"
copy_if_missing "$FASTAPI_DIR/.env.example" "$FASTAPI_DIR/.env"
copy_if_missing "$AI_DIR/.env.example" "$AI_DIR/.env"

ensure_database_url_configured "$STOREFRONT_DIR/.env.local"
ensure_database_url_configured "$FASTAPI_DIR/.env"

log "Installing storefront dependencies"
cd "$STOREFRONT_DIR"
npm ci
npm run prisma:generate

setup_python_service "$FASTAPI_DIR" "FastAPI"
setup_python_service "$AI_DIR" "AI OpenAI service"

log "Running DB migrations"
cd "$STOREFRONT_DIR"
./scripts/db-migrate.sh

if [ "$SKIP_SEED" = false ]; then
  log "Seeding catalog data"
  ./scripts/db-seed.sh
else
  log "Skipping DB seed (--skip-seed)"
fi

if [ "$SKIP_BUILD" = false ]; then
  log "Building storefront production bundle"
  npm run build
else
  log "Skipping storefront build (--skip-build)"
fi

cat <<EOF

Non-Docker setup completed.

Next steps (systemd):
  1) sudo ./scripts/install-systemd-units.sh
  2) sudo systemctl status dubai-garments-storefront dubai-garments-fastapi dubai-garments-worker
  3) Open: http://localhost:3000/install

Optional:
  - Start AI service unit too:
      sudo ./scripts/install-systemd-units.sh --enable-ai
EOF
