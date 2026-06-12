import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token');
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register');
  const isAppRoute = request.nextUrl.pathname.startsWith('/dashboard') || 
                     request.nextUrl.pathname.startsWith('/groups') ||
                     request.nextUrl.pathname.startsWith('/import') ||
                     request.nextUrl.pathname.startsWith('/expenses');

  if (isAppRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Allow the request to continue
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
};
