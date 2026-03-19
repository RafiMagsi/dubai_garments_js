#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Day 28 AI-heavy demo setup (non-destructive)"
echo "1) Running migrations"
"$ROOT_DIR/scripts/db-migrate.sh"

echo "2) Seeding base catalog/customers"
"$ROOT_DIR/scripts/db-seed.sh"

echo "3) Seeding users/roles"
"$ROOT_DIR/scripts/db-seed-users.sh"

echo "4) Seeding AI-heavy deterministic preset"
"$ROOT_DIR/scripts/demo-seed-ai-heavy.sh"

echo "5) Verifying deterministic fingerprint"
"$ROOT_DIR/scripts/demo-verify-ai-determinism.sh"

echo "6) Printing walkthrough checklist"
"$ROOT_DIR/scripts/demo-walkthrough.sh"

echo "==> AI-heavy demo setup complete"

