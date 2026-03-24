import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';
import { getAssignmentKpiTargets } from '@/lib/ai-sales-agent/assignment-kpi-targets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');
  try {
    const sessionOrResponse = await requireAdminApiAccess(request);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;
    const session = sessionOrResponse;

    const result = await getAssignmentKpiTargets({
      userId: session.sub,
      role: session.role,
      requestId,
    });

    return NextResponse.json({
      ok: true,
      requestId,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load assignment KPI targets.';
    return NextResponse.json({ ok: false, message, requestId }, { status: 500 });
  }
}
