import { NextRequest, NextResponse } from 'next/server';
import { completeInstallation, getInstallStatus, InstallSettingsPayload } from '@/lib/install/install-service';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('x-install-token') || null;
    const status = await getInstallStatus({ token });
    if (status.installed) {
      return NextResponse.json(
        {
          ok: false,
          message: 'System is already installed.',
        },
        { status: 409 }
      );
    }

    const payload = (await request.json()) as InstallSettingsPayload;
    const result = await completeInstallation(payload, token);

    return NextResponse.json({
      ok: true,
      message: 'System ready.',
      tenant: result.tenant,
      completedAt: result.completedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Installation failed.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
