export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { startMissionProvision } from '@/lib/provisionMission';

export async function POST(req) {
  try {
    const body = await req.json();
    const { missionId, soldiers = [], commanders = [] } = body;
    if (!missionId || !Array.isArray(soldiers) || !Array.isArray(commanders)) {
      return NextResponse.json({ error: 'Bad payload' }, { status: 400 });
    }

    const out = await startMissionProvision({ missionId, soldiers, commanders });
    // out.message looks like: "TLS provision server listening on :8743"
    return NextResponse.json(out, { status: 200 });
  } catch (err) {
    console.error('[provision] start error:', err);
    return NextResponse.json({ error: String(err?.message || 'Internal') }, { status: 500 });
  }
}
