import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import {
  completeAdminConfigCommandRun,
  createAdminConfigCommandRun,
} from '@/lib/admin/config-audit';
import { requireAdminSession } from '@/lib/auth/require-admin';
import { getRuntimeSetting } from '@/lib/config/runtime-settings';

export const runtime = 'nodejs';

function resolveStorefrontAppDir() {
  const cwd = process.cwd();
  const localScriptsPath = path.join(cwd, 'scripts', 'db-migrate.sh');
  if (fs.existsSync(localScriptsPath)) {
    return cwd;
  }
  const monorepoPath = path.join(cwd, 'apps', 'storefront-dubai_garments');
  const monorepoScriptsPath = path.join(monorepoPath, 'scripts', 'db-migrate.sh');
  if (fs.existsSync(monorepoScriptsPath)) {
    return monorepoPath;
  }
  return cwd;
}

async function runCommand(command: string, args: string[], cwd: string) {
  return new Promise<{ code: number; output: string }>((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    let output = '';
    child.stdout.on('data', (chunk) => {
      output += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      output += String(chunk);
    });
    child.on('close', (code) => {
      resolve({ code: code ?? 1, output: output.slice(-12000) });
    });
    child.on('error', (error) => {
      resolve({ code: 1, output: String(error.message || error) });
    });
  });
}

async function runFastApiPost(endpoint: string, body: Record<string, unknown>) {
  const fastApiBaseUrl = await getRuntimeSetting({
    key: 'FASTAPI_BASE_URL',
    scope: 'storefront',
    defaultValue: process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000',
  });
  const automationSharedSecret = await getRuntimeSetting({
    key: 'AUTOMATION_SHARED_SECRET',
    scope: 'storefront',
    defaultValue: '',
  });

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (automationSharedSecret.trim()) {
    headers['X-Automation-Token'] = automationSharedSecret.trim();
  }
  const response = await fetch(`${fastApiBaseUrl}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

async function runRetryFailedAutomations() {
  const fastApiBaseUrl = await getRuntimeSetting({
    key: 'FASTAPI_BASE_URL',
    scope: 'storefront',
    defaultValue: process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000',
  });
  const listResponse = await fetch(`${fastApiBaseUrl}/api/v1/automation-runs?status=failed&limit=25`, {
    method: 'GET',
    cache: 'no-store',
  });
  const listPayload = (await listResponse.json().catch(() => ({}))) as {
    items?: Array<{ id?: string; retryable?: boolean; workflow_name?: string }>;
  };

  if (!listResponse.ok) {
    return {
      ok: false,
      message: 'Failed to load failed automation runs.',
      result: listPayload as Record<string, unknown>,
    };
  }

  const retryables = (listPayload.items || []).filter((item) => item.retryable && item.id);
  const attempts: Array<Record<string, unknown>> = [];

  for (const item of retryables) {
    const response = await fetch(`${fastApiBaseUrl}/api/v1/automation-runs/${item.id}/retry`, {
      method: 'POST',
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    attempts.push({
      runId: item.id,
      workflow: item.workflow_name,
      ok: response.ok,
      status: response.status,
      payload,
    });
  }

  const successCount = attempts.filter((item) => item.ok).length;
  return {
    ok: true,
    message: `Retried ${attempts.length} automation run(s), success: ${successCount}.`,
    result: {
      failedCount: (listPayload.items || []).length,
      retriedCount: attempts.length,
      successCount,
      attempts,
    },
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ scriptKey: string }> }
) {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }
  const session = sessionOrResponse;

  const { scriptKey } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { input?: Record<string, unknown> };
  const input = body?.input || {};

  try {
    if (scriptKey === 'scheduler_followup_sweep') {
      const runId = await createAdminConfigCommandRun({
        userId: session.sub,
        userEmail: session.email,
        executionType: 'script',
        commandKey: scriptKey,
        commandLabel: '/api/v1/automation/scheduler/followups/run',
        inputPayload: input,
      });
      const limit = Number(input.limit || 100);
      const result = await runFastApiPost('/api/v1/automation/scheduler/followups/run', { limit });
      await completeAdminConfigCommandRun({
        runId,
        ok: result.ok,
        output: JSON.stringify(result.payload),
        errorMessage: result.ok ? undefined : JSON.stringify(result.payload),
      });
      return NextResponse.json(
        {
          ok: result.ok,
          scriptKey,
          message: result.ok ? 'Follow-up sweep executed.' : 'Follow-up sweep failed.',
          executedAt: new Date().toISOString(),
          result: result.payload,
        },
        { status: result.ok ? 200 : result.status }
      );
    }

    if (scriptKey === 'scheduler_digest_report') {
      const runId = await createAdminConfigCommandRun({
        userId: session.sub,
        userEmail: session.email,
        executionType: 'script',
        commandKey: scriptKey,
        commandLabel: '/api/v1/automation/scheduler/digest/run',
        inputPayload: input,
      });
      const recipient_email = String(input.recipient_email || '').trim() || null;
      const result = await runFastApiPost('/api/v1/automation/scheduler/digest/run', { recipient_email });
      await completeAdminConfigCommandRun({
        runId,
        ok: result.ok,
        output: JSON.stringify(result.payload),
        errorMessage: result.ok ? undefined : JSON.stringify(result.payload),
      });
      return NextResponse.json(
        {
          ok: result.ok,
          scriptKey,
          message: result.ok ? 'Digest report job executed.' : 'Digest report job failed.',
          executedAt: new Date().toISOString(),
          result: result.payload,
        },
        { status: result.ok ? 200 : result.status }
      );
    }

    if (scriptKey === 'scheduler_cold_lead_detection') {
      const runId = await createAdminConfigCommandRun({
        userId: session.sub,
        userEmail: session.email,
        executionType: 'script',
        commandKey: scriptKey,
        commandLabel: '/api/v1/automation/scheduler/cold-leads/run',
        inputPayload: input,
      });
      const threshold_days = Number(input.threshold_days || 10);
      const limit = Number(input.limit || 200);
      const result = await runFastApiPost('/api/v1/automation/scheduler/cold-leads/run', {
        threshold_days,
        limit,
      });
      await completeAdminConfigCommandRun({
        runId,
        ok: result.ok,
        output: JSON.stringify(result.payload),
        errorMessage: result.ok ? undefined : JSON.stringify(result.payload),
      });
      return NextResponse.json(
        {
          ok: result.ok,
          scriptKey,
          message: result.ok ? 'Cold lead detection executed.' : 'Cold lead detection failed.',
          executedAt: new Date().toISOString(),
          result: result.payload,
        },
        { status: result.ok ? 200 : result.status }
      );
    }

    if (scriptKey === 'demo_data_seed') {
      const runId = await createAdminConfigCommandRun({
        userId: session.sub,
        userEmail: session.email,
        executionType: 'script',
        commandKey: scriptKey,
        commandLabel: '/api/v1/admin/config/demo-data/seed',
        inputPayload: input,
      });
      const leads = Number(input.leads || 40);
      const deals = Number(input.deals || 28);
      const quotes = Number(input.quotes || 22);
      const result = await runFastApiPost('/api/v1/admin/config/demo-data/seed', { leads, deals, quotes });
      await completeAdminConfigCommandRun({
        runId,
        ok: result.ok,
        output: JSON.stringify(result.payload),
        errorMessage: result.ok ? undefined : JSON.stringify(result.payload),
      });
      return NextResponse.json(
        {
          ok: result.ok,
          scriptKey,
          message: result.ok ? 'Demo data seeding completed.' : 'Demo data seeding failed.',
          executedAt: new Date().toISOString(),
          result: result.payload,
        },
        { status: result.ok ? 200 : result.status }
      );
    }

    if (scriptKey === 'retry_failed_automations') {
      const runId = await createAdminConfigCommandRun({
        userId: session.sub,
        userEmail: session.email,
        executionType: 'script',
        commandKey: scriptKey,
        commandLabel: 'retry_failed_automations',
        inputPayload: input,
      });
      const result = await runRetryFailedAutomations();
      await completeAdminConfigCommandRun({
        runId,
        ok: result.ok,
        output: JSON.stringify(result.result || {}),
        errorMessage: result.ok ? undefined : result.message,
      });
      return NextResponse.json(
        {
          ok: result.ok,
          scriptKey,
          message: result.message,
          executedAt: new Date().toISOString(),
          result: result.result,
        },
        { status: result.ok ? 200 : 500 }
      );
    }

    if (
      scriptKey === 'db_migrate' ||
      scriptKey === 'db_view_tables' ||
      scriptKey === 'db_seed_products' ||
      scriptKey === 'db_seed_users'
    ) {
      const appDir = resolveStorefrontAppDir();
      const args =
        scriptKey === 'db_migrate'
          ? ['run', 'db:migrate']
          : scriptKey === 'db_view_tables'
            ? ['run', 'db:tables']
          : scriptKey === 'db_seed_products'
            ? ['run', 'db:seed']
            : ['run', 'db:seed:users'];
      const commandLabel = `npm ${args.join(' ')}`;
      const runId = await createAdminConfigCommandRun({
        userId: session.sub,
        userEmail: session.email,
        executionType: 'script',
        commandKey: scriptKey,
        commandLabel,
        inputPayload: input,
      });
      const result = await runCommand('npm', args, appDir);
      const ok = result.code === 0;
      await completeAdminConfigCommandRun({
        runId,
        ok,
        output: result.output,
        errorMessage: ok ? undefined : result.output,
      });
      return NextResponse.json(
        {
          ok,
          scriptKey,
          message: ok ? `Command executed: npm ${args.join(' ')}` : `Command failed: npm ${args.join(' ')}`,
          executedAt: new Date().toISOString(),
          output: result.output,
        },
        { status: ok ? 200 : 500 }
      );
    }

    return NextResponse.json({ message: `Unsupported script key: ${scriptKey}` }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Script execution failed.';
    return NextResponse.json(
      {
        ok: false,
        scriptKey,
        message,
        executedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
