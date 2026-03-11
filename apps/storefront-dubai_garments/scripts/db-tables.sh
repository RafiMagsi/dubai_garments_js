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
    [ -z "$key" ] && continue
    export "$key=$value"
  done <"$env_file"
}

# If DATABASE_URL is already provided (e.g. Docker env), do not override it.
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f "$ROOT_DIR/.env.local" ]; then
    load_env_file "$ROOT_DIR/.env.local"
  elif [ -f "$ROOT_DIR/.env" ]; then
    load_env_file "$ROOT_DIR/.env"
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql command not found. Please install PostgreSQL client tools."
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "\dt public.*"
