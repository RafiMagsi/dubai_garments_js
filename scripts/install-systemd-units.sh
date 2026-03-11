#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "Run as root (or with sudo): sudo ./scripts/install-systemd-units.sh"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
UNIT_SOURCE_DIR="$ROOT_DIR/deploy/systemd"
UNIT_TARGET_DIR="/etc/systemd/system"
RUN_USER="${SUDO_USER:-${USER:-root}}"
ENABLE_AI=false

for arg in "$@"; do
  case "$arg" in
    --enable-ai) ENABLE_AI=true ;;
    --user=*) RUN_USER="${arg#*=}" ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: sudo ./scripts/install-systemd-units.sh [--enable-ai] [--user=<linux-user>]"
      exit 1
      ;;
  esac
done

render_unit() {
  local src="$1"
  local dest="$2"
  sed \
    -e "s|__PROJECT_ROOT__|$ROOT_DIR|g" \
    -e "s|__RUN_USER__|$RUN_USER|g" \
    "$src" >"$dest"
}

install_unit() {
  local file="$1"
  local src="$UNIT_SOURCE_DIR/$file"
  local dest="$UNIT_TARGET_DIR/$file"

  if [ ! -f "$src" ]; then
    echo "Missing unit file: $src"
    exit 1
  fi

  render_unit "$src" "$dest"
  echo "Installed $dest"
}

install_unit "dubai-garments-storefront.service"
install_unit "dubai-garments-fastapi.service"
install_unit "dubai-garments-worker.service"

if [ "$ENABLE_AI" = true ]; then
  install_unit "dubai-garments-ai.service"
fi

systemctl daemon-reload
systemctl enable --now dubai-garments-storefront.service
systemctl enable --now dubai-garments-fastapi.service
systemctl enable --now dubai-garments-worker.service

if [ "$ENABLE_AI" = true ]; then
  systemctl enable --now dubai-garments-ai.service
fi

echo "Systemd services are active."
echo "Check status with:"
echo "  systemctl status dubai-garments-storefront dubai-garments-fastapi dubai-garments-worker"
if [ "$ENABLE_AI" = true ]; then
  echo "  systemctl status dubai-garments-ai"
fi
