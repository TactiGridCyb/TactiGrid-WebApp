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

const publicPagePaths = ['/login'];
const authApiPrefix = '/api/auth/';

export const config = {
  matcher: [
    '/',
    '/old-missions',
    '/create-mission',
    '/dashboard',
    '/config',
    '/login',
    '/api/:path*',
  ],
};

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow static assets, public pages, and auth endpoints
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    publicPagePaths.includes(pathname) ||
    pathname.startsWith(authApiPrefix)
  ) {
    return NextResponse.next();
  }

  // Determine if the route is protected
  const isProtectedPage = protectedPagePaths.includes(pathname);
  const isApiRoute = pathname.startsWith('/api/');

  if (!isProtectedPage && !isApiRoute) {
    return NextResponse.next();
  }

  // Check for token
  const token = request.cookies.get('authToken')?.value;
  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  
  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    return NextResponse.next();
  } catch {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
}
