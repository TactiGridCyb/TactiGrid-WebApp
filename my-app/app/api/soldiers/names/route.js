import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Soldier   from '@/models/Soldier';   // adjust the path if needed

// POST /api/soldiers/names   { ids: ["664fe25d81f7d1e5c1e8d7a1", …] }
export async function POST(req) {
  const { ids } = await req.json();              // array of strings

  if (!Array.isArray(ids) || !ids.length)
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });

  await dbConnect();

  // Grab only what we need
  const soldiers = await Soldier
    .find({ _id: { $in: ids } }, '_id fullName role')   // <— role instead of isCommander
    .lean();

  // { id : { name, role } }
  const map = Object.fromEntries(
    soldiers.map(({ _id, fullName, role }) => [
      _id.toString(),
      { fullName, role }
    ]),
  );

  

  return NextResponse.json({ map });
}
