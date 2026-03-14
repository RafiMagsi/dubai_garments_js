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

APP_BASE_URL="${APP_BASE_URL:-http://localhost:3000}"
FASTAPI_BASE_URL="${FASTAPI_BASE_URL:-http://localhost:8000}"

echo "==> Demo walkthrough preflight"
echo "APP_BASE_URL=$APP_BASE_URL"
echo "FASTAPI_BASE_URL=$FASTAPI_BASE_URL"

if command -v curl >/dev/null 2>&1; then
  echo
  echo "Health checks:"
  curl -fsS "$APP_BASE_URL/api/health/db" >/dev/null && echo "  [OK] Next.js DB health" || echo "  [WARN] Next.js DB health failed"
  curl -fsS "$FASTAPI_BASE_URL/health" >/dev/null && echo "  [OK] FastAPI health" || echo "  [WARN] FastAPI health failed"
fi

if [ -n "${DATABASE_URL:-}" ] && command -v psql >/dev/null 2>&1; then
  echo
  echo "Demo data counts:"
  psql "$DATABASE_URL" -tAc "SELECT 'users=' || count(*) FROM users;" || true
  psql "$DATABASE_URL" -tAc "SELECT 'products=' || count(*) FROM products;" || true
  psql "$DATABASE_URL" -tAc "SELECT 'leads=' || count(*) FROM leads;" || true
  psql "$DATABASE_URL" -tAc "SELECT 'deals=' || count(*) FROM deals;" || true
  psql "$DATABASE_URL" -tAc "SELECT 'quotes=' || count(*) FROM quotes;" || true
fi

echo
echo "==> Sales walkthrough script"
echo "1) Login as sales manager:"
echo "   URL: $APP_BASE_URL/admin/login"
echo "   Email: ${BOOTSTRAP_SALES_MANAGER_EMAIL:-sales.manager@dubaigarments.me}"
echo "   Password: ${BOOTSTRAP_SALES_MANAGER_PASSWORD:-test@1234}"
echo
echo "2) Open lead queue and qualify one lead:"
echo "   $APP_BASE_URL/admin/leads"
echo
echo "3) Open lead detail timeline and draft reply:"
echo "   - Use 'AI Draft Reply' then 'Send Email'"
echo
echo "4) Convert lead to deal, then open pipeline:"
echo "   $APP_BASE_URL/admin/deals"
echo
echo "5) Open deal detail:"
echo "   - Update stage/probability/value"
echo "   - Use 'AI Draft Reply' in Email Communication"
echo "   - Create quote from the same screen"
echo
echo "6) Open quote detail:"
echo "   $APP_BASE_URL/admin/quotes"
echo "   - Generate PDF"
echo "   - Use 'AI Draft Quote Email' then send"
echo
echo "7) Validate observability + AI logs:"
echo "   $APP_BASE_URL/admin/observability"
echo "   $APP_BASE_URL/admin/activities"
echo
echo "8) Admin-only governance pages:"
echo "   $APP_BASE_URL/admin/users"
echo "   $APP_BASE_URL/admin/rbac-matrix"
echo
echo "==> Walkthrough output complete"
