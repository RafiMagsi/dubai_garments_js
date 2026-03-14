#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
OUT_DIR="${OUT_DIR:-docs/qa/visual-goldens}"
DATE_STAMP="$(date +%F)"
TARGET_DIR="${OUT_DIR}/${DATE_STAMP}"
PLAYWRIGHT_VERSION="${PLAYWRIGHT_VERSION:-1.51.1}"
PLAYWRIGHT_CMD=(npx -y "playwright@${PLAYWRIGHT_VERSION}")
SKIP_BROWSER_INSTALL="${SKIP_BROWSER_INSTALL:-false}"

mkdir -p "${TARGET_DIR}"

declare -a PAGES=(
  "admin-dashboard:/admin/dashboard"
  "admin-leads:/admin/leads"
  "admin-deals:/admin/deals"
  "admin-quotes:/admin/quotes"
  "admin-pipeline:/admin/pipeline"
  "admin-activities:/admin/activities"
  "admin-configuration:/admin/configuration"
  "admin-configuration-audit:/admin/configuration/audit"
  "admin-observability:/admin/observability"
  "admin-reconfigure:/admin/reconfigure"
  "admin-analytics:/admin/analytics"
  "admin-automations:/admin/automations"
)

echo "==> Playwright preflight"
if [[ "${SKIP_BROWSER_INSTALL}" != "true" ]]; then
  echo " - ensuring Chromium binary is installed"
  "${PLAYWRIGHT_CMD[@]}" install chromium
else
  echo " - skipping browser install (SKIP_BROWSER_INSTALL=true)"
fi

echo "==> Capturing visual goldens into ${TARGET_DIR}"
for item in "${PAGES[@]}"; do
  name="${item%%:*}"
  path="${item#*:}"
  url="${BASE_URL}${path}"
  file="${TARGET_DIR}/${name}.png"

  echo " - ${url}"
  "${PLAYWRIGHT_CMD[@]}" screenshot \
    --browser=chromium \
    --viewport-size=1440,900 \
    --full-page \
    "${url}" \
    "${file}"
done

echo "==> Done"
echo "Saved files:"
ls -1 "${TARGET_DIR}"
