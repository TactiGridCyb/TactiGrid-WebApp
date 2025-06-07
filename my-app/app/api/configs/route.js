import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Config from '@/models/configuration';     // see model below

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q       = (searchParams.get('search') || '').trim();
  const regex   = new RegExp(q, 'i');

  await dbConnect();
  const res = await Config.find({
    $or: [{ gmkFunction: regex }, { fhfFunction: regex }],
  })
  .select('_id gmkFunction fhfFunction')
  .limit(20)
  .lean();

  return NextResponse.json(res);
}
