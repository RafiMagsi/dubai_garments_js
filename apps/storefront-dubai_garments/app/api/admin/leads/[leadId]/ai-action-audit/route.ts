import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  const requestId = request.headers.get('x-request-id');

  try {
    const sessionOrResponse = await requireAdminApiAccess(request);
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    const session = sessionOrResponse;

    const { leadId } = await context.params;
    const body = await request.json();

    const action = body?.action;
    const outcome = body?.outcome;
    const details = body?.details ?? null;
    const metadata = body?.metadata ?? {};

    if (!action || !outcome) {
      return NextResponse.json(
        { ok: false, message: 'action and outcome are required.', requestId },
        { status: 400 }
      );
    }

    const activity = await prisma.activities.create({
      data: {
        user_id: session.sub,
        lead_id: leadId,
        activity_type: 'ai_lead_intelligence_action',
        title: `AI action: ${action}`,
        details: details || `Action "${action}" completed with outcome "${outcome}".`,
        metadata: {
          requestId,
          action,
          outcome,
          source: 'lead_intelligence_cards',
          ...metadata,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      activityId: activity.id,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to write AI action audit event.';

    return NextResponse.json(
      { ok: false, message, requestId },
      { status: 500 }
    );
  }
}
