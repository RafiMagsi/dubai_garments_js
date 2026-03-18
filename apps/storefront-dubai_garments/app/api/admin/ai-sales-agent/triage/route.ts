import { NextRequest, NextResponse } from 'next/server';
import { LeadTriageRequestSchema } from '@/lib/ai-sales-agent/contracts';
import { runLeadTriage } from '@/lib/ai-sales-agent/triage';
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
    };

    const result = await runLeadTriage(
      parsed.data.leadId,
      triageContext,
      parsed.data.dry_run
    );

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
