import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/require-admin';
import { getAiImpactKpis } from '@/lib/ai-sales-agent/impact-kpis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');

  try {
    const sessionOrResponse = await requireAdminApiAccess(request);
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    const result = await getAiImpactKpis();

    return NextResponse.json({
      ok: true,
      ...result,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load AI impact KPIs.';
    return NextResponse.json({ ok: false, message, requestId }, { status: 500 });
  }
}

