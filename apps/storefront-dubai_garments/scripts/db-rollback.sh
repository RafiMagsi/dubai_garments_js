#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/database/migrations"

load_env_file() {
  env_file="$1"
  [ -f "$env_file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|\#*) continue ;;
    esac
    key="${line%%=*}"
    value="${line#*=}"
    [ -z "$key" ] && continue
    export "$key=$value"
  done <"$env_file"
}

# If DATABASE_URL is already provided (e.g. Docker env), do not override it.
# Otherwise, load local env first, then fallback to .env.
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f "$ROOT_DIR/.env.test" ]; then
    load_env_file "$ROOT_DIR/.env.test"
  elif [ -f "$ROOT_DIR/.env" ]; then
    load_env_file "$ROOT_DIR/.env"
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set."
  echo "Example: export DATABASE_URL=postgresql://user:pass@localhost:5432/dbname"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql command not found. Please install PostgreSQL client tools."
  exit 1
fi

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

latest_up="$(psql "$DATABASE_URL" -tAc "SELECT name FROM schema_migrations ORDER BY applied_at DESC, name DESC LIMIT 1;")"

if [ -z "$latest_up" ]; then
  echo "No applied migrations found in schema_migrations."
  exit 0
fi

base="${latest_up%.up.sql}"
down_file="$MIGRATIONS_DIR/${base}.down.sql"

if [ ! -f "$down_file" ]; then
  echo "Rollback file not found for $latest_up"
  echo "Expected: $down_file"
  exit 1
fi

echo "Rolling back migration: $(basename "$down_file")"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$down_file"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "DELETE FROM schema_migrations WHERE name = '$latest_up';"

echo "Rollback completed successfully."
