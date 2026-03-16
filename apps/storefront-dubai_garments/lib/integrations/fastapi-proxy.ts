import { getSessionFromCookie, SESSION_COOKIE } from '@/lib/auth/http';
import { canAccessAdminApiPath, canAccessAdminArea } from '@/lib/auth/permissions';

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

  const headers = new Headers(init?.headers || {});
  return fetch(input, {
    ...init,
    headers,
  });
}
