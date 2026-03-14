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
    case "$key" in
      [A-Za-z_][A-Za-z0-9_]*) ;;
      *) continue ;;
    esac
    # Keep explicit shell env values as highest priority.
    current_value="$(printenv "$key" 2>/dev/null || true)"
    if [ -z "$current_value" ]; then
      export "$key=$value"
    fi
  done <"$env_file"
}

# Load runtime env first, then test defaults for missing values only.
load_env_file "$ROOT_DIR/.env"
load_env_file "$ROOT_DIR/.env.test"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Add it in .env.test or .env.secrets.local"
  exit 1
fi

if [ -z "${BOOTSTRAP_ADMIN_EMAIL:-}" ] || [ -z "${BOOTSTRAP_ADMIN_PASSWORD:-}" ]; then
  echo "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required in .env.test"
  exit 1
fi

if [ -z "${BOOTSTRAP_CUSTOMER_EMAIL:-}" ] || [ -z "${BOOTSTRAP_CUSTOMER_PASSWORD:-}" ]; then
  echo "BOOTSTRAP_CUSTOMER_EMAIL and BOOTSTRAP_CUSTOMER_PASSWORD are required in .env.test"
  exit 1
fi

ADMIN_NAME="${BOOTSTRAP_ADMIN_NAME:-Admin User}"
CUSTOMER_NAME="${BOOTSTRAP_CUSTOMER_NAME:-Customer User}"
SALES_MANAGER_NAME="${BOOTSTRAP_SALES_MANAGER_NAME:-Sales Manager}"
SALES_REP_NAME="${BOOTSTRAP_SALES_REP_NAME:-Sales Representative}"
TENANT_SLUG="${DEFAULT_TENANT_SLUG:-default}"
TENANT_NAME="${DEFAULT_TENANT_NAME:-Default Tenant}"
SALES_MANAGER_EMAIL="${BOOTSTRAP_SALES_MANAGER_EMAIL:-sales.manager@dubaigarments.me}"
SALES_MANAGER_PASSWORD="${BOOTSTRAP_SALES_MANAGER_PASSWORD:-test@1234}"
SALES_REP_EMAIL="${BOOTSTRAP_SALES_REP_EMAIL:-sales.rep@dubaigarments.me}"
SALES_REP_PASSWORD="${BOOTSTRAP_SALES_REP_PASSWORD:-test@1234}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v admin_email="$BOOTSTRAP_ADMIN_EMAIL" \
  -v admin_password="$BOOTSTRAP_ADMIN_PASSWORD" \
  -v admin_name="$ADMIN_NAME" \
  -v customer_email="$BOOTSTRAP_CUSTOMER_EMAIL" \
  -v customer_password="$BOOTSTRAP_CUSTOMER_PASSWORD" \
  -v customer_name="$CUSTOMER_NAME" \
  -v sales_manager_email="$SALES_MANAGER_EMAIL" \
  -v sales_manager_password="$SALES_MANAGER_PASSWORD" \
  -v sales_manager_name="$SALES_MANAGER_NAME" \
  -v sales_rep_email="$SALES_REP_EMAIL" \
  -v sales_rep_password="$SALES_REP_PASSWORD" \
  -v sales_rep_name="$SALES_REP_NAME" \
  -v tenant_slug="$TENANT_SLUG" \
  -v tenant_name="$TENANT_NAME" <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO tenants (slug, name, is_active)
VALUES (:'tenant_slug', :'tenant_name', TRUE)
ON CONFLICT (slug)
DO UPDATE SET
  name = EXCLUDED.name,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO users (full_name, email, password_hash, role, is_active, tenant_id)
VALUES (
  :'admin_name',
  :'admin_email',
  crypt(:'admin_password', gen_salt('bf')),
  'admin',
  TRUE,
  (SELECT id FROM tenants WHERE slug = :'tenant_slug' LIMIT 1)
)
ON CONFLICT (email)
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = 'admin',
  tenant_id = EXCLUDED.tenant_id,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO users (full_name, email, password_hash, role, is_active, tenant_id)
VALUES (
  :'customer_name',
  :'customer_email',
  crypt(:'customer_password', gen_salt('bf')),
  'customer',
  TRUE,
  (SELECT id FROM tenants WHERE slug = :'tenant_slug' LIMIT 1)
)
ON CONFLICT (email)
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = 'customer',
  tenant_id = EXCLUDED.tenant_id,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO users (full_name, email, password_hash, role, is_active, tenant_id)
VALUES (
  :'sales_manager_name',
  :'sales_manager_email',
  crypt(:'sales_manager_password', gen_salt('bf')),
  'sales_manager',
  TRUE,
  (SELECT id FROM tenants WHERE slug = :'tenant_slug' LIMIT 1)
)
ON CONFLICT (email)
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = 'sales_manager',
  tenant_id = EXCLUDED.tenant_id,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO users (full_name, email, password_hash, role, is_active, tenant_id)
VALUES (
  :'sales_rep_name',
  :'sales_rep_email',
  crypt(:'sales_rep_password', gen_salt('bf')),
  'sales_rep',
  TRUE,
  (SELECT id FROM tenants WHERE slug = :'tenant_slug' LIMIT 1)
)
ON CONFLICT (email)
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = 'sales_rep',
  tenant_id = EXCLUDED.tenant_id,
  is_active = TRUE,
  updated_at = NOW();
SQL

echo "Seeded/updated admin, customer, sales_manager, and sales_rep users successfully for tenant '$TENANT_SLUG'."
