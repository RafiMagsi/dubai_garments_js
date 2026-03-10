import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSessionFromCookie, SESSION_COOKIE } from '@/lib/auth/http';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = await getSessionFromCookie(token);

  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.sub,
      email: session.email,
      displayName: session.displayName,
      role: session.role,
    },
  });
}
