# AI Sales Agent — Regression Results

## Run Metadata
- Date: 2026-03-17
- Trigger: Manual local run
- Scope: Unit/Integration + Playwright regression
- Checklist file untouched: `docs/qa/regression-testing/regression-testing.md`

## Results Summary
| Suite | Passed | Failed | Not Run | Total | Pass % |
|---|---:|---:|---:|---:|---:|
| Unit/Integration (Vitest) | 7 | 0 | 0 | 7 | 100% |
| Regression (Playwright) | 0 | 1 | 1 | 2 | 0% |
| Combined | 7 | 1 | 1 | 9 | 78% |

## Coverage Snapshot (Vitest)
| Metric | Percentage |
|---|---:|
| Lines | 3.2% |
| Branches | 23.07% |
| Functions | 20.58% |
| Statements | 3.2% |

## Failure Details
### Playwright
- Failure point: `tests/regression/ai-sales-agent-regression.spec.ts`
- Error type: Browser launch failure in sandbox
- Error signal: `bootstrap_check_in ... MachPortRendezvousServer ... Permission denied (1100)`
- Impact: First regression flow failed, second flow did not run.

This failure is environment/sandbox related in the current terminal session, not a confirmed application regression.

## Commands Executed
From `apps/storefront-dubai_garments`:
```bash
npm run test:unit:coverage
npm run test:regression
```

## How To Re-Run (Recommended)
1. Local unit + report only:
```bash
cd apps/storefront-dubai_garments
npm run qa:regression
```

2. Full regression against deployed/staging app:
```bash
cd apps/storefront-dubai_garments
BASE_URL=https://aisales.appcenter.me npm run qa:regression
```

3. If local Playwright browser fails again:
```bash
cd apps/storefront-dubai_garments
npx playwright install chromium
```

4. CI path (recommended for stable E2E):
- Use workflow: `.github/workflows/qa-regression.yml`
- Artifacts produced:
  - `apps/storefront-dubai_garments/.qa/vitest-results.json`
  - `apps/storefront-dubai_garments/.qa/playwright-results.json`
  - `apps/storefront-dubai_garments/.qa/coverage/lcov.info`

## Notes
- Role and Day-10 checklist flows are implemented in the test spec.
- For trustworthy post-deploy pass/fail, run the suite in GitHub Actions or on a host with browser runtime permissions.
