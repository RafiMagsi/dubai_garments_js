# AI Sales Agent Portfolio Demo Run Checklist (AIA-019)

Use this checklist before recording or presenting on freelance portals.

## 1) Environment Readiness

- [ ] Run `npm run demo:prepare:ai` inside `apps/storefront-dubai_garments`.
- [ ] Confirm no destructive DB reset commands were used.
- [ ] Confirm app is reachable at target URL (`BASE_URL`/`APP_BASE_URL`).
- [ ] Confirm login works with sales manager and admin accounts.
- [ ] Confirm `/api/health/db` is healthy.
- [ ] Confirm FastAPI health endpoint is healthy (if enabled).

## 2) Data Determinism

- [ ] Run `npm run demo:seed:ai` once and note fingerprint.
- [ ] Run `npm run demo:verify:ai` and confirm pass.
- [ ] Verify demo leads/deals/quotes are present in admin pages.

## 3) Showcase Flow (7 minutes)

- [ ] Open AI Sales Agent hub and introduce tab architecture.
- [ ] Run Copilot intent and show structured output + fallback metadata.
- [ ] Run lead triage and show persisted intelligence updates.
- [ ] Open Reply Studio: generate, edit/regenerate, approve/send.
- [ ] Open Quote Copilot: recommendation -> acceptance -> summary/intelligence.
- [ ] Open Pipeline Insights and execute one action.
- [ ] Open Agent Flow and explain blockers/evidence/next move.
- [ ] Open Automation Runs and template toggles.
- [ ] Open Dashboard AI Impact Snapshot and AI Logs.

## 4) Visual Baseline

- [ ] Run `npm run demo:baseline:capture`.
- [ ] Confirm output folder is created under `docs/qa/visual-goldens/<timestamp>-day29-showcase`.
- [ ] Confirm key pages are captured (Dashboard, AI tabs, lead detail).
- [ ] Confirm `manifest.json` exists in baseline folder.

## 5) Portfolio Delivery Assets

- [ ] Keep one latest screenshot baseline folder.
- [ ] Include talking points from `docs/qa/showcase-talking-points.md`.
- [ ] Include measurable KPIs: time saved, suggestions accepted, risk alerts resolved.
- [ ] Mention deterministic demo setup commands in portfolio README/snippet.

## 6) Pass/Fail Sign-off

- [ ] PASS: all sections above completed without runtime/auth errors.
- [ ] FAIL: capture blocker + screenshot + command output and fix before publishing.

