import { fastApiFetch } from '@/lib/integrations/fastapi-proxy';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  'http://localhost:8000';

async function getDealDetailFromStorefrontDb(dealId: string) {
  const deal = await prisma.deals.findUnique({
    where: { id: dealId },
    include: {
      leads: {
        select: {
          contact_name: true,
          company_name: true,
          email: true,
          ai_product: true,
          requested_qty: true,
        },
      },
      customers: { select: { company_name: true } },
    },
  });
  if (!deal) {
    return NextResponse.json({ message: 'Deal not found.' }, { status: 404 });
  }

  const [quotes, communications] = await Promise.all([
    prisma.quotes.findMany({
      where: { deal_id: dealId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        quote_number: true,
        status: true,
        currency: true,
        total_amount: true,
      },
    }),
    prisma.communications.findMany({
      where: { deal_id: dealId },
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
  ]);

  return NextResponse.json({
    item: {
      id: deal.id,
      lead_id: deal.lead_id,
      customer_id: deal.customer_id,
      owner_user_id: deal.owner_user_id,
      title: deal.title,
      stage: deal.stage,
      expected_value: Number(deal.expected_value ?? 0),
      probability_pct: deal.probability_pct ?? 0,
      expected_close_date: deal.expected_close_date?.toISOString() ?? null,
      won_at: deal.won_at?.toISOString() ?? null,
      lost_reason: deal.lost_reason ?? null,
      notes: deal.notes ?? null,
      created_at: deal.created_at.toISOString(),
      updated_at: deal.updated_at.toISOString(),
      lead_contact_name: deal.leads?.contact_name ?? null,
      lead_company_name: deal.leads?.company_name ?? null,
      lead_email: deal.leads?.email ?? null,
      lead_product_name: deal.leads?.ai_product ?? null,
      lead_quantity: deal.leads?.requested_qty ?? null,
      customer_company_name: deal.customers?.company_name ?? null,
    },
    quotes: quotes.map((q) => ({ ...q, total_amount: Number(q.total_amount ?? 0) })),
    communications: communications.map((c) => ({
      ...c,
      sent_at: c.sent_at?.toISOString() ?? null,
      created_at: c.created_at.toISOString(),
    })),
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await context.params;
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/deals/${dealId}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!response.ok && response.status >= 500) {
      const fallback = await getDealDetailFromStorefrontDb(dealId);
      fallback.headers.set('x-data-source', 'storefront-prisma-fallback');
      fallback.headers.set('x-upstream-status', String(response.status));
      return fallback;
    }
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    try {
      const { dealId } = await context.params;
      const fallback = await getDealDetailFromStorefrontDb(dealId);
      fallback.headers.set('x-data-source', 'storefront-prisma-fallback');
      fallback.headers.set('x-upstream-status', 'fetch_error');
      return fallback;
    } catch (fallbackError) {
      const message = error instanceof Error ? error.message : 'Failed to connect to FastAPI backend.';
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : 'Fallback DB query failed.';
      return NextResponse.json(
        {
          message: `Deal detail upstream unavailable and fallback failed. Upstream: ${message}. Fallback: ${fallbackMessage}.`,
          fastApiBaseUrl: FASTAPI_BASE_URL,
        },
        { status: 503 }
      );
    }
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await context.params;
    const body = await request.json();
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/deals/${dealId}`, {
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
