#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const rootDir = path.resolve(process.cwd());
const projectRoot = rootDir.endsWith('apps/storefront-dubai_garments')
  ? rootDir
  : path.resolve(rootDir, 'apps/storefront-dubai_garments');

const baseUrl = process.env.BASE_URL || process.env.APP_BASE_URL || 'http://localhost:3000';
const email = process.env.QA_ADMIN_EMAIL || 'admin@dubaigarments.me';
const password = process.env.QA_ADMIN_PASSWORD || 'test@1234';

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.resolve(projectRoot, `../..`, `docs/qa/visual-goldens/${stamp}-day29-showcase`);
fs.mkdirSync(outDir, { recursive: true });

function out(name) {
  return path.join(outDir, `${name}.png`);
}

async function login(page) {
  await page.goto(`${baseUrl}/admin/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 30000 });
}

async function captureTab(page, tabName, fileName) {
  await page.goto(`${baseUrl}/admin/ai-sales-agent`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: tabName }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: out(fileName), fullPage: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage();

  await login(page);

  await page.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: out('01-dashboard-impact-kpis'), fullPage: true });

  await page.goto(`${baseUrl}/admin/ai-sales-agent`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: out('02-ai-agent-copilot'), fullPage: true });

  await captureTab(page, 'Lead Intelligence', '03-ai-agent-lead-intelligence');
  await captureTab(page, 'Reply Studio', '04-ai-agent-reply-studio');
  await captureTab(page, 'Quote Copilot', '05-ai-agent-quote-copilot');
  await captureTab(page, 'Pipeline Insights', '06-ai-agent-pipeline-insights');
  await captureTab(page, 'Agent Flow', '07-ai-agent-agent-flow');
  await captureTab(page, 'Automation Runs', '08-ai-agent-automation-runs');
  await captureTab(page, 'Model Settings', '09-ai-agent-model-settings');

  // Capture lead detail intelligence + flow for parity snapshot.
  const leadsRes = await page.request.get(`${baseUrl}/api/admin/leads`);
  if (leadsRes.ok()) {
    const payload = await leadsRes.json();
    const leadId = payload?.items?.[0]?.id;
    if (leadId) {
      await page.goto(`${baseUrl}/admin/leads/${leadId}`, { waitUntil: 'networkidle' });
      await page.screenshot({ path: out('10-lead-detail-ai-intelligence-flow'), fullPage: true });
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    outputDir: outDir,
    files: fs.readdirSync(outDir).filter((name) => name.endsWith('.png')).sort(),
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  await browser.close();

  console.log('Showcase baseline screenshots captured.');
  console.log(`Output: ${outDir}`);
  console.log(`Files: ${manifest.files.length}`);
}

run().catch((error) => {
  console.error('Failed to capture showcase baseline screenshots.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

