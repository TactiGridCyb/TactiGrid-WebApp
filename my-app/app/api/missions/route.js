// app/api/missions/route.js

import { MongoClient } from "mongodb";
import { NextResponse } from "next/server";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

const client = new MongoClient(uri);

export async function GET() {
  try {
    await client.connect();
    const db = client.db(dbName);

    const missions = await db
      .collection("missions")
      .find({ endTime: null }) // 🔍 only unfinished missions
      .toArray();

    const cleaned = missions.map((m) => ({
      id: m._id.toString(),
      missionId: m.missionId,
      name: m.name,
      startTime: m.startTime,
      endTime: m.endTime,
      location: m.location,
      soldiers: m.soldiers,
    }));

    return NextResponse.json({ missions: cleaned });
  } catch (err) {
    console.error("❌ Failed to fetch missions:", err);
    return NextResponse.json({ error: "Failed to fetch missions" }, { status: 500 });
  }
}

