import { fastApiFetch } from '@/lib/integrations/fastapi-proxy';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  'http://localhost:8000';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await context.params;
    const body = await request.json();
    const requestedStage = typeof body?.stage === 'string' ? body.stage.toLowerCase() : null;
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/deals/${dealId}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const payload = await response.json();

    if (response.ok && (requestedStage === 'won' || requestedStage === 'lost')) {
      // Keep lead list status aligned with outcome stage in flow/deal pipeline.
      const deal = await prisma.deals.findUnique({
        where: { id: dealId },
        select: { lead_id: true },
      });
      if (deal?.lead_id) {
        await prisma.leads.update({
          where: { id: deal.lead_id },
          data: { status: requestedStage },
        });
      }
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to connect to FastAPI backend.';
    return NextResponse.json({ message }, { status: 502 });
  }
}
