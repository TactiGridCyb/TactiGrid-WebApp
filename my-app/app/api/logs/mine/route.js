// app/api/logs/mine/route.js
import { NextResponse } from 'next/server';
import { requireUser }  from '@/lib/whoisme';
import dbConnect        from '@/lib/mongoose';
import Log              from '@/models/Logs';

export async function GET() {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error:'not‑signed‑in' }, { status:401 });

  await dbConnect();
  const rows = await Log.find({ userId: me._id })
                        .select({
                          _id: 1,
                          sessionId: 1,
                          operation: 1,
                          missionId: 1,
                          StartTime: 1,
                          EndTime: 1,
                          Duration: 1,
                          GMK: 1,
                          Soldiers: 1,
                          Location: 1,
                          LogFiles: 1,
                          ConfigID: 1
                        })
                        .sort({ StartTime: -1 })
                        .lean();

  return NextResponse.json(rows);                // array of summary docs
}
