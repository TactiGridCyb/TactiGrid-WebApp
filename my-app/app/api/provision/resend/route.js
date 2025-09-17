export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { queueResend } from '@/lib/provisionMission';

export async function POST(req) {
  try {
    const { missionId, subjectId } = await req.json();
    if (!missionId || !subjectId)
      return NextResponse.json({ error: 'missionId and subjectId required' }, { status: 400 });

    const out = queueResend({ missionId, subjectId });
    return NextResponse.json(out, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Internal' }, { status: 500 });
  }
}
