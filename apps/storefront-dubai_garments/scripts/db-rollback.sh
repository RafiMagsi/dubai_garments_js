#!/bin/sh
set -eu

echo "ERROR: db-rollback.sh is disabled."
echo "Reason: rollback can remove schema/data and is blocked for safety."
echo "Use forward-only migration flow: npm run db:migrate"
exit 1
