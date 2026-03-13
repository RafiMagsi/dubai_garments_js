#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

STRICT="false"
if [ "${1:-}" = "--strict" ]; then
  STRICT="true"
fi

TOTAL_ISSUES=0

trim() {
  # shellcheck disable=SC2001
  echo "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

get_value() {
  file="$1"
  key="$2"
  line="$(grep -E "^${key}=" "$file" | tail -n 1 || true)"
  if [ -z "$line" ]; then
    echo ""
    return
  fi
  value="${line#*=}"
  trim "$value"
}

is_placeholder() {
  value="$1"
  case "$value" in
    *"<"*">"*|change_me|change_this_shared_secret|*"<admin-"*|*"<DB_"*|*"<long-random-secret>"*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

check_file() {
  file="$1"
  shift
  required_keys=("$@")

  echo ""
  echo "==> Checking $file"

  if [ ! -f "$file" ]; then
    echo "  [ERROR] File not found"
    TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
    return
  fi

  local_issues=0
  for key in "${required_keys[@]}"; do
    value="$(get_value "$file" "$key")"
    if [ -z "$value" ]; then
      echo "  [MISSING] $key"
      local_issues=$((local_issues + 1))
      continue
    fi
    if is_placeholder "$value"; then
      echo "  [PLACEHOLDER] $key"
      local_issues=$((local_issues + 1))
      continue
    fi
    echo "  [OK] $key"
  done

  TOTAL_ISSUES=$((TOTAL_ISSUES + local_issues))
  if [ "$local_issues" -eq 0 ]; then
    echo "  Result: healthy"
  else
    echo "  Result: $local_issues issue(s)"
  fi
}

check_file \
  ".env.docker.local" \
  POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD AUTH_SESSION_SECRET BOOTSTRAP_ADMIN_EMAIL BOOTSTRAP_ADMIN_PASSWORD

check_file \
  "apps/storefront-dubai_garments/.env.docker.local" \
  DATABASE_URL FASTAPI_BASE_URL AUTH_SESSION_SECRET NEXT_PUBLIC_API_BASE_URL

check_file \
  "services/fastapi_quote_api/.env.docker.local" \
  DATABASE_URL REDIS_URL CORS_ORIGINS

echo ""
if [ "$TOTAL_ISSUES" -eq 0 ]; then
  echo "Env doctor passed. No issues found."
  exit 0
fi

echo "Env doctor found $TOTAL_ISSUES issue(s)."
if [ "$STRICT" = "true" ]; then
  exit 1
fi
exit 0

