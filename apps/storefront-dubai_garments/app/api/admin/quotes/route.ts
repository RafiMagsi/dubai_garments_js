import { fastApiFetch } from '@/lib/integrations/fastapi-proxy';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  'http://localhost:8000';

async function getQuotesFromStorefrontDb(request: NextRequest) {
  const search = String(request.nextUrl.searchParams.get('search') || '').trim();
  const status = String(request.nextUrl.searchParams.get('status') || '').trim().toLowerCase();
  const hasStatus = ['draft', 'sent', 'approved', 'rejected', 'expired'].includes(status);

  const items = await prisma.quotes.findMany({
    where: {
      ...(hasStatus ? { status } : {}),
      ...(search
        ? {
            OR: [
              { quote_number: { contains: search, mode: 'insensitive' } },
              { notes: { contains: search, mode: 'insensitive' } },
              { terms: { contains: search, mode: 'insensitive' } },
              { id: { equals: search } },
              { customers: { company_name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: {
      customers: { select: { company_name: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  return {
    items: items.map((item) => ({
      id: item.id,
      quote_number: item.quote_number,
      customer_id: item.customer_id,
      lead_id: item.lead_id,
      deal_id: item.deal_id,
      created_by_user_id: item.created_by_user_id,
      status: item.status,
      currency: item.currency,
      subtotal: Number(item.subtotal ?? 0),
      tax_amount: Number(item.tax_amount ?? 0),
      discount_amount: Number(item.discount_amount ?? 0),
      total_amount: Number(item.total_amount ?? 0),
      valid_until: item.valid_until?.toISOString() ?? null,
      terms: item.terms ?? null,
      notes: item.notes ?? null,
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
      customer_company_name: item.customers?.company_name ?? null,
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.search;
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/quotes${query}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!response.ok && response.status >= 500) {
      const fallbackPayload = await getQuotesFromStorefrontDb(request);
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
      const fallbackPayload = await getQuotesFromStorefrontDb(request);
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
          message: `Quote API upstream unavailable and fallback failed. Upstream: ${message}. Fallback: ${fallbackMessage}.`,
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
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/quotes`, {
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
