// app/api/provision/start/route.js
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { startMissionProvision } from '@/lib/provisionMission';

export async function POST(req) {
  try {
    const body = await req.json();
    const { missionId, soldiers = [], commanders = [], host, port, force = true } = body;
    if (!missionId || !Array.isArray(soldiers) || !Array.isArray(commanders)) {
      return NextResponse.json({ error: 'Bad payload' }, { status: 400 });
    }

    const out = await startMissionProvision({ missionId, soldiers, commanders, host, port, force });
    return NextResponse.json(out, { status: 200 });
  } catch (err) {
    const msg = String(err?.message || 'Internal');
    const status = msg.startsWith('EADDRINUSE') ? 409 : 500;
    console.error('[provision] start error:', err);
    return NextResponse.json({ error: msg }, { status });
  }
}
