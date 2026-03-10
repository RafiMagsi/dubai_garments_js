import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/http';
import { verifySessionToken } from '@/lib/auth/session';

async function getSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSession(request);

  if (pathname.startsWith('/api/admin/')) {
    if (pathname === '/api/admin/auth/login') {
      return NextResponse.next();
    }
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      if (session?.role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      return NextResponse.next();
    }
    if (!session || session.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/customer')) {
    if (pathname === '/customer/login') {
      if (session?.role === 'customer') {
        return NextResponse.redirect(new URL('/customer/dashboard', request.url));
      }
      return NextResponse.next();
    }
    if (!session || session.role !== 'customer') {
      return NextResponse.redirect(new URL('/customer/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/customer/:path*', '/api/admin/:path*'],
};
