import { NextResponse } from 'next/server';

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  'http://localhost:8000';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const upstreamResponse = await fetch(`${FASTAPI_BASE_URL}/api/v1/quote-requests`, {
      method: 'POST',
      body: formData,
    });

    const contentType = upstreamResponse.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      const payload = await upstreamResponse.json();
      return NextResponse.json(payload, { status: upstreamResponse.status });
    }

    const text = await upstreamResponse.text();
    return NextResponse.json(
      { message: text || 'Upstream API returned a non-JSON response.' },
      { status: upstreamResponse.status }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to connect to FastAPI backend.';
    return NextResponse.json({ message }, { status: 502 });
  }
}
