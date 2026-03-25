import { fastApiFetch } from '@/lib/integrations/fastapi-proxy';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  'http://localhost:8000';

async function getAutomationRunDetailFromStorefrontDb(runId: string) {
  const item = await prisma.automation_runs.findUnique({ where: { id: runId } });
  if (!item) {
    return NextResponse.json({ message: 'Automation run not found.' }, { status: 404 });
  }

  return NextResponse.json({
    item: {
      ...item,
      started_at: item.started_at?.toISOString() ?? null,
      finished_at: item.finished_at?.toISOString() ?? null,
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
      retryable: item.status === 'failed',
    },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await context.params;
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/automation-runs/${runId}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!response.ok && response.status >= 500) {
      const fallback = await getAutomationRunDetailFromStorefrontDb(runId);
      fallback.headers.set('x-data-source', 'storefront-prisma-fallback');
      fallback.headers.set('x-upstream-status', String(response.status));
      return fallback;
    }
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    try {
      const { runId } = await context.params;
      const fallback = await getAutomationRunDetailFromStorefrontDb(runId);
      fallback.headers.set('x-data-source', 'storefront-prisma-fallback');
      fallback.headers.set('x-upstream-status', 'fetch_error');
      return fallback;
    } catch (fallbackError) {
      const message = error instanceof Error ? error.message : 'Failed to connect to FastAPI backend.';
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : 'Fallback DB query failed.';
      return NextResponse.json(
        {
          message: `Automation-run detail upstream unavailable and fallback failed. Upstream: ${message}. Fallback: ${fallbackMessage}.`,
          fastApiBaseUrl: FASTAPI_BASE_URL,
        },
        { status: 503 }
      );
    }
  }
}
