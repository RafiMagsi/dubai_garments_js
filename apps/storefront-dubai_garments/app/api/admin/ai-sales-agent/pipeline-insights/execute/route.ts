import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PipelineInsightExecuteRequestSchema } from '@/lib/ai-sales-agent/contracts';
import { getAiPayloadValidationMessage } from '@/lib/ai-sales-agent/validation-messages';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');
  const startedAt = Date.now();

  try {
    const sessionOrResponse = await requireAdminApiAccess(request);
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    const session = sessionOrResponse;

    const body = await request.json();
    const parsed = PipelineInsightExecuteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: getAiPayloadValidationMessage(
            parsed.error,
            'Invalid pipeline insight execution payload.'
          ),
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const { action, leadId, dealId, payload } = parsed.data;

    let outcome = '';

    if (action === 'draft_followup') {
      outcome = 'Follow-up draft trigger recorded from pipeline insight.';
    }

    if (action === 'assign_owner') {
      outcome = `Owner assignment suggestion recorded for ${payload?.ownerUserId || 'unassigned target'}.`;
    }

    if (action === 'move_stage_suggestion') {
      outcome = `Stage move suggestion recorded for ${payload?.suggestedStage || 'next stage'}.`;
    }

    await prisma.activities.create({
      data: {
        user_id: session.sub,
        lead_id: leadId ?? null,
        deal_id: dealId ?? null,
        activity_type: 'ai_pipeline_insight_execution',
        title: `AI Pipeline Action: ${action}`,
        details: outcome,
        metadata: {
          requestId,
          action,
          payload,
          source: 'pipeline_insights_panel',
        },
      },
    });

    return NextResponse.json({
      ok: true,
      action,
      leadId: leadId ?? null,
      dealId: dealId ?? null,
      outcome,
      processingMs: Date.now() - startedAt,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to execute pipeline insight action.';

    return NextResponse.json(
      { ok: false, message, requestId },
      { status: 500 }
    );
  }
}
