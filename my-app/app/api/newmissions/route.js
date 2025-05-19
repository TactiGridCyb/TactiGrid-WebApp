import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Mission from '@/models/mission';


export async function POST(req) {
  const body = await req.json();

  /* 1. rename id → missionId */
  const data = {
    ...body,
    missionId: body.id,
  };
  delete data.id;

  /* 2. ensure startTime is a Date object */
  if (typeof data.startTime === 'string') {
    data.startTime = new Date(data.startTime);
  }
  

  await dbConnect();
  const doc = await Mission.create(data);
  return NextResponse.json(doc, { status: 201 });
}
