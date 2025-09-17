import { NextResponse } from 'next/server';

export function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('authToken', '', { maxAge: 0, path: '/' });
  return res;
}
