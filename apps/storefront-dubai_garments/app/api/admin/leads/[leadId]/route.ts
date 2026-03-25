import { fastApiFetch } from '@/lib/integrations/fastapi-proxy';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  'http://localhost:8000';

async function getLeadDetailFromStorefrontDb(leadId: string) {
  const lead = await prisma.leads.findUnique({ where: { id: leadId } });
  if (!lead) {
    return NextResponse.json({ message: 'Lead not found.' }, { status: 404 });
  }

  const [deal, communications, activities] = await Promise.all([
    prisma.deals.findFirst({
      where: { lead_id: leadId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        stage: true,
        title: true,
        expected_value: true,
        probability_pct: true,
        created_at: true,
      },
    }),
    prisma.communications.findMany({
      where: { lead_id: leadId },
      orderBy: { created_at: 'desc' },
      take: 100,
      select: {
        id: true,
        channel: true,
        direction: true,
        subject: true,
        message_text: true,
        sent_at: true,
        created_at: true,
      },
    }),
    prisma.activities.findMany({
      where: { lead_id: leadId },
      orderBy: { created_at: 'desc' },
      take: 200,
    }),
  ]);

  return NextResponse.json({
    item: {
      ...lead,
      budget: Number(lead.budget ?? 0),
    },
    deal: deal
      ? {
          ...deal,
          expected_value: Number(deal.expected_value ?? 0),
          created_at: deal.created_at?.toISOString() ?? null,
        }
      : null,
    communications: communications.map((c) => ({
      ...c,
      sent_at: c.sent_at?.toISOString() ?? null,
      created_at: c.created_at.toISOString(),
    })),
    activities: activities.map((a) => ({
      ...a,
      occurred_at: a.occurred_at.toISOString(),
      created_at: a.created_at.toISOString(),
      updated_at: a.updated_at.toISOString(),
    })),
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await context.params;
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/leads/${leadId}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!response.ok && response.status >= 500) {
      const fallback = await getLeadDetailFromStorefrontDb(leadId);
      fallback.headers.set('x-data-source', 'storefront-prisma-fallback');
      fallback.headers.set('x-upstream-status', String(response.status));
      return fallback;
    }
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    try {
      const { leadId } = await context.params;
      const fallback = await getLeadDetailFromStorefrontDb(leadId);
      fallback.headers.set('x-data-source', 'storefront-prisma-fallback');
      fallback.headers.set('x-upstream-status', 'fetch_error');
      return fallback;
    } catch (fallbackError) {
      const message = error instanceof Error ? error.message : 'Failed to connect to FastAPI backend.';
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : 'Fallback DB query failed.';
      return NextResponse.json(
        {
          message: `Lead detail upstream unavailable and fallback failed. Upstream: ${message}. Fallback: ${fallbackMessage}.`,
          fastApiBaseUrl: FASTAPI_BASE_URL,
        },
        { status: 503 }
      );
    }
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await context.params;
    const body = await request.json();
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to connect to FastAPI backend.';
    return NextResponse.json({ message }, { status: 502 });
  }
}
