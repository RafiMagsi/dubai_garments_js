import { NextRequest, NextResponse } from 'next/server';
import { getInstallStatus } from '@/lib/install/install-service';

export async function GET(request: NextRequest) {
  try {
    const token =
      request.headers.get('x-install-token') ||
      request.nextUrl.searchParams.get('token') ||
      null;
    const status = await getInstallStatus({ token });
    return NextResponse.json({
      ok: true,
      ...status,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check install status.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
