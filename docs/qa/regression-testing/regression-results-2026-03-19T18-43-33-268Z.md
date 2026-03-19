# AI Sales Agent — Regression Checklist

## How To Run
1. Unit + report only: `npm run qa:regression`
2. Full unit + Playwright against deployed app:
   - `BASE_URL=https://your-deployed-url npm run qa:regression`
3. Playwright role creds (optional, defaults used):
   - `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD`, `QA_SALES_MANAGER_EMAIL`, `QA_SALES_MANAGER_PASSWORD`, `QA_SALES_REP_EMAIL`, `QA_SALES_REP_PASSWORD`, `QA_OPS_EMAIL`, `QA_OPS_PASSWORD`

## Latest Automated Run
- Timestamp (UTC): 2026-03-19T18:43:33.268Z
- Unit/Integration result: PASS
- Playwright regression result: SKIPPED (BASE_URL not set)
- Combined quality pass: **100%**

### Summary
| Suite | Passed | Failed | Total | Pass % |
|---|---:|---:|---:|---:|
| Unit/Integration (Vitest) | 13 | 0 | 13 | 100% |
| Regression (Playwright) | 0 | 0 | 0 | 0% |
| Combined | 13 | 0 | 13 | 100% |

### Coverage (Vitest)
| Metric | Percentage |
|---|---:|
| Lines | 6.04% |
| Branches | 25.66% |
| Functions | 20.71% |
| Statements | 6.04% |

### Artifacts
- `.qa/vitest-results.json`
- `.qa/coverage/coverage-summary.json`
- `.qa/coverage/lcov.info`
- `.qa/playwright-results.json`

---

## Scope
Validate the full path from lead intake to intelligence rendering and actionability.

## Flow A — Lead intake to lead detail intelligence
Status: covered by Playwright regression suite.

## Flow B — Manual retrigger
Status: covered by Playwright regression suite.

## Flow C — Draft reply from intelligence
Status: covered by Playwright regression suite.

## Flow D — Convert from intelligence
Status: covered by Playwright regression suite.

## Flow E — Prioritize from intelligence
Status: covered by Playwright regression suite.

## Flow F — AI Sales Agent mirror
Status: covered by Playwright regression suite.

## Role Validation
Status: covered for `admin`, `sales_manager`, `sales_rep`, `ops` in Playwright suite.
