import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Soldier   from '@/models/Soldier';

export async function GET(req, { params }) {
  await dbConnect();
  const soldier = await Soldier.findById(params.id, { fullName: 1 }).lean();
  if (!soldier)
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  return NextResponse.json(soldier);
}
