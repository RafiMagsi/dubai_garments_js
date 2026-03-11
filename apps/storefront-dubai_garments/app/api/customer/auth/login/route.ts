import { NextRequest, NextResponse } from 'next/server';
import { buildLoginResponse } from '@/lib/auth/http';
import { findUserByCredentials } from '@/lib/auth/users';
import { resolveTenantContext } from '@/lib/tenant/fastapi-proxy';

export async function POST(request: NextRequest) {
  const tenant = await resolveTenantContext(request);
  const body = await request.json().catch(() => null);
  const email = String(body?.email || '').trim();
  const password = String(body?.password || '');

  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password are required.' }, { status: 422 });
  }

  const user = await findUserByCredentials('customer', email, password, tenant.tenantSlug);
  if (!user) {
    return NextResponse.json({ message: 'Invalid customer credentials.' }, { status: 401 });
  }

  return buildLoginResponse({
    userId: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
  });
}
