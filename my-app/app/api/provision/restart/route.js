export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { restartProvision } from '@/lib/provisionMission';

export async function POST(req) {
  try {
    const { missionId, soldiers = [], commanders = [] } = await req.json();
    if (!missionId) return NextResponse.json({ error: 'missionId required' }, { status: 400 });
    const out = await restartProvision({ missionId, soldiers, commanders });
    return NextResponse.json(out, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Internal' }, { status: 500 });
  }
}
