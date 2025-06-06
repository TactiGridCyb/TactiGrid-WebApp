import { NextResponse } from 'next/server';
import dbConnect        from '@/lib/mongoose';   // the helper you use elsewhere
import Mission          from '@/models/MissionModel';  // your Mongoose model
import mongoose         from 'mongoose';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    
    const paramsStore =await params;
    /* validate id format first */

    console.log(paramsStore.id);
    if (!mongoose.Types.ObjectId.isValid(paramsStore.id)) {
      return NextResponse.json({ error: 'Bad mission id' }, { status: 400 });
    }

    const doc = await Mission.findById(paramsStore.id).lean();
    if (!doc) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    return NextResponse.json(doc, { status: 200 });
  } catch (err) {
    console.error('GET /api/missions/[id] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
