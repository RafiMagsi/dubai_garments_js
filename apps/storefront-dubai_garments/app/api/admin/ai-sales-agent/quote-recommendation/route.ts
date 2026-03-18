import { NextRequest, NextResponse } from 'next/server';
import { QuoteRecommendationRequestSchema } from '@/lib/ai-sales-agent/contracts';
import { runQuoteRecommendation } from '@/lib/ai-sales-agent/quote-recommendation';
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
    const parsed = QuoteRecommendationRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: getAiPayloadValidationMessage(parsed.error, 'Invalid quote recommendation payload.'),
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const result = await runQuoteRecommendation({
      ...parsed.data,
      context: {
        userId: session.sub,
        role: session.role,
      },
    });

    return NextResponse.json({
      ok: true,
      leadId: result.leadId,
      dealId: result.dealId,
      quoteId: result.quoteId,
      source: result.source,
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
      failureReason: result.failureReason,
      dryRun: result.dryRun,
      data: result.data,
      processingMs: Date.now() - startedAt,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to run quote recommendation.';

    return NextResponse.json(
      { ok: false, message, requestId },
      { status: 500 }
    );
  }
}
