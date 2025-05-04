import { NextResponse } from 'next/server';
import { splitSecret } from '@/services/shamir';

export async function POST(request) {
  const { secretBase64, n, k } = await request.json();
  if (!secretBase64 || !n || !k) {
    return NextResponse.json({ error: 'secretBase64, n, and k are required' }, { status: 400 });
  }

  const secretBytes = Uint8Array.from(atob(secretBase64), c => c.charCodeAt(0));
  const shares = splitSecret(secretBytes, n, k);
  return NextResponse.json({ shares });
}
