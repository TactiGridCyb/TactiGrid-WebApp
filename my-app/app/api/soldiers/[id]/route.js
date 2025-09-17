import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Soldier   from '@/models/Soldier';

export async function GET(req, { params }) {
  await dbConnect();
  const ParamStore = await params;
  const soldier = await Soldier.findById(ParamStore.id, { fullName: 1 }).lean();
  if (!soldier)
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  return NextResponse.json(soldier);
}
