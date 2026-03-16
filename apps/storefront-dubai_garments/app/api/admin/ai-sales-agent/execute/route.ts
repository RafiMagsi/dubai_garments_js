import { NextRequest, NextResponse } from 'next/server';
import { CopilotExecuteRequestSchema } from '@/lib/ai-sales-agent/contracts';
import {
  canExecuteCopilotAction,
  executeCopilotAction,
} from '@/lib/ai-sales-agent/actions';
import { writeCopilotAuditLog } from '@/lib/ai-sales-agent/audit';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');
  const sessionOrResponse = await requireAdminApiAccess(request);
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }
  const session = sessionOrResponse;
  if (!session.tenantSlug) {
    return NextResponse.json(
      { ok: false, message: 'Missing tenant context.', requestId },
      { status: 403 }
    );
  }

  try {
    const rawBody = await request.json();
    const parsed = CopilotExecuteRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Invalid execute payload.',
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;

    if (!canExecuteCopilotAction(session.role, input.action)) {
      await writeCopilotAuditLog({
        userId: session.sub,
        leadId: input.leadId ?? null,
        dealId: input.dealId ?? null,
        title: `Denied copilot action: ${input.action}`,
        details: `Role "${session.role}" is not allowed to execute this action.`,
        metadata: {
          requestId,
          action: input.action,
          dryRun: input.dry_run,
          role: session.role,
          denied: true,
          tenantId: session.tenantId ?? null,
          tenantSlug: session.tenantSlug,
        },
      });

      return NextResponse.json(
        { ok: false, message: 'Forbidden.', requestId },
        { status: 403 }
      );
    }

    const result = await executeCopilotAction(input);

    const executed = !input.dry_run;

    const auditId = await writeCopilotAuditLog({
      userId: session.sub,
      leadId: input.leadId ?? null,
      dealId: input.dealId ?? null,
      title: `${input.dry_run ? 'Simulated' : 'Executed'} copilot action: ${input.action}`,
      details: input.dry_run
        ? 'Dry run mode only. No persistent side effects applied.'
        : 'Copilot action executed successfully.',
      metadata: {
        requestId,
        action: input.action,
        dryRun: input.dry_run,
        role: session.role,
        result,
      },
    });

    return NextResponse.json({
      ok: true,
      action: input.action,
      dryRun: input.dry_run,
      executed,
      result,
      auditId,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to execute copilot action.';

    return NextResponse.json(
      {
        ok: false,
        message,
        requestId,
      },
      { status: 500 }
    );
  }
}
