import { fastApiFetch } from '@/lib/integrations/fastapi-proxy';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  'http://localhost:8000';

async function getLeadsFromStorefrontDb(request: NextRequest) {
  const search = String(request.nextUrl.searchParams.get('search') || '').trim();
  const status = String(request.nextUrl.searchParams.get('status') || '').trim().toLowerCase();
  const hasStatus = ['new', 'qualified', 'quoted', 'won', 'lost'].includes(status);

  const items = await prisma.leads.findMany({
    where: {
      ...(hasStatus ? { status } : {}),
      ...(search
        ? {
            OR: [
              { contact_name: { contains: search, mode: 'insensitive' } },
              { company_name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { id: { equals: search } },
            ],
          }
        : {}),
    },
    orderBy: { created_at: 'desc' },
  });

  return { items };
}

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.search;
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/leads${query}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!response.ok && response.status >= 500) {
      const fallbackPayload = await getLeadsFromStorefrontDb(request);
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
      const fallbackPayload = await getLeadsFromStorefrontDb(request);
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
          message: `Lead API upstream unavailable and fallback failed. Upstream: ${message}. Fallback: ${fallbackMessage}.`,
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
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/leads`, {
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
