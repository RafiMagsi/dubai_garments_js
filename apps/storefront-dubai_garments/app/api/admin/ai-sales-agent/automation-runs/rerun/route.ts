import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';
import { AutomationRunRerunRequestSchema } from '@/lib/ai-sales-agent/contracts';
import { getAiPayloadValidationMessage } from '@/lib/ai-sales-agent/validation-messages';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');

  try {
    const sessionOrResponse = await requireAdminApiAccess(request);
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    const session = sessionOrResponse;

    const body = await request.json();
    const parsed = AutomationRunRerunRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: getAiPayloadValidationMessage(parsed.error, 'Invalid rerun payload.'),
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const run = await prisma.automation_runs.findUnique({
      where: { id: parsed.data.runId },
    });

    if (!run) {
      return NextResponse.json(
        { ok: false, message: 'Automation run not found.', requestId },
        { status: 404 }
      );
    }

    const guardrailPassed =
      run.status !== 'running' &&
      run.status !== 'queued' &&
      !!run.workflow_name;

    const outcome = guardrailPassed
      ? 'Rerun request recorded.'
      : 'Rerun blocked by guardrails: run is active or workflow is invalid.';

    await prisma.activities.create({
      data: {
        user_id: session.sub,
        activity_type: 'ai_automation_rerun',
        title: `AI Automation Rerun: ${run.workflow_name}`,
        details: outcome,
        metadata: {
          runId: run.id,
          workflowName: run.workflow_name,
          guardrailPassed,
          note: parsed.data.note ?? null,
          requestId,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      runId: run.id,
      guardrailPassed,
      outcome,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to rerun automation run.';

    return NextResponse.json(
      { ok: false, message, requestId },
      { status: 500 }
    );
  }
}
