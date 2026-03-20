import { NextRequest, NextResponse } from 'next/server';
import { LeadTriageRequestSchema } from '@/lib/ai-sales-agent/contracts';
import { runLeadTriage } from '@/lib/ai-sales-agent/triage';
import { getAiPayloadValidationMessage } from '@/lib/ai-sales-agent/validation-messages';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';
import { acquireApiRateLimitSlot } from '@/lib/ai-sales-agent/llm-runtime/rate-limit';

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
    const parsed = LeadTriageRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: getAiPayloadValidationMessage(parsed.error, 'Invalid triage payload.'),
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const triageContext = {
      userId: session.sub,
      role: session.role,
      requestId: requestId ?? undefined,
    };

    const limiter = acquireApiRateLimitSlot({
      endpoint: 'triage',
      identity: session.sub,
      maxPerMinute: Number(process.env.AI_RUNTIME_RATE_LIMIT_PER_MINUTE ?? 40),
      maxInFlight: Number(process.env.AI_RUNTIME_MAX_INFLIGHT ?? 4),
      requestId,
    });
    if (!limiter.ok) {
      return limiter.response;
    }

    let result;
    try {
      // Intentional Phase-2 policy: triage remains deterministic/internal for cost/control.
      // LLM enablement for triage is deferred to a later phase.
      result = await runLeadTriage(
        parsed.data.leadId,
        triageContext,
        parsed.data.dry_run
      );
    } finally {
      limiter.release();
    }

    return NextResponse.json({
        ok: true,
        dryRun: parsed.data.dry_run,
        source: result.source,
        provider: result.provider,
        fallbackUsed: result.fallbackUsed,
        failureReason: result.failureReason,
        persisted: result.persisted,
        leadId: parsed.data.leadId,
        data: result.data,
        requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to run lead triage.';

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
