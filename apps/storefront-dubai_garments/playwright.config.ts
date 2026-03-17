import { defineConfig } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './tests/regression',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  reporter: [
    ['list'],
    ['json', { outputFile: '.qa/playwright-results.json' }],
  ],
  use: {
    baseURL,
    viewport: { width: 1720, height: 1400 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
