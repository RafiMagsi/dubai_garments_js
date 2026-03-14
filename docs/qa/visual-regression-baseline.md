# Visual Regression Baseline

## Purpose
Establish a repeatable golden screenshot baseline for key admin pages.

## Baseline Script
Use:

```bash
./scripts/capture-visual-goldens.sh
```

The script now runs Playwright browser preflight automatically:
1. `playwright install chromium`
2. screenshot capture for key routes

Optional:

```bash
BASE_URL=http://127.0.0.1:3000 OUT_DIR=docs/qa/visual-goldens ./scripts/capture-visual-goldens.sh
```

If Chromium is already installed and you want to skip preflight:

```bash
SKIP_BROWSER_INSTALL=true ./scripts/capture-visual-goldens.sh
```

## Output Location
Screenshots are saved under:

`docs/qa/visual-goldens/YYYY-MM-DD/*.png`

## Key Pages Covered
1. `/admin/dashboard`
2. `/admin/leads`
3. `/admin/deals`
4. `/admin/quotes`
5. `/admin/pipeline`
6. `/admin/activities`
7. `/admin/configuration`
8. `/admin/configuration/audit`
9. `/admin/observability`
10. `/admin/reconfigure`
11. `/admin/analytics`
12. `/admin/automations`

## Review Workflow
1. Capture baseline screenshots.
2. Commit baseline images after visual approval.
3. Re-capture after major UI changes and compare with previous baseline.
4. Treat any unintended visual changes as regressions.
