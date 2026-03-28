import { NextRequest, NextResponse } from 'next/server';
import { QuoteCopilotRequestSchema } from '@/lib/ai-sales-agent/contracts';
import { runQuoteCopilot } from '@/lib/ai-sales-agent/quote-copilot';
import { getAiPayloadValidationMessage } from '@/lib/ai-sales-agent/validation-messages';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';
import { acquireApiRateLimitSlot } from '@/lib/ai-sales-agent/llm-runtime/rate-limit';

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
    const parsed = QuoteCopilotRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: getAiPayloadValidationMessage(parsed.error, 'Invalid quote copilot payload.'),
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const limiter = acquireApiRateLimitSlot({
      endpoint: 'quote-copilot',
      identity: session.sub,
      maxPerMinute: Number(process.env.AI_RUNTIME_RATE_LIMIT_PER_MINUTE ?? 30),
      maxInFlight: Number(process.env.AI_RUNTIME_MAX_INFLIGHT ?? 4),
      requestId,
    });
    if (!limiter.ok) {
      return limiter.response;
    }

    let result;
    try {
      result = await runQuoteCopilot({
        ...parsed.data,
        context: {
          userId: session.sub,
          role: session.role,
          requestId: requestId ?? undefined,
        },
      });
    } finally {
      limiter.release();
    }

    return NextResponse.json({
      ok: true,
      leadId: result.leadId,
      dealId: result.dealId,
      quoteId: result.quoteId,
      source: result.source,
      provider: result.provider,
      model: result.model,
      fallbackUsed: result.fallbackUsed,
      schemaValid: result.schemaValid,
      failureReason: result.failureReason,
      data: result.data,
      processingMs: result.processingMs ?? Date.now() - startedAt,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to run quote copilot.';

    return NextResponse.json(
      { ok: false, message, requestId },
      { status: 500 }
    );
  }
}
