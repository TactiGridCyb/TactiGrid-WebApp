// app/api/missions/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';     
import Mission   from '@/models/MissionModel';    

export async function GET(req) {
 
  const { searchParams } = new URL(req.url);
  const finishedParam    = searchParams.get('finished'); 

  if (finishedParam !== 'true' && finishedParam !== 'false') {
    
    return NextResponse.json(
      { error: 'Use ?finished=true or ?finished=false' },
      { status: 400 },
    );
  }

  const isFinished = finishedParam === 'true';


  await dbConnect();
  const missions = await Mission.find({ IsFinished: isFinished })
                                .sort({ StartTime: -1 });  

  
  console.log(missions);   
                         
  return NextResponse.json({ missions }, { status: 200 });
}

export async function POST(req) {
  try {
    const body = await req.json();


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
      EndTime:      null,                 
      Duration:     body.Duration,       
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
