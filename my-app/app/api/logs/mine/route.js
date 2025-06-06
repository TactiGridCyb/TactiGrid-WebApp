// app/api/logs/mine/route.js
import { NextResponse } from 'next/server';
import { requireUser }  from '@/lib/whoisme';
import dbConnect        from '@/lib/mongoose';
import Log              from '@/models/Logs';

export async function GET() {
  const me = await requireUser();
  if (!me) {
    return NextResponse.json({ error: 'not-signed-in' }, { status: 401 });
  }

  await dbConnect();

  /*  One pipeline that collects both shapes:
        – legacy rows  → already flat
        – wrapped rows → unwrapped so only `log` contents remain
  */
  const rows = await Log.aggregate([
    // grab documents that belong to the user (outer OR inner userId)
    {
      $match: {
        $or: [
          { userId: me._id },          // legacy documents
          { 'log.userId': me._id }     // wrapped documents
        ]
      }
    },

    // if the document has a `log` field, use it; otherwise keep the root
    {
      $addFields: {
        normalized: {
          $cond: [
            { $ifNull: ['$log', false] },
            '$log',
            '$$ROOT'
          ]
        }
      }
    },

    // make `normalized` the new root
    { $replaceRoot: { newRoot: '$normalized' } },

    // keep only the summary fields your page needs
    {
      $project: {
        _id:        1,
        sessionId:  1,
        operation:  1,
        missionId:  1,
        StartTime:  1,
        EndTime:    1,
        Duration:   1,
        GMK:        1,
        Soldiers:   1,  
        Location:   1,
        LogFiles:   1,
        ConfigID:   1
      }
    },

    // newest first – works for either shape
    { $sort: { StartTime: -1 } }
  ]);

  return NextResponse.json(rows);      // array of unified summary docs
}
