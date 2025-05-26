// app/api/functions/route.js
export const runtime = 'nodejs';

import dbConnect from '../../../lib/mongoose';
import Func      from '../../../models/Function';

export async function GET(request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // optional filter
  const query = type ? { type } : {};
  const list = await Func.find(query).sort({ createdAt: 1 }).lean();
  return new Response(JSON.stringify(list), { status: 200 });
}

// (Optional) to allow adding new functions via API:
export async function POST(request) {
  await dbConnect();
  const payload = await request.json();
  // upsert to avoid duplicates
  const fn = await Func.findOneAndUpdate(
    { name: payload.name },
    { $set: payload },
    { upsert: true, new: true }
  );
  return new Response(JSON.stringify(fn), { status: 201 });
}
