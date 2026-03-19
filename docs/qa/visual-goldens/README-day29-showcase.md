# Day 29 Showcase Baseline Screenshots

## Capture Command

From `apps/storefront-dubai_garments`:

```bash
npm run demo:baseline:capture
```

Optional env:

```bash
BASE_URL=https://aisales.appcenter.me QA_ADMIN_EMAIL=admin@dubaigarments.me QA_ADMIN_PASSWORD=*** npm run demo:baseline:capture
```

## Output Location

Each run creates:

```text
docs/qa/visual-goldens/<timestamp>-day29-showcase/
```

Containing:
- multiple `.png` snapshots
- `manifest.json`

## Expected Snapshot Set

1. dashboard-impact-kpis
2. ai-agent-copilot
3. ai-agent-lead-intelligence
4. ai-agent-reply-studio
5. ai-agent-quote-copilot
6. ai-agent-pipeline-insights
7. ai-agent-agent-flow
8. ai-agent-automation-runs
9. ai-agent-model-settings
10. lead-detail-ai-intelligence-flow (if lead exists)

