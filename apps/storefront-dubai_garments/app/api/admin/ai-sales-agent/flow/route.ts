import { NextRequest, NextResponse } from 'next/server';
import { resolveAgentFlow } from '@/lib/ai-sales-agent/flow-model';
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
    const body = await request.json();
    const leadId = typeof body?.leadId === 'string' ? body.leadId : undefined;
    const dealId = typeof body?.dealId === 'string' ? body.dealId : undefined;

    if (!leadId && !dealId) {
      return NextResponse.json(
        { ok: false, message: 'leadId or dealId is required.', requestId },
        { status: 400 }
      );
    }

    const result = await resolveAgentFlow({
        leadId,
        dealId,
        context: {
            userId: session.sub,
            role: session.role,
        },
    });

    return NextResponse.json({
      ok: true,
      requestId,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to resolve agent flow.';

    return NextResponse.json(
      { ok: false, message, requestId },
      { status: 500 }
    );
  }
}
