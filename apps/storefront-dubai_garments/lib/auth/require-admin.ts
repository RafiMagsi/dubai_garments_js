import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSessionFromCookie, SESSION_COOKIE } from '@/lib/auth/http';
import { SessionPayload } from '@/lib/auth/session';
import { canAccessAdminApiPath, canAccessAdminArea } from '@/lib/auth/permissions';

async function readSessionFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return getSessionFromCookie(token);
}

export async function requireBackofficeSession(): Promise<SessionPayload | NextResponse> {
  const session = await readSessionFromCookie();

  if (!session || !canAccessAdminArea(session.role)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  return session;
}

export async function requireAdminSession(): Promise<SessionPayload | NextResponse> {
  const session = await readSessionFromCookie();

  if (!session || session.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  return session;
}

export async function requireAdminApiAccess(request: Request): Promise<SessionPayload | NextResponse> {
  const sessionOrResponse = await requireBackofficeSession();
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  const pathname = new URL(request.url).pathname;
  if (!canAccessAdminApiPath(sessionOrResponse.role, pathname)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  return sessionOrResponse;
}
