#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

IDLE_TIMEOUT_SECONDS="${IDLE_TIMEOUT_SECONDS:-120}"
CORE_BUILD_SERVICES="${CORE_BUILD_SERVICES:-fastapi storefront}"
CORE_RUN_SERVICES="${CORE_RUN_SERVICES:-postgres redis fastapi storefront}"

copy_if_missing() {
  src="$1"
  dst="$2"
  if [ ! -f "$dst" ]; then
    if [ ! -f "$src" ]; then
      echo "ERROR: template file not found: $src"
      exit 1
    fi
    cp "$src" "$dst"
    echo "Created $dst from template."
  fi
}

run_with_idle_timeout() {
  if ! command -v python3 >/dev/null 2>&1; then
    "$@"
    return
  fi

  python3 - "$IDLE_TIMEOUT_SECONDS" "$@" <<'PY'
import os
import select
import subprocess
import sys
import time

idle_timeout = int(sys.argv[1])
cmd = sys.argv[2:]
if not cmd:
    sys.exit(0)

proc = subprocess.Popen(
    cmd,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
)

assert proc.stdout is not None
fd = proc.stdout.fileno()
last_output = time.time()

while True:
    ready, _, _ = select.select([fd], [], [], 1)
    if ready:
        line = proc.stdout.readline()
        if line:
            sys.stdout.write(line)
            sys.stdout.flush()
            last_output = time.time()

    if proc.poll() is not None:
        # Drain remaining lines.
        remainder = proc.stdout.read()
        if remainder:
            sys.stdout.write(remainder)
            sys.stdout.flush()
        sys.exit(proc.returncode)

    if time.time() - last_output > idle_timeout:
        print(
            f"\nERROR: No output for {idle_timeout}s; terminating command: {' '.join(cmd)}",
            flush=True,
        )
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
        sys.exit(124)
PY
}

echo "==> Dubai Garments core deploy (lightweight)"

copy_if_missing ".env.docker.example" ".env.docker.local"
copy_if_missing "apps/storefront-dubai_garments/.env.docker.example" "apps/storefront-dubai_garments/.env.docker.local"
copy_if_missing "services/fastapi_quote_api/.env.docker.example" "services/fastapi_quote_api/.env.docker.local"

if [ -f ".env.docker.local" ]; then
  set -a
  # shellcheck disable=SC1091
  . "./.env.docker.local"
  set +a
fi

echo "==> Docker network preflight"
if ! docker run --rm alpine ping -c 3 8.8.8.8 >/tmp/dg_docker_ping.log 2>&1; then
  echo "Docker connectivity check failed. Attempting nft forwarding rule fix..."
  cat /tmp/dg_docker_ping.log || true

  if command -v nft >/dev/null 2>&1; then
    if sudo -n true >/dev/null 2>&1; then
      sudo nft add rule inet forwarding forward counter accept || true
    else
      echo "ERROR: sudo passwordless access unavailable for nft fix."
      echo "Run manually on server:"
      echo "  sudo nft add rule inet forwarding forward counter accept"
      exit 1
    fi
  else
    echo "nft command not found; attempting iptables forwarding rule fallback..."
    if command -v iptables >/dev/null 2>&1; then
      if sudo -n true >/dev/null 2>&1; then
        sudo iptables -C FORWARD -j ACCEPT >/dev/null 2>&1 || sudo iptables -I FORWARD -j ACCEPT
      else
        echo "ERROR: sudo passwordless access unavailable for iptables fallback."
        echo "Run manually on server:"
        echo "  sudo iptables -I FORWARD -j ACCEPT"
        exit 1
      fi
    else
      echo "ERROR: Neither nft nor iptables command is available for forwarding rule fix."
      exit 1
    fi
  fi

  if ! docker run --rm alpine ping -c 3 8.8.8.8 >/tmp/dg_docker_ping.log 2>&1; then
    echo "ERROR: Docker connectivity still failing after nft rule."
    cat /tmp/dg_docker_ping.log || true
    exit 1
  fi
fi

docker run --rm alpine nslookup pypi.org >/tmp/dg_docker_dns.log 2>&1 || {
  echo "ERROR: Docker DNS check failed."
  cat /tmp/dg_docker_dns.log || true
  exit 1
}

export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain

echo "==> Building core services: $CORE_BUILD_SERVICES"
run_with_idle_timeout docker compose build --progress=plain $CORE_BUILD_SERVICES

echo "==> Starting core services: $CORE_RUN_SERVICES"
run_with_idle_timeout docker compose up -d $CORE_RUN_SERVICES

echo "==> Running database migrations"
MIGRATE_OK="false"
for _ in $(seq 1 20); do
  if docker compose run --rm -T \
    -e DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-change_this_password}@postgres:5432/${POSTGRES_DB:-dubai_garments}" \
    -v "$ROOT_DIR/apps/storefront-dubai_garments:/work" \
    -w /work \
    postgres sh ./scripts/db-migrate.sh >/tmp/dg_migrate.log 2>&1; then
    MIGRATE_OK="true"
    break
  fi
  sleep 2
done

if [ "$MIGRATE_OK" != "true" ]; then
  echo "ERROR: Migration failed."
  cat /tmp/dg_migrate.log || true
  exit 1
fi

echo "==> Waiting for storefront"
for _ in $(seq 1 90); do
  if curl -fsS "http://localhost:3000/api/metrics" >/dev/null 2>&1; then
    echo "Storefront is up."
    break
  fi
  sleep 2
done

echo "==> Core deploy completed"
echo "Storefront: http://localhost:3000"
echo "FastAPI:    http://localhost:8000/health"
