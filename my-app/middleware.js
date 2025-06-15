// my-app/middleware.js

import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const protectedPagePaths = [
  '/',
  '/old-missions',
  '/create-mission',
  '/dashboard',
  '/config',
];

// Pages that are public
const publicPagePaths = ['/login'];

// API routes under /api/auth/* are public (login/logout/me)
const authApiPrefix = '/api/auth/';

export const config = {
  matcher: [
    // page routes
    '/',
    '/old-missions',
    '/create-mission',
    '/dashboard',
    '/config',
    '/login',
    // all other API routes
    '/api/:path*',
  ],
};

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1) Allow static assets, public pages, and auth endpoints
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    publicPagePaths.includes(pathname) ||
    pathname.startsWith(authApiPrefix)
  ) {
    return NextResponse.next();
  }

  // 2) Decide if we need to protect this request
  const isProtectedPage = protectedPagePaths.includes(pathname);
  const isApiRoute = pathname.startsWith('/api/');

  if (!isProtectedPage && !isApiRoute) {
    // not a protected page or API → allow
    return NextResponse.next();
  }

  // 3) Check for the authToken cookie
  const token = request.cookies.get('authToken')?.value;
  if (!token) {
    // no token → block
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 4) Verify the JWT
  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    return NextResponse.next();
  } catch {
    // bad or expired token
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
}
