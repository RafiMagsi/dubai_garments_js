import { NextRequest, NextResponse } from 'next/server';
import { SmartRoutingSlaRequestSchema } from '@/lib/ai-sales-agent/contracts';
import { runSmartRoutingSla } from '@/lib/ai-sales-agent/smart-routing-sla';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';
import { getAiPayloadValidationMessage } from '@/lib/ai-sales-agent/validation-messages';

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
    const parsed = SmartRoutingSlaRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: getAiPayloadValidationMessage(
            parsed.error,
            'Invalid smart routing + SLA payload.'
          ),
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const result = await runSmartRoutingSla({
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
      error instanceof Error ? error.message : 'Failed to run smart routing + SLA.';

    return NextResponse.json(
      { ok: false, message, requestId },
      { status: 500 }
    );
  }
}
