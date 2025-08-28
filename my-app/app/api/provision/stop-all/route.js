// app/api/provision/stop-all/route.js
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { stopAllProvisionSessions } from '@/lib/provisionMission';

export async function POST() {
  try {
    const out = await stopAllProvisionSessions();
    return NextResponse.json(out, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Internal' }, { status: 500 });
  }
}
