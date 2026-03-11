import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/require-admin';

export const runtime = 'nodejs';

type EnvTarget = 'storefront' | 'fastapi';

type EnvDef = {
  key: string;
  target: EnvTarget;
  description: string;
  secret: boolean;
};

const ENV_DEFS: EnvDef[] = [
  { key: 'NEXT_PUBLIC_FASTAPI_BASE_URL', target: 'storefront', description: 'FastAPI base URL for admin/storefront proxy', secret: false },
  { key: 'AUTH_SESSION_SECRET', target: 'storefront', description: 'Session signing secret for Next.js auth cookies', secret: true },
  { key: 'DATABASE_URL', target: 'storefront', description: 'PostgreSQL connection string for Next.js/Prisma', secret: true },
  { key: 'FASTAPI_BASE_URL', target: 'storefront', description: 'Server-side FastAPI base URL for admin APIs', secret: false },
  { key: 'AUTOMATION_SHARED_SECRET', target: 'storefront', description: 'Shared automation token used by scheduler/followup endpoints', secret: true },

  { key: 'DATABASE_URL', target: 'fastapi', description: 'PostgreSQL connection string for FastAPI backend', secret: true },
  { key: 'OPENAI_API_KEY', target: 'fastapi', description: 'OpenAI API key for lead AI processing/scoring', secret: true },
  { key: 'OPENAI_MODEL', target: 'fastapi', description: 'OpenAI model name (for example gpt-4o-mini)', secret: false },
  { key: 'AUTOMATION_SHARED_SECRET', target: 'fastapi', description: 'Shared automation token for protected automation endpoints', secret: true },
  { key: 'SENDGRID_API_KEY', target: 'fastapi', description: 'SendGrid API key for outbound email', secret: true },
  { key: 'SENDGRID_INBOUND_WEBHOOK_TOKEN', target: 'fastapi', description: 'Inbound webhook token for reply detection', secret: true },
  { key: 'RESEND_API_KEY', target: 'fastapi', description: 'Resend API key for outbound email', secret: true },
  { key: 'SLACK_WEBHOOK_URL', target: 'fastapi', description: 'Slack incoming webhook URL', secret: true },
  { key: 'SLACK_ENABLED', target: 'fastapi', description: 'Enable or disable Slack notifications', secret: false },
  { key: 'TELEGRAM_BOT_TOKEN', target: 'fastapi', description: 'Telegram Bot token', secret: true },
  { key: 'TELEGRAM_CHAT_ID', target: 'fastapi', description: 'Telegram destination chat ID', secret: true },
  { key: 'TELEGRAM_ENABLED', target: 'fastapi', description: 'Enable or disable Telegram notifications', secret: false },
  { key: 'N8N_QUOTE_FOLLOWUP_WEBHOOK_URL', target: 'fastapi', description: 'n8n webhook URL for quote follow-up automation', secret: true },
  { key: 'N8N_FOLLOWUP_ENABLED', target: 'fastapi', description: 'Enable or disable n8n follow-up trigger', secret: false },
];

function storefrontEnvPath() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, '.env.local'))) {
    return path.join(cwd, '.env.local');
  }
  return path.join(cwd, 'apps', 'storefront-dubai_garments', '.env.local');
}

function fastapiEnvPath() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'services', 'fastapi_quote_api', '.env'))) {
    return path.join(cwd, 'services', 'fastapi_quote_api', '.env');
  }
  return path.join(cwd, '..', 'services', 'fastapi_quote_api', '.env');
}

function envFileByTarget(target: EnvTarget) {
  return target === 'storefront' ? storefrontEnvPath() : fastapiEnvPath();
}

function parseEnv(content: string) {
  const map = new Map<string, string>();
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx <= 0) return;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1);
    map.set(key, value);
  });
  return map;
}

function maskValue(value: string) {
  if (!value) return '';
  if (value.length <= 6) return '*'.repeat(value.length);
  return `${value.slice(0, 2)}${'*'.repeat(Math.max(4, value.length - 6))}${value.slice(-2)}`;
}

function ensureEnvFile(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf-8');
  }
}

function upsertEnvValue(filePath: string, key: string, value: string) {
  ensureEnvFile(filePath);
  const current = fs.readFileSync(filePath, 'utf-8');
  const lines = current.split(/\r?\n/);
  let found = false;

  const updated = lines.map((line) => {
    if (line.trim().startsWith('#') || !line.includes('=')) {
      return line;
    }
    const idx = line.indexOf('=');
    const existingKey = line.slice(0, idx).trim();
    if (existingKey !== key) {
      return line;
    }
    found = true;
    return `${key}=${value}`;
  });

  if (!found) {
    if (updated.length > 0 && updated[updated.length - 1].trim() !== '') {
      updated.push('');
    }
    updated.push(`${key}=${value}`);
  }

  fs.writeFileSync(filePath, `${updated.join('\n').replace(/\n*$/, '\n')}`, 'utf-8');
}

export async function GET() {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const storefrontPath = storefrontEnvPath();
    const fastapiPath = fastapiEnvPath();
    const storefrontMap = parseEnv(fs.existsSync(storefrontPath) ? fs.readFileSync(storefrontPath, 'utf-8') : '');
    const fastapiMap = parseEnv(fs.existsSync(fastapiPath) ? fs.readFileSync(fastapiPath, 'utf-8') : '');

    const items = ENV_DEFS.map((envDef) => {
      const sourceMap = envDef.target === 'storefront' ? storefrontMap : fastapiMap;
      const raw = sourceMap.get(envDef.key) || '';
      return {
        ...envDef,
        hasValue: Boolean(raw),
        value: envDef.secret ? '' : raw,
        maskedValue: envDef.secret ? maskValue(raw) : raw,
      };
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load env variables.';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const body = (await request.json()) as {
      target?: EnvTarget;
      key?: string;
      value?: string;
    };

    const target = body.target;
    const key = String(body.key || '').trim();
    const value = String(body.value ?? '');

    if (target !== 'storefront' && target !== 'fastapi') {
      return NextResponse.json({ message: 'Invalid env target.' }, { status: 422 });
    }
    if (!key) {
      return NextResponse.json({ message: 'Env key is required.' }, { status: 422 });
    }

    const def = ENV_DEFS.find((item) => item.key === key && item.target === target);
    if (!def) {
      return NextResponse.json({ message: `Env key is not editable: ${key}` }, { status: 403 });
    }

    const filePath = envFileByTarget(target);
    upsertEnvValue(filePath, key, value);

    return NextResponse.json({
      ok: true,
      target,
      key,
      message: `${key} saved to ${target} env file.`,
      requiresRestart: true,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save env variable.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
