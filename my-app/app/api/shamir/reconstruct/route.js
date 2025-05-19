import { NextResponse } from 'next/server';
import { reconstructSecret } from '@/services/shamir';

export async function POST(request) {
  const { shares } = await request.json();
  if (!Array.isArray(shares) || shares.length === 0) {
    return NextResponse.json({ error: 'shares array is required' }, { status: 400 });
  }

  const secretBytes = reconstructSecret(shares);
  const secretBase64 = btoa(String.fromCharCode(...secretBytes));
  return NextResponse.json({ secretBase64 });
}
