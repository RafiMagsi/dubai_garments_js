#!/usr/bin/env bash
set -euo pipefail

echo "ERROR: db-copy-table-local-to-docker.sh is disabled."
echo "Reason: table reset/truncate operations are blocked to protect data."
echo "Use non-destructive import/update workflows only."
exit 1
