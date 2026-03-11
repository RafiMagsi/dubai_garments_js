import { NextRequest, NextResponse } from 'next/server';
import { getInstallStatus, validateCurrentDatabaseConnection } from '@/lib/install/install-service';

function isLikelyPgUrl(value: string) {
  return /^postgres(ql)?:\/\//i.test(value.trim());
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('x-install-token') || null;
    const installStatus = await getInstallStatus({ token });
    if (installStatus.installed) {
      return NextResponse.json({ ok: false, message: 'System is already installed.' }, { status: 409 });
    }
    if (!installStatus.accessGranted) {
      return NextResponse.json({ ok: false, message: 'Invalid or missing install token.' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { databaseUrl?: string };
    const databaseUrl = String(body.databaseUrl || '').trim();

    await validateCurrentDatabaseConnection();

    if (databaseUrl && !isLikelyPgUrl(databaseUrl)) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Database URL format looks invalid. Expected postgresql://...',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Database connection is healthy.',
      usesCurrentRuntimeDb: true,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database validation failed.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
