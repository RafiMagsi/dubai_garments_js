#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

load_env_file() {
  local env_file="$1"
  [[ -f "$env_file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    local key="${line%%=*}"
    local value="${line#*=}"
    key="${key#"${key%%[![:space:]]*}"}"
    key="${key%"${key##*[![:space:]]}"}"
    [[ -z "$key" ]] && continue
    export "$key=$value"
  done <"$env_file"
}

# Load local env first, then fallback to .env
if [[ -f "$ROOT_DIR/.env.local" ]]; then
  load_env_file "$ROOT_DIR/.env.local"
elif [[ -f "$ROOT_DIR/.env" ]]; then
  load_env_file "$ROOT_DIR/.env"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set."
  echo "Set DATABASE_URL in .env.local (preferred) or export it in your shell."
  exit 1
fi

cd "$ROOT_DIR"
npx tsx prisma/seed.ts
