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
    key="${key#"${key%%[![:space:]]*}"}"
    key="${key%"${key##*[![:space:]]}"}"
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
  echo "Set DATABASE_URL in .env.test (preferred) or export it in your shell."
  exit 1
fi

cd "$ROOT_DIR"
npx tsx prisma/seed.ts
