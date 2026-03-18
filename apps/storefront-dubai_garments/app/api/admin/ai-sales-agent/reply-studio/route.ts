import { NextRequest, NextResponse } from 'next/server';
import {
  ReplyStudioRequestSchema,
} from '@/lib/ai-sales-agent/contracts';
import { runReplyStudio } from '@/lib/ai-sales-agent/reply-studio';
import { getAiPayloadValidationMessage } from '@/lib/ai-sales-agent/validation-messages';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/prisma';

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
    const parsed = ReplyStudioRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: getAiPayloadValidationMessage(parsed.error, 'Invalid reply studio payload.'),
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const result = await runReplyStudio({
      ...parsed.data,
      context: {
        userId: session.sub,
        role: session.role,
      },
    });

    return NextResponse.json({
      ok: true,
      leadId: parsed.data.leadId,
      source: result.source,
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
      failureReason: result.failureReason,
      dryRun: result.dryRun,
      processingMs: Date.now() - startedAt,
      data: result.data,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to run Reply Studio.';

    return NextResponse.json(
      { ok: false, message, requestId },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');

  try {
    const sessionOrResponse = await requireAdminApiAccess(request);
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    const session = sessionOrResponse;

    const body = await request.json();

    const leadId = typeof body?.leadId === 'string' ? body.leadId : null;
    const message = typeof body?.message === 'string' ? body.message : null;
    const subject = typeof body?.subject === 'string' ? body.subject : null;
    const channel = body?.channel === 'whatsapp' ? 'whatsapp' : 'email';

    if (!leadId || !message) {
      return NextResponse.json(
        {
          ok: false,
          message: 'leadId and message are required.',
          requestId,
        },
        { status: 400 }
      );
    }

    const lead = await prisma.leads.findFirst({
      where:
        session.role === 'sales_rep'
          ? { id: leadId, assigned_to_user_id: session.sub }
          : { id: leadId },
    });

    if (!lead) {
      return NextResponse.json(
        { ok: false, message: 'Lead not found or not accessible.', requestId },
        { status: 404 }
      );
    }

    const activity = await prisma.activities.create({
      data: {
        user_id: session.sub,
        lead_id: leadId,
        activity_type: 'ai_reply_studio_approved_send',
        title: 'AI Reply Studio approved and sent',
        details: `Approved and sent via ${channel}.`,
        metadata: {
          subject,
          message,
          channel,
          approvedBy: session.sub,
          requestId,
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
      error instanceof Error ? error.message : 'Failed to approve and send reply.';

    return NextResponse.json(
      { ok: false, message, requestId },
      { status: 500 }
    );
  }
}
