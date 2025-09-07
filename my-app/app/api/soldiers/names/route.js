import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Soldier   from '@/models/Soldier';   

export async function POST(req) {
  const { ids } = await req.json();            

  if (!Array.isArray(ids) || !ids.length)
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });

  await dbConnect();

  
  const soldiers = await Soldier
    .find({ _id: { $in: ids } }, '_id fullName role')   
    .lean();

  const map = Object.fromEntries(
    soldiers.map(({ _id, fullName, role }) => [
      _id.toString(),
      { fullName, role }
    ]),
  );

  

  return NextResponse.json({ map });
}
