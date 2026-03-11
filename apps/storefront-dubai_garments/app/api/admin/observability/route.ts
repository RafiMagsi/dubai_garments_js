import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/require-admin';
import { getRuntimeSetting } from '@/lib/config/runtime-settings';

export const runtime = 'nodejs';

type TargetKey =
  | 'fastapi_metrics'
  | 'storefront_metrics'
  | 'ai_health'
  | 'fastapi_health'
  | 'storefront_health';

async function getServiceConfig(origin: string) {
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
  const observabilityServiceUrl = await getRuntimeSetting({
    key: 'OBSERVABILITY_SERVICE_URL',
    scope: 'storefront',
    defaultValue: process.env.OBSERVABILITY_SERVICE_URL || 'http://localhost:8200',
  });
  const observabilityServiceToken = await getRuntimeSetting({
    key: 'OBSERVABILITY_SERVICE_TOKEN',
    scope: 'storefront',
    defaultValue: process.env.OBSERVABILITY_SERVICE_TOKEN || '',
  });

  const targets: Record<TargetKey, { label: string; url: string }> = {
    fastapi_metrics: {
      label: 'FastAPI Metrics',
      url: `${fastApiBaseUrl.replace(/\/$/, '')}/metrics`,
    },
    storefront_metrics: {
      label: 'Storefront Metrics',
      url: `${origin.replace(/\/$/, '')}/api/metrics`,
    },
    ai_health: {
      label: 'AI Service Health',
      url: `${aiServiceUrl.replace(/\/$/, '')}/health`,
    },
    fastapi_health: {
      label: 'FastAPI Health',
      url: `${fastApiBaseUrl.replace(/\/$/, '')}/health`,
    },
    storefront_health: {
      label: 'Storefront DB Health',
      url: `${origin.replace(/\/$/, '')}/api/health/db`,
    },
  };

  return {
    observabilityServiceUrl: observabilityServiceUrl.replace(/\/$/, ''),
    observabilityServiceToken: observabilityServiceToken.trim(),
    targets,
  };
}

async function proxyObservabilityGet(url: string, token: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['X-Observability-Token'] = token;
  }
  const response = await fetch(url, { method: 'GET', cache: 'no-store', headers });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  const requestedMode = (request.nextUrl.searchParams.get('mode') || '').trim();
  const target = (request.nextUrl.searchParams.get('target') || '').trim() as TargetKey;
  const mode = requestedMode || (target ? 'scrape' : 'targets');

  const { observabilityServiceUrl, observabilityServiceToken, targets } = await getServiceConfig(
    request.nextUrl.origin
  );

  if (mode === 'targets') {
    return NextResponse.json({
      items: Object.entries(targets).map(([key, value]) => ({
        key,
        label: value.label,
        url: value.url,
      })),
    });
  }

  if (mode === 'checks') {
    try {
      const { response, payload } = await proxyObservabilityGet(
        `${observabilityServiceUrl}/api/v1/checks`,
        observabilityServiceToken
      );
      return NextResponse.json(payload, { status: response.ok ? 200 : response.status });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load observability checks.';
      return NextResponse.json({ message }, { status: 502 });
    }
  }

  if (mode === 'scrape') {
    if (!target || !(target in targets)) {
      return NextResponse.json({ message: 'Invalid target.' }, { status: 422 });
    }
    try {
      const { response, payload } = await proxyObservabilityGet(
        `${observabilityServiceUrl}/api/v1/scrape?target=${encodeURIComponent(target)}`,
        observabilityServiceToken
      );
      return NextResponse.json(payload, { status: response.ok ? 200 : response.status });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to scrape observability target.';
      return NextResponse.json({ message }, { status: 502 });
    }
  }

  return NextResponse.json({ message: `Unsupported mode: ${mode}` }, { status: 400 });
}
