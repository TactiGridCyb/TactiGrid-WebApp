// app/api/logs/[sessionId]/positions/route.js
import { NextResponse } from 'next/server';
import dbConnect        from '@/lib/mongoose';
import Log              from '@/models/Logs';
import { requireUser }  from '@/lib/whoisme';

/**
 * GET /api/logs/:sessionId/positions
 * Returns the *entire* log object (everything that lives inside `log` on
 * wrapped docs, or the root on legacy docs) for the signed-in user.
 */
export async function GET(req, { params }) {
  const me = await requireUser();
  if (!me) {
    return NextResponse.json({ error: 'not-signed-in' }, { status: 401 });
  }

  // Next.js linter: await params before using its properties
  const { sessionId } = await params;

  await dbConnect();

  const pipeline = [
    {
      $match: {
        $or: [
          { userId: me._id,            sessionId },                  // legacy flat doc
          { 'log.userId': me._id, 'log.sessionId': sessionId }       // wrapped doc
        ]
      }
    },
    {
      $addFields: {
        normalized: {
          $cond: [{ $ifNull: ['$log', false] }, '$log', '$$ROOT']    // unwrap if needed
        }
      }
    },
    { $replaceRoot: { newRoot: '$normalized' } },                    // outer wrapper gone
    { $limit: 1 }                                                    // just one document
  ];

  const [doc] = await Log.aggregate(pipeline);

  if (!doc) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  return NextResponse.json(doc);                                      // full log object
}
