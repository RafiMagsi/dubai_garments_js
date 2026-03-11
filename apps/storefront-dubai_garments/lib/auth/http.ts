import { NextResponse } from 'next/server';
import { AppRole, createSessionToken, verifySessionToken } from '@/lib/auth/session';

export const SESSION_COOKIE = 'dg_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export async function buildLoginResponse(input: {
  userId: string;
  email: string;
  role: AppRole;
  displayName: string;
  tenantSlug: string;
  tenantId?: string;
}) {
  const token = await createSessionToken(
    {
      sub: input.userId,
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      tenantSlug: input.tenantSlug,
      tenantId: input.tenantId,
    },
    SESSION_MAX_AGE_SECONDS
  );

  const response = NextResponse.json({
    ok: true,
    role: input.role,
    displayName: input.displayName,
    tenantSlug: input.tenantSlug,
  });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export function buildLogoutResponse() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function getSessionFromCookie(cookieValue: string | undefined) {
  if (!cookieValue) {
    return null;
  }
  return verifySessionToken(cookieValue);
}
