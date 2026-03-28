import { NextRequest, NextResponse } from 'next/server';
import { CopilotExecuteRequestSchema } from '@/lib/ai-sales-agent/contracts';
import {
  canExecuteCopilotAction,
  executeCopilotAction,
} from '@/lib/ai-sales-agent/actions';
import { writeCopilotAuditLog } from '@/lib/ai-sales-agent/audit';
import { getAiPayloadValidationMessage } from '@/lib/ai-sales-agent/validation-messages';
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

  try {
    const rawBody = await request.json();
    const parsed = CopilotExecuteRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: getAiPayloadValidationMessage(parsed.error, 'Invalid execute payload.'),
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

    const executed = true;

    const auditId = await writeCopilotAuditLog({
      userId: session.sub,
      leadId: input.leadId ?? null,
      dealId: input.dealId ?? null,
      title: `Executed copilot action: ${input.action}`,
      details: 'Copilot action executed successfully.',
      metadata: {
        requestId,
        action: input.action,
        role: session.role,
        result,
      },
    });

    return NextResponse.json({
      ok: true,
      action: input.action,
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
