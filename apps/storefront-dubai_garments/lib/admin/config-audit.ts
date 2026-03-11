import { prisma } from '@/lib/prisma';

type CreateAuditInput = {
  userId?: string;
  userEmail?: string;
  executionType: 'script' | 'terminal';
  commandKey: string;
  commandLabel: string;
  inputPayload?: Record<string, unknown>;
};

export async function createAdminConfigCommandRun(input: CreateAuditInput): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO admin_config_command_runs (
        user_id,
        user_email,
        execution_type,
        command_key,
        command_label,
        input_payload,
        status,
        started_at
      )
      VALUES (
        ${input.userId || null}::uuid,
        ${input.userEmail || null},
        ${input.executionType},
        ${input.commandKey},
        ${input.commandLabel},
        ${JSON.stringify(input.inputPayload || {})}::jsonb,
        'running',
        NOW()
      )
      RETURNING id::text
    `;
    return rows[0]?.id || null;
  } catch {
    // The audit table might not exist before migration; fail-open.
    return null;
  }
}

export async function completeAdminConfigCommandRun(input: {
  runId: string | null;
  ok: boolean;
  output?: string;
  errorMessage?: string;
}) {
  if (!input.runId) {
    return;
  }
  try {
    await prisma.$executeRaw`
      UPDATE admin_config_command_runs
      SET
        status = ${input.ok ? 'success' : 'failed'},
        output_log = ${input.output || null},
        error_message = ${input.errorMessage || null},
        finished_at = NOW(),
        updated_at = NOW()
      WHERE id = ${input.runId}::uuid
    `;
  } catch {
    // fail-open
  }
}
