import { fastApiFetch } from '@/lib/tenant/fastapi-proxy';
import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.search;
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/leads${query}`, {
      method: 'GET',
      cache: 'no-store',
    });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to connect to FastAPI backend.';
    return NextResponse.json({ message }, { status: 502 });
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
