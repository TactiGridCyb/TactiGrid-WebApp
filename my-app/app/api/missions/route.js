// app/api/missions/route.js

import { MongoClient } from "mongodb";
import { NextResponse } from "next/server"; // ✅ Required import

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

export async function GET() {
  const client = new MongoClient(uri); // ✅ Declare client here
  try {
    await client.connect();
    const db = client.db(dbName);
    

    const missions = await db
      .collection("missions")
      .find({IsFinished: false }) // ✅ Proper filter
      .toArray();

    

    const cleaned = missions.map((m) => ({
      id: m._id.toString(),
      name: m.missionName,
      startTime: m.StartTime,
      endTime: m.EndTime,
      location: m.Location,
      soldiers: m.Soldiers,
    }));

    return NextResponse.json({ missions: cleaned });
  } catch (err) {
    console.error("❌ Failed to fetch missions:", err);
    return NextResponse.json({ error: "Failed to fetch missions" }, { status: 500 });
  } finally {
    await client.close();
  }
}
