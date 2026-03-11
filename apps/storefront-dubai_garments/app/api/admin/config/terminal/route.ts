import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import {
  completeAdminConfigCommandRun,
  createAdminConfigCommandRun,
} from '@/lib/admin/config-audit';
import { requireAdminSession } from '@/lib/auth/require-admin';
import { logApiEvent } from '@/lib/observability/logger';
import { observeApiRequest } from '@/lib/observability/metrics';

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

const ALLOWED_COMMANDS: Array<{ label: string; cmd: string; args: string[] }> = [
  { label: 'npm run db:migrate', cmd: 'npm', args: ['run', 'db:migrate'] },
  { label: 'npm run db:rollback', cmd: 'npm', args: ['run', 'db:rollback'] },
  { label: 'npm run db:tables', cmd: 'npm', args: ['run', 'db:tables'] },
  { label: 'npm run db:seed', cmd: 'npm', args: ['run', 'db:seed'] },
  { label: 'npm run db:seed:users', cmd: 'npm', args: ['run', 'db:seed:users'] },
  { label: 'pwd', cmd: 'pwd', args: [] },
  { label: 'ls -la', cmd: 'ls', args: ['-la'] },
  { label: 'node -v', cmd: 'node', args: ['-v'] },
  { label: 'npm -v', cmd: 'npm', args: ['-v'] },
  { label: 'psql --version', cmd: 'psql', args: ['--version'] },
];

async function runCommand(command: string) {
  const allowed = ALLOWED_COMMANDS.find((item) => item.label === command);
  if (!allowed) {
    return {
      ok: false,
      status: 403,
      message:
        'Command not allowed. Use one of the supported commands from terminal help list.',
      output: '',
    };
  }

  const cwd = resolveStorefrontAppDir();
  return new Promise<{ ok: boolean; status: number; message: string; output: string }>((resolve) => {
    const child = spawn(allowed.cmd, allowed.args, {
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
      const ok = (code ?? 1) === 0;
      resolve({
        ok,
        status: ok ? 200 : 500,
        message: ok ? `Command executed: ${allowed.label}` : `Command failed: ${allowed.label}`,
        output: output.slice(-15000),
      });
    });
    child.on('error', (error) => {
      resolve({
        ok: false,
        status: 500,
        message: `Command failed: ${allowed.label}`,
        output: String(error.message || error),
      });
    });
  });
}

export async function GET() {
  const startedAt = Date.now();
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof NextResponse) {
    observeApiRequest('/api/admin/config/terminal', sessionOrResponse.status, Date.now() - startedAt);
    return sessionOrResponse;
  }

  observeApiRequest('/api/admin/config/terminal', 200, Date.now() - startedAt);
  return NextResponse.json({
    items: ALLOWED_COMMANDS.map((item) => item.label),
  });
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = request.headers.get('x-request-id') || 'n/a';
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof NextResponse) {
    observeApiRequest('/api/admin/config/terminal', sessionOrResponse.status, Date.now() - startedAt);
    return sessionOrResponse;
  }
  const session = sessionOrResponse;

  const body = (await request.json().catch(() => ({}))) as { command?: string };
  const command = String(body.command || '').trim();
  if (!command) {
    observeApiRequest('/api/admin/config/terminal', 422, Date.now() - startedAt);
    return NextResponse.json({ message: 'Command is required.' }, { status: 422 });
  }

  const runId = await createAdminConfigCommandRun({
    userId: session.sub,
    userEmail: session.email,
    executionType: 'terminal',
    commandKey: command,
    commandLabel: command,
    inputPayload: { command },
  });

  const result = await runCommand(command);
  await completeAdminConfigCommandRun({
    runId,
    ok: result.ok,
    output: result.output,
    errorMessage: result.ok ? undefined : result.output,
  });
  observeApiRequest('/api/admin/config/terminal', result.status, Date.now() - startedAt);
  logApiEvent(result.ok ? 'info' : 'error', 'admin_terminal_command', {
    request_id: requestId,
    command,
    ok: result.ok,
    status: result.status,
    duration_ms: Date.now() - startedAt,
  });
  return NextResponse.json(
    {
      ok: result.ok,
      command,
      message: result.message,
      output: result.output,
      executedAt: new Date().toISOString(),
    },
    { status: result.status }
  );
}
