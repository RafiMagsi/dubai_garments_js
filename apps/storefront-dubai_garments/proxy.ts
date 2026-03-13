import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie, SESSION_COOKIE } from '@/lib/auth/http';

function withRequestId(request: NextRequest, response: NextResponse) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  response.headers.set('x-request-id', requestId);
  return response;
}

function nextWithRequestHeaders(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const requestId = requestHeaders.get('x-request-id') || crypto.randomUUID();
  requestHeaders.set('x-request-id', requestId);
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminLoginApi = pathname === '/api/admin/auth/login';

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (isAdminLoginApi) {
      return withRequestId(request, nextWithRequestHeaders(request));
    }

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = await getSessionFromCookie(token);
    const isAdmin = Boolean(session && session.role === 'admin');

    if (pathname.startsWith('/admin')) {
      if (pathname === '/admin/login') {
        if (isAdmin) {
          const redirectUrl = new URL('/admin/dashboard', request.url);
          return withRequestId(request, NextResponse.redirect(redirectUrl));
        }
        return withRequestId(request, nextWithRequestHeaders(request));
      }

      if (!isAdmin) {
        const redirectUrl = new URL('/admin/login', request.url);
        return withRequestId(request, NextResponse.redirect(redirectUrl));
      }
    }

    if (pathname.startsWith('/api/admin') && !isAdmin) {
      return withRequestId(
        request,
        NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
      );
    }
  }

  return withRequestId(request, nextWithRequestHeaders(request));
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
