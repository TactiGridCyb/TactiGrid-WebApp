import { NextResponse }  from 'next/server';
import { requireUser }   from '@/lib/whoisme';
import dbConnect         from '@/lib/mongoose';
import TelemetryTrack    from '@/models/Logs';
import { buildFakeLog }  from '../fake/buildFakeLog';

export async function POST() {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error:'not-signed-in' }, { status:401 });

  await dbConnect();
  console.log('model collection:', TelemetryTrack.collection.collectionName);
  const doc = await TelemetryTrack.create({
    ...buildFakeLog(),
    userId: me._id                     // bind to current user
  });


  return NextResponse.json(
    { ok:true, id:doc._id.toString(), rows: doc.data.length },
    { status:201 }
  );
}
