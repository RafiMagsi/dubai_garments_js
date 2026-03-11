import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/require-admin';

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  'http://localhost:8000';

type ScriptDefinition = {
  key: string;
  name: string;
  category: string;
  description: string;
  executionType: 'fastapi' | 'local';
  workflowName?: string;
  commandLabel?: string;
  inputs?: Array<{
    key: string;
    label: string;
    type: 'number' | 'text' | 'email';
    placeholder?: string;
    min?: number;
    max?: number;
    defaultValue?: number | string;
  }>;
};

const SCRIPT_DEFINITIONS: ScriptDefinition[] = [
  {
    key: 'scheduler_followup_sweep',
    name: 'Run Follow-up Sweep',
    category: 'Automation',
    description: 'Dispatch pending follow-up emails that are due now.',
    executionType: 'fastapi',
    workflowName: 'scheduler_followup_sweep',
    inputs: [{ key: 'limit', label: 'Batch Limit', type: 'number', min: 1, max: 500, defaultValue: 100 }],
  },
  {
    key: 'scheduler_digest_report',
    name: 'Send Digest Report',
    category: 'Automation',
    description: 'Generate and send sales digest report to configured recipient.',
    executionType: 'fastapi',
    workflowName: 'scheduler_digest_report',
    inputs: [{ key: 'recipient_email', label: 'Recipient Email', type: 'email', placeholder: 'optional' }],
  },
  {
    key: 'scheduler_cold_lead_detection',
    name: 'Detect Cold Leads',
    category: 'Automation',
    description: 'Scan stale leads and create follow-up records automatically.',
    executionType: 'fastapi',
    workflowName: 'scheduler_cold_lead_detection',
    inputs: [
      { key: 'threshold_days', label: 'Threshold Days', type: 'number', min: 1, max: 180, defaultValue: 10 },
      { key: 'limit', label: 'Limit', type: 'number', min: 1, max: 1000, defaultValue: 200 },
    ],
  },
  {
    key: 'demo_data_seed',
    name: 'Seed Demo Data',
    category: 'Data',
    description: 'Create realistic demo customers, leads, deals, quotes, and quote items.',
    executionType: 'fastapi',
    workflowName: 'demo_data_seed',
    inputs: [
      { key: 'leads', label: 'Leads', type: 'number', min: 1, max: 1000, defaultValue: 40 },
      { key: 'deals', label: 'Deals', type: 'number', min: 1, max: 1000, defaultValue: 28 },
      { key: 'quotes', label: 'Quotes', type: 'number', min: 1, max: 1000, defaultValue: 22 },
    ],
  },
  {
    key: 'retry_failed_automations',
    name: 'Retry Failed Automations',
    category: 'Operations',
    description: 'Find latest failed retryable automation runs and queue retries.',
    executionType: 'fastapi',
  },
  {
    key: 'db_migrate',
    name: 'Database Migrate',
    category: 'Database',
    description: 'Run database migrations for storefront database.',
    executionType: 'local',
    commandLabel: 'npm run db:migrate',
  },
  {
    key: 'db_seed_products',
    name: 'Seed Product Catalog',
    category: 'Database',
    description: 'Run Prisma seed to populate products and variants.',
    executionType: 'local',
    commandLabel: 'npm run db:seed',
  },
  {
    key: 'db_seed_users',
    name: 'Seed Users',
    category: 'Database',
    description: 'Seed default admin/customer users from local environment.',
    executionType: 'local',
    commandLabel: 'npm run db:seed:users',
  },
];

async function fetchLastRun(workflowName: string) {
  const response = await fetch(
    `${FASTAPI_BASE_URL}/api/v1/automation-runs?workflow_name=${encodeURIComponent(workflowName)}&limit=1`,
    {
      method: 'GET',
      cache: 'no-store',
    }
  );
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as { items?: Array<Record<string, unknown>> };
  const item = payload.items?.[0];
  if (!item) {
    return null;
  }
  return {
    runId: String(item.id || ''),
    status: String(item.status || 'unknown'),
    startedAt: item.started_at ? String(item.started_at) : null,
    finishedAt: item.finished_at ? String(item.finished_at) : null,
    errorMessage: item.error_message ? String(item.error_message) : null,
  };
}

export async function GET() {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const items = await Promise.all(
      SCRIPT_DEFINITIONS.map(async (script) => ({
        ...script,
        lastRun: script.workflowName ? await fetchLastRun(script.workflowName) : null,
      }))
    );

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load configuration scripts.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
