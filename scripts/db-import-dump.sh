#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMP_FILE="${1:-$ROOT_DIR/dubai_garments_dump.sql}"
CONTAINER_NAME="${DOCKER_DB_CONTAINER:-dubai_garments_postgres}"
DB_NAME="${DOCKER_DB_NAME:-dubai_garments}"
DB_USER="${DOCKER_DB_USER:-postgres}"

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "Dump file not found: $DUMP_FILE" >&2
  echo "Usage: ./scripts/db-import-dump.sh [path-to-dump.sql]" >&2
  exit 1
fi

echo "Importing dump into Docker DB..."
echo "Container: $CONTAINER_NAME"
echo "Database:  $DB_NAME"
echo "User:      $DB_USER"
echo "Dump:      $DUMP_FILE"

docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$DUMP_FILE"

echo "Import completed successfully."
