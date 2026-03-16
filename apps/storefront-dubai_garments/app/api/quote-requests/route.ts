import { fastApiFetch } from '@/lib/integrations/fastapi-proxy';
import { NextResponse } from 'next/server';
import { logApiEvent } from '@/lib/observability/logger';
import { observeApiRequest } from '@/lib/observability/metrics';

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  'http://localhost:8000';
const AUTOMATION_SHARED_SECRET = process.env.AUTOMATION_SHARED_SECRET || '';

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = request.headers.get('x-request-id') || 'n/a';
  try {
    const formData = await request.formData();

    const upstreamResponse = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/quote-requests`, {
      method: 'POST',
      body: formData,
      headers: {
        'x-request-id': requestId,
      },
    });

    const contentType = upstreamResponse.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      const payload = await upstreamResponse.json();
      observeApiRequest('/api/quote-requests', upstreamResponse.status, Date.now() - startedAt);
      logApiEvent('info', 'storefront_quote_request_proxy', {
        request_id: requestId,
        upstream_status: upstreamResponse.status,
        duration_ms: Date.now() - startedAt,
      });

      if (upstreamResponse.ok && payload?.leadId) {
        if (AUTOMATION_SHARED_SECRET) {
          try {
            await fetch(new URL('/api/internal/ai/triage', request.url), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-request-id': requestId,
                'x-automation-secret': AUTOMATION_SHARED_SECRET,
              },
              body: JSON.stringify({
                leadId: payload.leadId,
                dry_run: false,
              }),
            });
          } catch {
            // Do not fail quote request submission if triage trigger fails.
          }
        } else {
          logApiEvent('warn', 'storefront_quote_request_triage_skipped', {
            request_id: requestId,
            reason: 'AUTOMATION_SHARED_SECRET not configured',
          });
        }
      }
      return NextResponse.json(payload, { status: upstreamResponse.status });
    }

    const text = await upstreamResponse.text();
    observeApiRequest('/api/quote-requests', upstreamResponse.status, Date.now() - startedAt);
    return NextResponse.json(
      { message: text || 'Upstream API returned a non-JSON response.' },
      { status: upstreamResponse.status }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to connect to FastAPI backend.';
    observeApiRequest('/api/quote-requests', 502, Date.now() - startedAt);
    logApiEvent('error', 'storefront_quote_request_proxy_failed', {
      request_id: requestId,
      error: message,
      duration_ms: Date.now() - startedAt,
    });
    return NextResponse.json({ message }, { status: 502 });
  }
}
