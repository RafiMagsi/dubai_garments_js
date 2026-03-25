import { fastApiFetch } from '@/lib/integrations/fastapi-proxy';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  'http://localhost:8000';

async function getDealsFromStorefrontDb(request: NextRequest) {
  const search = String(request.nextUrl.searchParams.get('search') || '').trim();
  const stage = String(request.nextUrl.searchParams.get('stage') || '').trim().toLowerCase();
  const hasStage = ['new', 'qualified', 'quoted', 'negotiation', 'won', 'lost'].includes(stage);

  const items = await prisma.deals.findMany({
    where: {
      ...(hasStage ? { stage } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { id: { equals: search } },
              { leads: { contact_name: { contains: search, mode: 'insensitive' } } },
              { leads: { company_name: { contains: search, mode: 'insensitive' } } },
              { leads: { ai_product: { contains: search, mode: 'insensitive' } } },
              { customers: { company_name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
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
      customers: {
        select: { company_name: true },
      },
    },
    orderBy: { updated_at: 'desc' },
  });

  return {
    items: items.map((item) => ({
      id: item.id,
      lead_id: item.lead_id,
      customer_id: item.customer_id,
      owner_user_id: item.owner_user_id,
      title: item.title,
      stage: item.stage,
      expected_value: Number(item.expected_value ?? 0),
      probability_pct: item.probability_pct ?? 0,
      expected_close_date: item.expected_close_date?.toISOString() ?? null,
      won_at: item.won_at?.toISOString() ?? null,
      lost_reason: item.lost_reason ?? null,
      notes: item.notes ?? null,
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
      lead_contact_name: item.leads?.contact_name ?? null,
      lead_company_name: item.leads?.company_name ?? null,
      lead_email: item.leads?.email ?? null,
      lead_product_name: item.leads?.ai_product ?? null,
      lead_quantity: item.leads?.requested_qty ?? null,
      customer_company_name: item.customers?.company_name ?? null,
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.search;
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/deals${query}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!response.ok && response.status >= 500) {
      const fallbackPayload = await getDealsFromStorefrontDb(request);
      return NextResponse.json(fallbackPayload, {
        status: 200,
        headers: {
          'x-data-source': 'storefront-prisma-fallback',
          'x-upstream-status': String(response.status),
        },
      });
    }
    const payload = await response.json().catch(() => ({ items: [] }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    try {
      const fallbackPayload = await getDealsFromStorefrontDb(request);
      return NextResponse.json(fallbackPayload, {
        status: 200,
        headers: {
          'x-data-source': 'storefront-prisma-fallback',
          'x-upstream-status': 'fetch_error',
        },
      });
    } catch (fallbackError) {
      const message = error instanceof Error ? error.message : 'Failed to connect to FastAPI backend.';
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : 'Fallback DB query failed.';
      return NextResponse.json(
        {
          message: `Deal API upstream unavailable and fallback failed. Upstream: ${message}. Fallback: ${fallbackMessage}.`,
          fastApiBaseUrl: FASTAPI_BASE_URL,
        },
        { status: 503 }
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/deals`, {
      method: 'POST',
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
