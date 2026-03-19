import { NextRequest, NextResponse } from 'next/server';
import { AutomationRunDetailRequestSchema } from '@/lib/ai-sales-agent/contracts';
import { getAutomationRunDetails } from '@/lib/ai-sales-agent/automation-run-details';
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

    const body = await request.json();
    const parsed = AutomationRunDetailRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: getAiPayloadValidationMessage(
            parsed.error,
            'Invalid automation run detail payload.'
          ),
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const result = await getAutomationRunDetails(parsed.data);

    return NextResponse.json({
      ok: true,
      ...result,
      processingMs: Date.now() - startedAt,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load automation run details.';

    return NextResponse.json(
      { ok: false, message, requestId },
      { status: 500 }
    );
  }
}
