import { NextRequest, NextResponse } from 'next/server';
import { CopilotExecuteRequestSchema } from '@/lib/ai-sales-agent/contracts';
import {
  canExecuteCopilotAction,
  executeCopilotAction,
} from '@/lib/ai-sales-agent/actions';
import { writeCopilotAuditLog } from '@/lib/ai-sales-agent/audit';
import { verifySessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getSessionFromRequest(request: NextRequest) {
  const token =
    request.cookies.get('app_session')?.value ||
    request.cookies.get('session')?.value ||
    null;

  if (!token) return null;
  return verifySessionToken(token);
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');

  try {
    const session = await getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { ok: false, message: 'Unauthorized.', requestId },
        { status: 401 }
      );
    }

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