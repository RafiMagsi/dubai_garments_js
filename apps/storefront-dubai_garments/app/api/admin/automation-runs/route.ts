import { fastApiFetch } from '@/lib/integrations/fastapi-proxy';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  'http://localhost:8000';

async function getAutomationRunsFromStorefrontDb(request: NextRequest) {
  const status = String(request.nextUrl.searchParams.get('status') || '').trim().toLowerCase();
  const limit = Math.min(200, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || '50')));
  const hasStatus = Boolean(status);

  const items = await prisma.automation_runs.findMany({
    where: hasStatus ? { status } : undefined,
    orderBy: { created_at: 'desc' },
    take: limit,
  });

  return {
    items: items.map((item) => ({
      ...item,
      started_at: item.started_at?.toISOString() ?? null,
      finished_at: item.finished_at?.toISOString() ?? null,
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
      retryable: item.status === 'failed',
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.search;
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/automation-runs${query}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!response.ok && response.status >= 500) {
      const fallbackPayload = await getAutomationRunsFromStorefrontDb(request);
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
      const fallbackPayload = await getAutomationRunsFromStorefrontDb(request);
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
          message: `Automation-runs upstream unavailable and fallback failed. Upstream: ${message}. Fallback: ${fallbackMessage}.`,
          fastApiBaseUrl: FASTAPI_BASE_URL,
        },
        { status: 503 }
      );
    }
  }
}
