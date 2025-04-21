import { NextResponse } from 'next/server';

export function POST() {
  // Kill the cookie by setting maxAge 0
  const res = NextResponse.json({ success: true });
  res.cookies.set('authToken', '', { maxAge: 0, path: '/' });
  return res;
}
