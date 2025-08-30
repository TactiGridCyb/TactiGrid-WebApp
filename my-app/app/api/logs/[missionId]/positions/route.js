// app/api/logs/[missionId]/positions/route.js
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect   from '@/lib/mongoose';
import Mission     from '@/models/MissionModel';
import Log         from '@/models/LogsModel';
import Soldier     from '@/models/Soldier';
import { requireUser } from '@/lib/whoisme';

const isOid = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));

const toIdStringArray = (arr) =>
  (arr ?? [])
    .map((x) => {
      if (typeof x === 'string') return x.trim();
      if (x && typeof x === 'object') {
        if (x._id)  return String(x._id);
        if (x.id)   return String(x.id);
        if (x.IDF_ID) return String(x.IDF_ID);
        // sometimes data mistakenly stores names; return them as-is
        if (x.fullName) return String(x.fullName);
      }
      return null;
    })
    .filter(Boolean);

export async function GET(_req, { params }) {
  try {
    const { missionId } = await params;
    if (!missionId) return NextResponse.json({ error: 'missing-mission-id' }, { status: 400 });

    const me = await requireUser();
    if (!me) return NextResponse.json({ error: 'not-signed-in' }, { status: 401 });

    await dbConnect();

    // 1) Mission
    const mission = await Mission.findOne({ _id: missionId /* , owner: me._id */ }).lean();
    if (!mission) return NextResponse.json({ error: 'mission-not-found' }, { status: 404 });

    // 2) Log (prefer mission.Log, else latest for Mission)
    let logDoc = null;
    if (mission.Log) logDoc = await Log.findById(mission.Log).lean();
    if (!logDoc) logDoc = await Log.findOne({ Mission: mission._id }).sort({ createdAt: -1 }).lean();
    if (!logDoc) return NextResponse.json({ error: 'log-not-found' }, { status: 404 });

    // 3) Collect identifiers that might be ObjectIds or names
    const idsFromMission = [
      ...toIdStringArray(mission.Soldiers ?? mission.soldiers),
      ...toIdStringArray(mission.Commanders ?? mission.commanders),
    ];

    const idsFromLog = Array.from(
      new Set((logDoc.Data ?? []).map((r) => String(r.soldierId)).filter(Boolean))
    );

    const uniqueIds = Array.from(new Set([...idsFromMission, ...idsFromLog]));

    // Partition: valid ObjectIds vs labels (names, callsigns, etc.)
    const oidList = uniqueIds.filter(isOid).map((v) => new mongoose.Types.ObjectId(String(v)));
    const labelList = uniqueIds.filter((v) => !isOid(v));

    // 4) Build names map
    const names = Object.fromEntries(labelList.map((v) => [String(v), String(v)])); // name→name
    if (oidList.length) {
      const people = await Soldier.find(
        { _id: { $in: oidList } },
        { _id: 1, fullName: 1, role: 1 }
      ).lean();
      for (const p of people) {
        names[String(p._id)] = p.fullName || String(p._id);
      }
    }

    // 5) Normalize mission for the client
    const missionOut = {
      _id: String(mission._id),
      missionName: mission.missionName ?? mission.name ?? '',
      StartTime: mission.StartTime ?? mission.startTime ?? null,
      Duration: mission.Duration ?? mission.duration ?? null,
      Location: mission.Location ?? mission.location ?? null,
      Soldiers: toIdStringArray(mission.Soldiers ?? mission.soldiers),
      Commanders: toIdStringArray(mission.Commanders ?? mission.commanders),
      IsFinished: !!(mission.IsFinished ?? mission.isFinished),
    };

    // 6) Normalize log for the client
    const toNum = (v) => (v == null ? v : Number(v));
    const logOut = {
      Interval: logDoc.Interval ?? 1000,
      Mission: String(logDoc.Mission),
      Data: (logDoc.Data ?? []).map((r) => ({
        soldierId: String(r.soldierId),
        latitude:  toNum(r.latitude),
        longitude: toNum(r.longitude),
        heartRate: toNum(r.heartRate),
        time_sent: r.time_sent, // keep raw; client parses
      })),
      Events: (logDoc.Events ?? []).map((e) => ({
        eventName: e.eventName,
        timestamp: e.timestamp,
        newCommanderID: e.newCommanderID ? String(e.newCommanderID) : undefined,
        missingID:      e.missingID      ? String(e.missingID)      : undefined,
        compromisedID:  e.compromisedID  ? String(e.compromisedID)  : undefined,
        data: e.data ?? undefined,
      })),
      createdAt: logDoc.createdAt ?? null,
    };

    return NextResponse.json({ mission: missionOut, log: logOut, names }, { status: 200 });
  } catch (err) {
    console.error('GET /api/logs/[missionId]/positions error:', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
