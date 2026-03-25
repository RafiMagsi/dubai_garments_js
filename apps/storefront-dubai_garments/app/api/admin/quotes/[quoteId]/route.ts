import { fastApiFetch } from '@/lib/integrations/fastapi-proxy';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  'http://localhost:8000';

async function getQuoteDetailFromStorefrontDb(quoteId: string) {
  const quote = await prisma.quotes.findUnique({
    where: { id: quoteId },
    include: {
      customers: { select: { company_name: true } },
    },
  });
  if (!quote) {
    return NextResponse.json({ message: 'Quote not found.' }, { status: 404 });
  }

  const items = await prisma.quote_items.findMany({
    where: { quote_id: quoteId },
    orderBy: { created_at: 'asc' },
  });

  return NextResponse.json({
    item: {
      id: quote.id,
      quote_number: quote.quote_number,
      customer_id: quote.customer_id,
      lead_id: quote.lead_id,
      deal_id: quote.deal_id,
      created_by_user_id: quote.created_by_user_id,
      status: quote.status,
      currency: quote.currency,
      subtotal: Number(quote.subtotal ?? 0),
      tax_amount: Number(quote.tax_amount ?? 0),
      discount_amount: Number(quote.discount_amount ?? 0),
      total_amount: Number(quote.total_amount ?? 0),
      valid_until: quote.valid_until?.toISOString() ?? null,
      terms: quote.terms ?? null,
      notes: quote.notes ?? null,
      created_at: quote.created_at.toISOString(),
      updated_at: quote.updated_at.toISOString(),
      customer_company_name: quote.customers?.company_name ?? null,
    },
    items: items.map((item) => ({
      ...item,
      unit_price: Number(item.unit_price ?? 0),
      discount_amount: Number(item.discount_amount ?? 0),
      line_total: Number(item.line_total ?? 0),
    })),
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ quoteId: string }> }
) {
  try {
    const { quoteId } = await context.params;
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/quotes/${quoteId}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!response.ok && response.status >= 500) {
      const fallback = await getQuoteDetailFromStorefrontDb(quoteId);
      fallback.headers.set('x-data-source', 'storefront-prisma-fallback');
      fallback.headers.set('x-upstream-status', String(response.status));
      return fallback;
    }
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    try {
      const { quoteId } = await context.params;
      const fallback = await getQuoteDetailFromStorefrontDb(quoteId);
      fallback.headers.set('x-data-source', 'storefront-prisma-fallback');
      fallback.headers.set('x-upstream-status', 'fetch_error');
      return fallback;
    } catch (fallbackError) {
      const message = error instanceof Error ? error.message : 'Failed to connect to FastAPI backend.';
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : 'Fallback DB query failed.';
      return NextResponse.json(
        {
          message: `Quote detail upstream unavailable and fallback failed. Upstream: ${message}. Fallback: ${fallbackMessage}.`,
          fastApiBaseUrl: FASTAPI_BASE_URL,
        },
        { status: 503 }
      );
    }
  }
}
