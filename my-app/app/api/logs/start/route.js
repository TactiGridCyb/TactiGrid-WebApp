export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { startLogHttpServer } from '@/lib/logServer';

export async function POST(req) {
  try {
    const { host, port } = await req.json().catch(() => ({}));
    const out = await startLogHttpServer({ host, port });
    return NextResponse.json(out, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Internal' }, { status: 500 });
  }
}
