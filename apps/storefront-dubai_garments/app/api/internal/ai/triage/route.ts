import { NextRequest, NextResponse } from 'next/server';
import { LeadTriageRequestSchema } from '@/lib/ai-sales-agent/contracts';
import { runLeadTriage } from '@/lib/ai-sales-agent/triage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');
  const providedSecret = request.headers.get('x-automation-secret');
  const configuredSecret = process.env.AUTOMATION_SHARED_SECRET;

  if (!configuredSecret || !providedSecret || providedSecret !== configuredSecret) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Unauthorized automation request.',
        requestId,
      },
      { status: 401 }
    );
  }

  try {
    const rawBody = await request.json();
    const parsed = LeadTriageRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Invalid triage payload.',
          issues: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const result = await runLeadTriage(
      parsed.data.leadId,
      {
        userId: null,
        role: 'admin',
      },
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
      error instanceof Error ? error.message : 'Failed to run internal lead triage.';

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
