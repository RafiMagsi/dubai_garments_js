import { fastApiFetch } from '@/lib/integrations/fastapi-proxy';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  'http://localhost:8000';

async function getActivitiesFromStorefrontDb(request: NextRequest) {
  const activityType = String(request.nextUrl.searchParams.get('activity_type') || '').trim().toLowerCase();
  const hasType = Boolean(activityType) && activityType !== 'all';
  const leadId = String(request.nextUrl.searchParams.get('lead_id') || '').trim();
  const dealId = String(request.nextUrl.searchParams.get('deal_id') || '').trim();
  const quoteId = String(request.nextUrl.searchParams.get('quote_id') || '').trim();
  const limit = Math.min(200, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || '100')));
  const where = {
    ...(hasType ? { activity_type: activityType } : {}),
    ...(leadId ? { lead_id: leadId } : {}),
    ...(dealId ? { deal_id: dealId } : {}),
    ...(quoteId ? { quote_id: quoteId } : {}),
  };

  const items = await prisma.activities.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: { created_at: 'desc' },
    take: limit,
  });

  return {
    items: items.map((item) => ({
      id: item.id,
      user_id: item.user_id,
      customer_id: item.customer_id,
      lead_id: item.lead_id,
      deal_id: item.deal_id,
      quote_id: item.quote_id,
      activity_type: item.activity_type,
      title: item.title,
      details: item.details,
      metadata: item.metadata,
      occurred_at: item.occurred_at.toISOString(),
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.search;
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/activities${query}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!response.ok && response.status >= 500) {
      const fallbackPayload = await getActivitiesFromStorefrontDb(request);
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
      const fallbackPayload = await getActivitiesFromStorefrontDb(request);
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
          message: `Activity API upstream unavailable and fallback failed. Upstream: ${message}. Fallback: ${fallbackMessage}.`,
          fastApiBaseUrl: FASTAPI_BASE_URL,
        },
        { status: 503 }
      );
    }
  }
}
