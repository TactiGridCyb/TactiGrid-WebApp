// app/api/logs/[sessionId]/positions/route.js
import { NextResponse } from 'next/server';
import dbConnect         from '@/lib/mongoose';
import Mission           from '@/models/MissionModel';   // <-- NEW
import Log               from '@/models/LogsModel';
import { requireUser }   from '@/lib/whoisme';

/**
 * GET /api/logs/:missionId/positions
 *
 * - param is a *Mission* _id_
 * - we fetch that mission, confirm it belongs to the signed-in user,
 *   grab its `Log` field, then return the referenced Log document.
 */
export async function GET(_req, { params }) {
  const {missionId} =await params;
  const me = await requireUser();
  if (!me) {
    return NextResponse.json({ error: 'not-signed-in' }, { status: 401 });
  }
  

  const idMission = missionId;           // route still called [sessionId]

  await dbConnect();

  /* -------- fetch the mission first -------- */
  const mission = await Mission.findOne({
    _id:     idMission,
                                
  }).lean();

  if (!mission) {
    return NextResponse.json({ error: 'mission-not-found' }, { status: 404 });
  }

  const logId = mission.Log;                     // <-- adjust if field name differs
  if (!logId) {
    return NextResponse.json({ error: 'log-id-missing' }, { status: 404 });
  }

  /* -------- pull the referenced log -------- */
  const logDoc = await Log.findById(logId).lean();
  if (!logDoc) {
    return NextResponse.json({ error: 'log-not-found' }, { status: 404 });
  }

  
  return NextResponse.json(logDoc);              // full Log object
}
