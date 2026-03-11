import { fastApiFetch } from '@/lib/tenant/fastapi-proxy';
import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  'http://localhost:8000';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ quoteId: string }> }
) {
  try {
    const { quoteId } = await context.params;
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/quotes/${quoteId}/generate-pdf`, {
      method: 'POST',
      cache: 'no-store',
    });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to connect to FastAPI backend.';
    return NextResponse.json({ message }, { status: 502 });
  }
}
