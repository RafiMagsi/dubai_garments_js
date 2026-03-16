#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const qaDir = path.join(root, '.qa');
const regressionDocsDir = path.join(root, '..', '..', 'docs', 'qa', 'regression-testing');

fs.mkdirSync(qaDir, { recursive: true });
fs.mkdirSync(regressionDocsDir, { recursive: true });

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  return result.status === 0;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function pct(passed, total) {
  if (!total) return 0;
  return Math.round((passed / total) * 100);
}

const shouldRunPlaywright = Boolean(process.env.BASE_URL) && process.env.SKIP_E2E !== '1';

const vitestOk = run('npx', ['vitest', 'run', '--coverage']);
const playwrightOk = shouldRunPlaywright ? run('npx', ['playwright', 'test']) : true;

const vitestResults = readJson(path.join(qaDir, 'vitest-results.json'));
const coverageSummary = readJson(path.join(qaDir, 'coverage', 'coverage-summary.json'));
const playwrightResults = readJson(path.join(qaDir, 'playwright-results.json'));

const unitTotal = vitestResults?.numTotalTests ?? 0;
const unitPassed = vitestResults?.numPassedTests ?? 0;
const unitFailed = vitestResults?.numFailedTests ?? 0;
const unitPct = pct(unitPassed, unitTotal);

const e2eTotal = shouldRunPlaywright ? (playwrightResults?.stats?.expected ?? 0) : 0;
const e2ePassed = shouldRunPlaywright
  ? (playwrightResults?.stats?.expected ?? 0) -
    (playwrightResults?.stats?.unexpected ?? 0) -
    (playwrightResults?.stats?.skipped ?? 0)
  : 0;
const e2eFailed = playwrightResults?.stats?.unexpected ?? 0;
const e2ePct = pct(e2ePassed, e2eTotal);

const combinedTotal = unitTotal + e2eTotal;
const combinedPassed = unitPassed + e2ePassed;
const combinedPct = pct(combinedPassed, combinedTotal);

const lineCoverage = coverageSummary?.total?.lines?.pct ?? 0;
const branchCoverage = coverageSummary?.total?.branches?.pct ?? 0;
const functionCoverage = coverageSummary?.total?.functions?.pct ?? 0;
const statementCoverage = coverageSummary?.total?.statements?.pct ?? 0;

const now = new Date().toISOString();
const safeTimestamp = now.replace(/[:.]/g, '-');
const regressionDocPath = path.join(
  regressionDocsDir,
  `regression-results-${safeTimestamp}.md`
);

const report = [
  '# AI Sales Agent — Regression Checklist',
  '',
  '## How To Run',
  '1. Unit + report only: `npm run qa:regression`',
  '2. Full unit + Playwright against deployed app:',
  '   - `BASE_URL=https://your-deployed-url npm run qa:regression`',
  '3. Playwright role creds (optional, defaults used):',
  '   - `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD`, `QA_SALES_MANAGER_EMAIL`, `QA_SALES_MANAGER_PASSWORD`, `QA_SALES_REP_EMAIL`, `QA_SALES_REP_PASSWORD`, `QA_OPS_EMAIL`, `QA_OPS_PASSWORD`',
  '',
  `## Latest Automated Run`,
  `- Timestamp (UTC): ${now}`,
  `- Unit/Integration result: ${vitestOk ? 'PASS' : 'FAIL'}`,
  `- Playwright regression result: ${shouldRunPlaywright ? (playwrightOk ? 'PASS' : 'FAIL') : 'SKIPPED (BASE_URL not set)'}`,
  `- Combined quality pass: **${combinedPct}%**`,
  '',
  '### Summary',
  '| Suite | Passed | Failed | Total | Pass % |',
  '|---|---:|---:|---:|---:|',
  `| Unit/Integration (Vitest) | ${unitPassed} | ${unitFailed} | ${unitTotal} | ${unitPct}% |`,
  `| Regression (Playwright) | ${e2ePassed} | ${e2eFailed} | ${e2eTotal} | ${e2ePct}% |`,
  `| Combined | ${combinedPassed} | ${combinedTotal - combinedPassed} | ${combinedTotal} | ${combinedPct}% |`,
  '',
  '### Coverage (Vitest)',
  '| Metric | Percentage |',
  '|---|---:|',
  `| Lines | ${lineCoverage}% |`,
  `| Branches | ${branchCoverage}% |`,
  `| Functions | ${functionCoverage}% |`,
  `| Statements | ${statementCoverage}% |`,
  '',
  '### Artifacts',
  '- `.qa/vitest-results.json`',
  '- `.qa/coverage/coverage-summary.json`',
  '- `.qa/coverage/lcov.info`',
  '- `.qa/playwright-results.json`',
  '',
  '---',
  '',
  '## Scope',
  'Validate the full path from lead intake to intelligence rendering and actionability.',
  '',
  '## Flow A — Lead intake to lead detail intelligence',
  'Status: covered by Playwright regression suite.',
  '',
  '## Flow B — Manual retrigger',
  'Status: covered by Playwright regression suite.',
  '',
  '## Flow C — Draft reply from intelligence',
  'Status: covered by Playwright regression suite.',
  '',
  '## Flow D — Convert from intelligence',
  'Status: covered by Playwright regression suite.',
  '',
  '## Flow E — Prioritize from intelligence',
  'Status: covered by Playwright regression suite.',
  '',
  '## Flow F — AI Sales Agent mirror',
  'Status: covered by Playwright regression suite.',
  '',
  '## Role Validation',
  'Status: covered for `admin`, `sales_manager`, `sales_rep`, `ops` in Playwright suite.',
].join('\n');

fs.writeFileSync(regressionDocPath, `${report}\n`, 'utf8');
console.log(`\nWrote regression report: ${regressionDocPath}\n`);

if (!vitestOk || !playwrightOk) {
  process.exit(1);
}
