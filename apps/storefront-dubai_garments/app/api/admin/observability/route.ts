import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/require-admin';
import { getRuntimeSetting } from '@/lib/config/runtime-settings';

export const runtime = 'nodejs';

type TargetKey = 'fastapi_metrics' | 'storefront_metrics' | 'ai_health';

function resolveTargets(origin: string, fastApiBaseUrl: string, aiServiceUrl: string) {
  return {
    fastapi_metrics: `${fastApiBaseUrl.replace(/\/$/, '')}/metrics`,
    storefront_metrics: `${origin.replace(/\/$/, '')}/api/metrics`,
    ai_health: `${aiServiceUrl.replace(/\/$/, '')}/health`,
  } as const;
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  const fastApiBaseUrl = await getRuntimeSetting({
    key: 'FASTAPI_BASE_URL',
    scope: 'storefront',
    defaultValue: process.env.FASTAPI_BASE_URL || 'http://localhost:8000',
  });
  const aiServiceUrl = await getRuntimeSetting({
    key: 'AI_SERVICE_URL',
    scope: 'storefront',
    defaultValue: process.env.AI_SERVICE_URL || 'http://localhost:8100',
  });
  const targets = resolveTargets(request.nextUrl.origin, fastApiBaseUrl, aiServiceUrl);

  const target = (request.nextUrl.searchParams.get('target') || '').trim() as TargetKey;
  if (!target || !(target in targets)) {
    return NextResponse.json(
      {
        items: [
          { key: 'fastapi_metrics', label: 'FastAPI Metrics', url: targets.fastapi_metrics },
          { key: 'storefront_metrics', label: 'Storefront Metrics', url: targets.storefront_metrics },
          { key: 'ai_health', label: 'AI Service Health', url: targets.ai_health },
        ],
      },
      { status: 200 }
    );
  }

  const url = targets[target];
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
    const body = await response.text();
    return NextResponse.json(
      {
        ok: response.ok,
        target,
        url,
        status: response.status,
        durationMs: Date.now() - startedAt,
        preview: body.slice(0, 4000),
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch observability endpoint.';
    return NextResponse.json(
      {
        ok: false,
        target,
        url,
        status: 502,
        durationMs: Date.now() - startedAt,
        preview: message,
      },
      { status: 200 }
    );
  }
}
