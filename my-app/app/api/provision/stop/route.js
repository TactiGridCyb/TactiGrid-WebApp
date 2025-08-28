// app/api/provision/stop/route.js
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { stopMissionProvision } from '@/lib/provisionMission';

export async function POST(req) {
  try {
    const { missionId } = await req.json();
    if (!missionId) return NextResponse.json({ error: 'missionId required' }, { status: 400 });
    const out = await stopMissionProvision(missionId);
    return NextResponse.json(out, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Internal' }, { status: 500 });
  }
}
