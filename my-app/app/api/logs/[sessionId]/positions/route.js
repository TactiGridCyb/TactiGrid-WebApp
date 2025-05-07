import { NextResponse } from 'next/server';
import dbConnect        from '@/lib/mongoose';
import Log              from '@/models/Logs';
import { requireUser }  from '@/lib/whoisme';

/**
 * GET /api/logs/:sessionId/positions
 * Returns one log (only fields the player needs) that belongs to
 * the currently signed‑in user.
 */
export async function GET(req, { params }) {
  const me = await requireUser();               // reads authToken cookie
  if (!me) {
    return NextResponse.json({ error: 'not‑signed‑in' }, { status: 401 });
  }

  await dbConnect();
  const paramsStore = await params;
  const doc = await Log.findOne(
    { userId: me._id, sessionId: paramsStore.sessionId },
    // select only what the player needs
    {
      _id: 0,
      StartTime: 1,
      EndTime: 1,
      intervalMs: 1,
      data: 1
    }
  ).lean();

  if (!doc) {
    return NextResponse.json({ error: 'not‑found' }, { status: 404 });
  }

  return NextResponse.json(doc);                // few KB of JSON
}
