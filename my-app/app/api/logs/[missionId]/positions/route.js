// app/api/logs/[sessionId]/positions/route.js
import { NextResponse } from 'next/server';
import dbConnect   from '@/lib/mongoose';
import Mission     from '@/models/MissionModel';
import Log         from '@/models/LogsModel';
import { requireUser } from '@/lib/whoisme';

/**
 * GET /api/logs/:missionId/positions
 *
 * Responds with:
 * {
 *   mission: { ...Mission doc... },
 *   log:     { ...Log doc... }
 * }
 */
export async function GET(_req, { params }) {
  const { missionId } = await params;              // ← URL param
  const me = await requireUser();
  if (!me)
    return NextResponse.json({ error: 'not-signed-in' }, { status: 401 });

  await dbConnect();

  /* --- fetch the mission and verify ownership --- */
  const mission = await Mission.findOne(
    { _id: missionId /* , owner: me._id */ }  // add owner check if you track it
  ).lean();

  if (!mission)
    return NextResponse.json({ error: 'mission-not-found' }, { status: 404 });

  /* --- fetch the referenced log --- */
  const log = mission.Log
    ? await Log.findById(mission.Log).lean()
    : null;

  if (!log)
    return NextResponse.json({ error: 'log-not-found' }, { status: 404 });

  /* --- success --- */
  return NextResponse.json({ mission, log });
}
