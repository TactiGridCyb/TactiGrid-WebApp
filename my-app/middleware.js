import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const protectedPaths = [
  '/',
  '/old-missions',
  '/create-mission',
  '/dashboard',
  '/config' 
];

// Allow login and other public paths
const publicPaths = ['/login'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow static files and public paths
  if (
    publicPaths.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api') // Allow API routes
  ) {
    return NextResponse.next();
  }

  // Block protected paths
  if (protectedPaths.includes(pathname)) {
    const token = request.cookies.get('authToken')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
      return NextResponse.next();
    } catch (err) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}
