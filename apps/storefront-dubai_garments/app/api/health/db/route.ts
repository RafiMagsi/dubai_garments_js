import { NextResponse } from 'next/server';
import { logApiEvent } from '@/lib/observability/logger';
import { observeApiRequest } from '@/lib/observability/metrics';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const startedAt = Date.now();
  const requestId = request.headers.get('x-request-id') || 'n/a';
  try {
    await prisma.$queryRaw`SELECT 1`;
    observeApiRequest('/api/health/db', 200, Date.now() - startedAt);
    logApiEvent('info', 'storefront_db_health_ok', {
      request_id: requestId,
      duration_ms: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        ok: true,
        service: 'database',
        checkedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    observeApiRequest('/api/health/db', 503, Date.now() - startedAt);
    logApiEvent('error', 'storefront_db_health_failed', {
      request_id: requestId,
      error: message,
      duration_ms: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        ok: false,
        service: 'database',
        checkedAt: new Date().toISOString(),
        message,
      },
      { status: 503 }
    );
  }
}
