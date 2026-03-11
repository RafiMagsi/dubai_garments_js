import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSessionFromCookie, SESSION_COOKIE } from '@/lib/auth/http';
import { SessionPayload } from '@/lib/auth/session';

export async function requireAdminSession(): Promise<SessionPayload | NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = await getSessionFromCookie(token);

  if (!session || session.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  return session;
}
