#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

load_env_file() {
  env_file="$1"
  [ -f "$env_file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|\#*) continue ;;
    esac
    key="${line%%=*}"
    value="${line#*=}"
    case "$key" in
      [A-Za-z_][A-Za-z0-9_]*) ;;
      *) continue ;;
    esac
    current_value="$(printenv "$key" 2>/dev/null || true)"
    if [ -z "$current_value" ]; then
      export "$key=$value"
    fi
  done <"$env_file"
}

# Preserve explicitly provided shell env values. Fill gaps from .env / .env.test.
load_env_file "$ROOT_DIR/.env"
load_env_file "$ROOT_DIR/.env.test"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set."
  echo "Set DATABASE_URL in .env or .env.test before running demo reset."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql command not found. Please install PostgreSQL client tools."
  exit 1
fi

echo "==> Demo reset: dropping and recreating public schema"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
SQL

echo "==> Demo reset: applying migrations"
"$ROOT_DIR/scripts/db-migrate.sh"

echo "==> Demo reset: seeding catalog and demo data"
"$ROOT_DIR/scripts/db-seed.sh"

echo "==> Demo reset: seeding demo users"
"$ROOT_DIR/scripts/db-seed-users.sh"

echo "==> Demo reset completed successfully"
