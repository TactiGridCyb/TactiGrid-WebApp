import { NextResponse }    from 'next/server';
import { uploadsAllowed }  from '@/lib/uploadGate';
import Log                 from '@/models/LogsModel';

export const GET = async (_req, { params }) => {

  const Store = await params;
  const done   = await Log.exists({ missionId: Store.id });
  const armed  = uploadsAllowed();       // read-only, no side-effects

  return NextResponse.json({ done, armed });   // always 200
};

