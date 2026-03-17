# AI Sales Agent — Regression Checklist

## How To Run
1. Unit + report only: `npm run qa:regression`
2. Full unit + Playwright against deployed app:
   - `BASE_URL=https://your-deployed-url npm run qa:regression`
3. Playwright role creds (optional, defaults used):
   - `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD`, `QA_SALES_MANAGER_EMAIL`, `QA_SALES_MANAGER_PASSWORD`, `QA_SALES_REP_EMAIL`, `QA_SALES_REP_PASSWORD`, `QA_OPS_EMAIL`, `QA_OPS_PASSWORD`

## Latest Automated Run
- Timestamp (UTC): 2026-03-17T06:25:47.265Z
- Unit/Integration result: PASS
- Playwright regression result: FAIL
- Combined quality pass: **71%**

### Summary
| Suite | Passed | Failed | Total | Pass % |
|---|---:|---:|---:|---:|
| Unit/Integration (Vitest) | 7 | 0 | 7 | 100% |
| Regression (Playwright) | -2 | 1 | 0 | 0% |
| Combined | 5 | 2 | 7 | 71% |

### Coverage (Vitest)
| Metric | Percentage |
|---|---:|
| Lines | 3.2% |
| Branches | 23.07% |
| Functions | 20.58% |
| Statements | 3.2% |

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
