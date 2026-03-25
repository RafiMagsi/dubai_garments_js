import { getSessionFromCookie, SESSION_COOKIE } from '@/lib/auth/http';
import { canAccessAdminApiPath, canAccessAdminArea } from '@/lib/auth/permissions';

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_RETRY_COUNT = 1;
const RETRYABLE_STATUS = new Set([502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

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

function getFastApiTimeoutMs(): number {
  const raw = process.env.FASTAPI_PROXY_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.floor(parsed);
}

function getFastApiRetryCount(): number {
  const raw = process.env.FASTAPI_PROXY_RETRY_COUNT;
  const parsed = raw ? Number(raw) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_RETRY_COUNT;
  return Math.min(Math.floor(parsed), 3);
}

function shouldRetry(method: string, status?: number, error?: unknown) {
  if (!IDEMPOTENT_METHODS.has(method.toUpperCase())) return false;
  if (typeof status === 'number') return RETRYABLE_STATUS.has(status);
  if (error instanceof Error) {
    return (
      error.name === 'AbortError' ||
      /fetch failed/i.test(error.message) ||
      /network/i.test(error.message) ||
      /timed out/i.test(error.message)
    );
  }
  return false;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const method = (init?.method || request.method || 'GET').toUpperCase();
  const timeoutMs = getFastApiTimeoutMs();
  const retryCount = getFastApiRetryCount();
  const headers = new Headers(init?.headers || {});

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort(new Error(`FastAPI proxy timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        method,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutHandle);

      if (attempt < retryCount && shouldRetry(method, response.status)) {
        await sleep(150 * (attempt + 1));
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutHandle);

      if (attempt < retryCount && shouldRetry(method, undefined, error)) {
        await sleep(150 * (attempt + 1));
        continue;
      }

      throw error;
    }
  }

  return fetch(input, {
    ...init,
    method,
    headers,
  });
}
