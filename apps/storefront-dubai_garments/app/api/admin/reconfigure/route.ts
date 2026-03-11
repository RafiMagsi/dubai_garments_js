import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/require-admin';
import {
  enableReconfigureMode,
  getReconfigureModeStatus,
  InstallSettingsPayload,
  reconfigureInstalledSystem,
} from '@/lib/install/install-service';

export async function GET() {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }
  const session = sessionOrResponse;
  if (!session.tenantId) {
    return NextResponse.json({ ok: false, message: 'Tenant context missing.' }, { status: 422 });
  }

  try {
    const status = await getReconfigureModeStatus(session.tenantId);
    return NextResponse.json({ ok: true, ...status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load reconfigure status.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireAdminSession();
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }
  const session = sessionOrResponse;
  if (!session.tenantId) {
    return NextResponse.json({ ok: false, message: 'Tenant context missing.' }, { status: 422 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as
      | { action?: 'enable' | 'disable'; ttlMinutes?: number }
      | { action?: 'apply'; payload?: InstallSettingsPayload };

    if (body.action === 'enable' || body.action === 'disable') {
      const enabled = body.action === 'enable';
      const result = await enableReconfigureMode({
        tenantId: session.tenantId,
        actorUserId: session.sub,
        enabled,
        ttlMinutes: body.ttlMinutes,
      });
      return NextResponse.json({
        ok: true,
        message: enabled ? 'Reconfigure mode enabled.' : 'Reconfigure mode disabled.',
        ...result,
      });
    }

    if (body.action === 'apply') {
      if (!body.payload) {
        return NextResponse.json({ ok: false, message: 'Payload is required.' }, { status: 422 });
      }
      const result = await reconfigureInstalledSystem({
        tenantId: session.tenantId,
        actorUserId: session.sub,
        payload: body.payload,
      });
      return NextResponse.json({
        ok: true,
        message: 'Settings reconfigured successfully.',
        ...result,
      });
    }

    return NextResponse.json({ ok: false, message: 'Unsupported action.' }, { status: 422 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reconfigure action failed.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
