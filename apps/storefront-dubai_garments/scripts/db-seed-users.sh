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
if [ -z "${DATABASE_URL:-}" ] && [ -f "$ROOT_DIR/.env.local" ]; then
  load_env_file "$ROOT_DIR/.env.local"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Add it in .env.local or .env.secrets.local"
  exit 1
fi

if [ -z "${BOOTSTRAP_ADMIN_EMAIL:-}" ] || [ -z "${BOOTSTRAP_ADMIN_PASSWORD:-}" ]; then
  echo "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required in .env.local"
  exit 1
fi

if [ -z "${BOOTSTRAP_CUSTOMER_EMAIL:-}" ] || [ -z "${BOOTSTRAP_CUSTOMER_PASSWORD:-}" ]; then
  echo "BOOTSTRAP_CUSTOMER_EMAIL and BOOTSTRAP_CUSTOMER_PASSWORD are required in .env.local"
  exit 1
fi

ADMIN_NAME="${BOOTSTRAP_ADMIN_NAME:-Admin User}"
CUSTOMER_NAME="${BOOTSTRAP_CUSTOMER_NAME:-Customer User}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v admin_email="$BOOTSTRAP_ADMIN_EMAIL" \
  -v admin_password="$BOOTSTRAP_ADMIN_PASSWORD" \
  -v admin_name="$ADMIN_NAME" \
  -v customer_email="$BOOTSTRAP_CUSTOMER_EMAIL" \
  -v customer_password="$BOOTSTRAP_CUSTOMER_PASSWORD" \
  -v customer_name="$CUSTOMER_NAME" <<'SQL'
INSERT INTO users (full_name, email, password_hash, role, is_active)
VALUES (
  :'admin_name',
  :'admin_email',
  crypt(:'admin_password', gen_salt('bf')),
  'admin',
  TRUE
)
ON CONFLICT (email)
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = 'admin',
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO users (full_name, email, password_hash, role, is_active)
VALUES (
  :'customer_name',
  :'customer_email',
  crypt(:'customer_password', gen_salt('bf')),
  'customer',
  TRUE
)
ON CONFLICT (email)
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = 'customer',
  is_active = TRUE,
  updated_at = NOW();
SQL

echo "Seeded/updated admin and customer users successfully."
