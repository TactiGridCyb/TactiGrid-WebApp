export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { stopLogHttpServer } from '@/lib/logServer';

export async function POST() {
  try {
    const out = await stopLogHttpServer();
    return NextResponse.json(out, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Internal' }, { status: 500 });
  }
}
