#!/usr/bin/env bash
set -euo pipefail

TABLE_NAME="${1:-}"
SOURCE_DB_URL="${SOURCE_DATABASE_URL:-${LOCAL_DATABASE_URL:-}}"
CONTAINER_NAME="${DOCKER_DB_CONTAINER:-dubai_garments_postgres}"
TARGET_DB_NAME="${DOCKER_DB_NAME:-dubai_garments}"
TARGET_DB_USER="${DOCKER_DB_USER:-postgres}"

if [[ -z "$TABLE_NAME" ]]; then
  echo "Usage: ./scripts/db-copy-table-local-to-docker.sh <table_name>" >&2
  echo "Example: SOURCE_DATABASE_URL='postgresql://user:pass@localhost:5432/dubai_garments' ./scripts/db-copy-table-local-to-docker.sh leads" >&2
  exit 1
fi

if [[ ! "$TABLE_NAME" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "Invalid table name: $TABLE_NAME" >&2
  exit 1
fi

if [[ -z "$SOURCE_DB_URL" ]]; then
  echo "Missing source DB URL." >&2
  echo "Set SOURCE_DATABASE_URL (or LOCAL_DATABASE_URL) to your local Postgres connection string." >&2
  exit 1
fi

echo "Copying table data from local DB to Docker DB..."
echo "Table:          $TABLE_NAME"
echo "Source DB URL:  [provided]"
echo "Target:         $CONTAINER_NAME / $TARGET_DB_NAME ($TARGET_DB_USER)"

# Keep structure in Docker DB; replace only table rows.
docker exec -i "$CONTAINER_NAME" psql -U "$TARGET_DB_USER" -d "$TARGET_DB_NAME" -v ON_ERROR_STOP=1 \
  -c "TRUNCATE TABLE public.\"$TABLE_NAME\" RESTART IDENTITY CASCADE;"

pg_dump "$SOURCE_DB_URL" --data-only --inserts --table="public.$TABLE_NAME" \
  | docker exec -i "$CONTAINER_NAME" psql -U "$TARGET_DB_USER" -d "$TARGET_DB_NAME" -v ON_ERROR_STOP=1

echo "Table copy completed successfully."
