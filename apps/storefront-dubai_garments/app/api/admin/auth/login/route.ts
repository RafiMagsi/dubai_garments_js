import { NextRequest, NextResponse } from 'next/server';
import { buildLoginResponse } from '@/lib/auth/http';
import { findUserByCredentials } from '@/lib/auth/users';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email || '').trim();
  const password = String(body?.password || '');

  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password are required.' }, { status: 422 });
  }

  const user = await findUserByCredentials('admin', email, password);
  if (!user) {
    return NextResponse.json({ message: 'Invalid admin credentials.' }, { status: 401 });
  }

  return buildLoginResponse({
    userId: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
  });
}
