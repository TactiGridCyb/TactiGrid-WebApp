import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Mission from '@/models/mission.js';

export async function GET() {
  await dbConnect();

  /* today’s date, midnight UTC  – change if you like */
  const now = new Date();
 

  /* grab missions that have NOT started yet */
  const newMissions = await Mission.find({ startTime: { $gte: now } })
                                   .sort({ startTime: 1 })   // chronologic
                                   .lean();

  return NextResponse.json(newMissions);
}
