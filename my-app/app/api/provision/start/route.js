import { NextResponse } from 'next/server';
import { startMissionProvision } from '@/lib/provisionMission';

export async function POST(req) {
  try {
    const { missionId, soldiers, commanders } = await req.json();
    if (!missionId || !Array.isArray(soldiers) || !Array.isArray(commanders)) {
      return NextResponse.json({ error: 'Bad payload' }, { status: 400 });
    }

    /* fire-and-forget: start server, respond 202 immediately */
    startMissionProvision({ missionId, soldiers, commanders })
      .catch((err) => console.error('Provision error:', err));

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal' }, { status: 500 });
  }
}
