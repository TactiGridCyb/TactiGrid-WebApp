// app/api/missions/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';     // your existing helper
import Mission   from '@/models/MissionModel';    // the schema we built before

export async function GET(req) {
 
  const { searchParams } = new URL(req.url);
  const finishedParam    = searchParams.get('finished'); // "true" | "false" | null

  if (finishedParam !== 'true' && finishedParam !== 'false') {
    
    return NextResponse.json(
      { error: 'Use ?finished=true or ?finished=false' },
      { status: 400 },
    );
  }

  const isFinished = finishedParam === 'true';


  await dbConnect();
  const missions = await Mission.find({ IsFinished: isFinished })
                                .sort({ StartTime: -1 });  // optional

  
  console.log(missions);   // inside getActiveMissions
                         
  return NextResponse.json({ missions }, { status: 200 });
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Minimal sanity-checks; add more if you need
    const required = ['missionName', 'StartTime', 'Duration',
                      'Location',     'Soldiers',  'Commanders',
                      'Configuration'];
    const missing = required.filter((k) => body[k] == null);
    if (missing.length)
      return NextResponse.json(
        { error: 'Missing fields: ' + missing.join(', ') },
        { status: 400 },
      );

    await dbConnect();

    const mission = await Mission.create({
      missionName:  body.missionName,
      StartTime:    new Date(body.StartTime),
      EndTime:      null,                 // starts unfinished
      Duration:     body.Duration,        // seconds
      Location: {
        name: body.Location.name ?? '',
        lat:  body.Location.lat,
        lon:  body.Location.lon,
      },
      Soldiers:      body.Soldiers,
      Commanders:    body.Commanders,
      Configuration: body.Configuration,
      IsFinished:    false,
    });

    return NextResponse.json(
      { ok: true, id: mission._id.toString() },
      { status: 201 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 },
    );
  }
}
