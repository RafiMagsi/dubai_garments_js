import { fastApiFetch } from '@/lib/tenant/fastapi-proxy';
import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  'http://localhost:8000';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ quoteId: string }> }
) {
  try {
    const { quoteId } = await context.params;
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/quotes/${quoteId}/pdf/download`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      return NextResponse.json(payload, { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    const disposition = response.headers.get('content-disposition') || 'inline; filename="quote.pdf"';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to connect to FastAPI backend.';
    return NextResponse.json({ message }, { status: 502 });
  }
}
