import { getSessionFromCookie, SESSION_COOKIE } from '@/lib/auth/http';
import { canAccessAdminApiPath, canAccessAdminArea } from '@/lib/auth/permissions';

export type TenantContext = {
  tenantId?: string;
  tenantSlug: string;
};

const DEFAULT_TENANT_SLUG = String(process.env.DEFAULT_TENANT_SLUG || 'default').trim() || 'default';

function parseCookieValue(cookieHeader: string | null, key: string): string | undefined {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === key) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
}

function normalizeTenantSlug(value: string | null | undefined): string {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || DEFAULT_TENANT_SLUG;
}

export async function resolveTenantContext(request: Request): Promise<TenantContext> {
  const headerTenantId = request.headers.get('x-tenant-id')?.trim() || undefined;
  const headerTenantSlug = normalizeTenantSlug(request.headers.get('x-tenant-slug'));

  if (headerTenantId) {
    return { tenantId: headerTenantId, tenantSlug: headerTenantSlug };
  }

  const sessionToken = parseCookieValue(request.headers.get('cookie'), SESSION_COOKIE);
  const session = await getSessionFromCookie(sessionToken);
  if (session?.tenantId || session?.tenantSlug) {
    return {
      tenantId: session.tenantId || undefined,
      tenantSlug: normalizeTenantSlug(session.tenantSlug),
    };
  }

  return { tenantSlug: headerTenantSlug };
}

export async function buildFastApiTenantHeaders(
  request: Request,
  initialHeaders?: HeadersInit
): Promise<Headers> {
  const headers = new Headers(initialHeaders || {});
  const tenant = await resolveTenantContext(request);
  headers.set('x-tenant-slug', tenant.tenantSlug);
  if (tenant.tenantId) {
    headers.set('x-tenant-id', tenant.tenantId);
  }
  return headers;
}

export async function fastApiFetch(request: Request, input: string, init?: RequestInit) {
  const pathname = new URL(request.url).pathname;
  const isAdminApiPath = pathname.startsWith('/api/admin');
  const isAdminLoginApi = pathname === '/api/admin/auth/login';

  if (isAdminApiPath && !isAdminLoginApi) {
    const sessionToken = parseCookieValue(request.headers.get('cookie'), SESSION_COOKIE);
    const session = await getSessionFromCookie(sessionToken);

    if (!session || !canAccessAdminArea(session.role)) {
      return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!canAccessAdminApiPath(session.role, pathname)) {
      return Response.json({ message: 'Forbidden' }, { status: 403 });
    }
  }

  const headers = await buildFastApiTenantHeaders(request, init?.headers);
  return fetch(input, {
    ...init,
    headers,
  });
}
