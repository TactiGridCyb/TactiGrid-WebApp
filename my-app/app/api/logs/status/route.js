export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Log from '@/models/LogsModel';
import Mission from '@/models/MissionModel';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const missionId = searchParams.get('missionId');
    if (!missionId) return NextResponse.json({ error: 'missionId required' }, { status: 400 });

    await dbConnect();

    const mission = await Mission.findById(missionId).lean();
    if (!mission) return NextResponse.json({ error: 'mission not found' }, { status: 404 });

    const lastLog = await Log.findOne({ Mission: missionId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      ok: true,
      isFinished: !!mission.IsFinished,
      logId: lastLog?._id ? String(lastLog._id) : null,
      items: Array.isArray(lastLog?.Data) ? lastLog.Data.length : 0,
      receivedAt: lastLog?.createdAt || null,
    }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Internal' }, { status: 500 });
  }
}
