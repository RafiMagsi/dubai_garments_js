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

APP_BASE_URL="${APP_BASE_URL:-${BASE_URL:-http://localhost:3000}}"
FASTAPI_BASE_URL="${FASTAPI_BASE_URL:-http://localhost:8000}"

echo "==> AI Sales Agent Showcase Walkthrough (AIA-019)"
echo "Base URL: $APP_BASE_URL"
echo "FastAPI URL: $FASTAPI_BASE_URL"
echo

if command -v curl >/dev/null 2>&1; then
  echo "Preflight health checks:"
  curl -fsS "$APP_BASE_URL/api/health/db" >/dev/null && echo "  [OK] Next.js DB health" || echo "  [WARN] Next.js DB health failed"
  curl -fsS "$FASTAPI_BASE_URL/health" >/dev/null && echo "  [OK] FastAPI health" || echo "  [WARN] FastAPI health failed"
  curl -fsS "$FASTAPI_BASE_URL/health/db" >/dev/null && echo "  [OK] FastAPI DB health" || echo "  [WARN] FastAPI DB health failed"
  echo
fi

echo "Login credentials:"
echo "  Email: ${BOOTSTRAP_SALES_MANAGER_EMAIL:-sales.manager@dubaigarments.me}"
echo "  Password: ${BOOTSTRAP_SALES_MANAGER_PASSWORD:-test@1234}"
echo

echo "Showcase timeline (target: 6-7 minutes):"
echo
echo "1) [00:00-00:45] Open AI Sales Agent hub"
echo "   URL: $APP_BASE_URL/admin/ai-sales-agent"
echo "   Talk track: Unified AI command center with Copilot, Intelligence, Reply, Quote, Pipeline, Flow, and Automation."
echo
echo "2) [00:45-01:40] Run Copilot + Triage"
echo "   Action: Use Follow-ups / Draft Reply intents and run lead triage for a live lead."
echo "   Talk track: AI outputs are structured, auditable, and fallback-safe."
echo
echo "3) [01:40-02:30] Lead Intelligence + Agent Flow"
echo "   Action: Show classification, score, next-best-action, blockers, and execution evidence."
echo "   Talk track: Decision-first intelligence and transparent lead-to-close execution map."
echo
echo "4) [02:30-03:30] Reply Studio"
echo "   Action: Generate draft, edit/regenerate, approve and send."
echo "   Talk track: Human-in-the-loop drafting with audit timeline capture."
echo
echo "5) [03:30-04:30] Quote Copilot + Recommendation"
echo "   Action: Run recommendation, accept lines, generate quote summary + risk checks."
echo "   Talk track: Margin-safe quote intelligence with upsell/cross-sell guidance."
echo
echo "6) [04:30-05:20] Pipeline Insights + Smart Routing/SLA"
echo "   Action: Show risk queues, execute a next action, show routing output."
echo "   Talk track: Priority routing and proactive risk intervention."
echo
echo "7) [05:20-06:10] Automation Runs + Templates"
echo "   Action: Show run details, failures/remediation, rerun guardrails, and quick-enable templates."
echo "   Talk track: Operational transparency and safe automation controls."
echo
echo "8) [06:10-07:00] AI Impact KPIs + Logs"
echo "   URLs:"
echo "     $APP_BASE_URL/admin/ai-sales-agent"
echo "     $APP_BASE_URL/admin/dashboard"
echo "     $APP_BASE_URL/admin/ai-logs"
echo "   Talk track: Measurable impact (time saved, acceptance, risk resolution) + traceability."
echo
echo "Checklist docs:"
echo "  docs/qa/portfolio-demo-run-checklist.md"
echo "  docs/qa/showcase-talking-points.md"
echo
echo "Screenshot baseline command:"
echo "  npm run demo:baseline:capture"
