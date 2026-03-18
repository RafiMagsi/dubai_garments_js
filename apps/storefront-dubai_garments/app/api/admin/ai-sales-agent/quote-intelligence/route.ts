import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function response() {
  return NextResponse.json(
    {
      ok: false,
      message:
        'Deprecated endpoint. Use /api/admin/ai-sales-agent/quote-copilot for quote intelligence checks.',
    },
    { status: 410 },
  );
}

export async function GET(_request: NextRequest) {
  return response();
}

export async function POST(_request: NextRequest) {
  return response();
}
