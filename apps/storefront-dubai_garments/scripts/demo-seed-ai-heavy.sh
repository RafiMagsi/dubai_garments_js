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

load_env_file "$ROOT_DIR/.env"
load_env_file "$ROOT_DIR/.env.test"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Configure .env/.env.test first."
  exit 1
fi

cd "$ROOT_DIR"
npx tsx ./scripts/ai-demo-seed-preset.ts

