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
  if [ -f "$ROOT_DIR/.env.local" ]; then
    load_env_file "$ROOT_DIR/.env.local"
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

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

is_baseline_applied() {
  migration_name="$1"

  case "$migration_name" in
    "0001_initial_schema.up.sql")
      # If core tables already exist, treat initial schema as already applied.
      users_exists="$(psql "$DATABASE_URL" -tAc "SELECT to_regclass('public.users') IS NOT NULL;")"
      products_exists="$(psql "$DATABASE_URL" -tAc "SELECT to_regclass('public.products') IS NOT NULL;")"
      [ "$users_exists" = "t" ] && [ "$products_exists" = "t" ]
      ;;
    "0002_products_catalog_fields.up.sql")
      # If 0002 columns exist, treat it as already applied.
      sizes_exists="$(psql "$DATABASE_URL" -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'sizes');")"
      [ "$sizes_exists" = "t" ]
      ;;
    *)
      return 1
      ;;
  esac
}

if ! find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.up.sql' | grep -q .; then
  echo "No up migration files found in $MIGRATIONS_DIR"
  exit 0
fi

migration_list="$(mktemp)"
find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.up.sql' | sort > "$migration_list"

while IFS= read -r file; do
  name="$(basename "$file")"
  already_applied="$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM schema_migrations WHERE name = '$name' LIMIT 1;")"

  if [ "$already_applied" = "1" ]; then
    echo "Skipping already applied: $name"
    continue
  fi

  if is_baseline_applied "$name"; then
    echo "Baselining existing migration: $name"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "INSERT INTO schema_migrations(name) VALUES ('$name') ON CONFLICT (name) DO NOTHING;"
    continue
  fi

  echo "Applying migration: $name"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "INSERT INTO schema_migrations(name) VALUES ('$name');"
done < "$migration_list"

rm -f "$migration_list"

echo "Migrations completed successfully."
