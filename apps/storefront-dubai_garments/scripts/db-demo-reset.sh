#!/bin/sh
set -eu

echo "ERROR: db-demo-reset.sh is permanently disabled to protect data."
echo "This repo no longer allows destructive DB reset operations."
echo "Use safe commands instead:"
echo "  npm run db:migrate"
echo "  npm run db:seed"
echo "  npm run db:seed:users"
exit 1
