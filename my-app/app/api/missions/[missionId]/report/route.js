import { NextResponse } from 'next/server';
import dbConnect         from '@/lib/mongoose';
import Mission           from '@/models/MissionModel';
import haversine         from 'haversine-distance';

/* -------- helper: merge every spelling into one clean object -------- */
function normaliseLog(raw = {}) {
  // collect first non-undefined match for each field
  const pick = (names) => names.find((k) => raw[k] !== undefined);

  return {
    Interval : raw[pick(['Interval', 'interval', 'intervalMs', 'INTERVAL'])] ?? 0,
    Data     : raw[pick(['Data', 'data', 'DATA'])]                           ?? [],
    Events   : raw[pick(['Events', 'events', 'EVENTS'])]                     ?? [],
  };
}

/* -------- build the report text -------- */
function buildReport(log, mission) {
  const rows   = log.Data;
  const events = log.Events;

  const spanStart = rows[0]?.time_sent ?? 'N/A';
  const spanEnd   = rows.at(-1)?.time_sent ?? 'N/A';

  /* ----- heart-rate stats ----- */
  const hrs   = rows.map((r) => r.heartRate);
  const avgHr = hrs.reduce((a, b) => a + b, 0) / (hrs.length || 1);
  const minHr = hrs.length ? Math.min(...hrs) : 'N/A';
  const maxHr = hrs.length ? Math.max(...hrs) : 'N/A';

  /* ----- group telemetry by soldier ----- */
  const bySoldier = {};
  for (const r of rows) (bySoldier[r.soldierId] ||= []).push(r);

  /* ----- distance per soldier ----- */
  const distPerSoldier = Object.fromEntries(
    Object.entries(bySoldier).map(([id, list]) => {
      let d = 0;
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1], b = list[i];
        d += haversine(
          { lat: a.latitude, lon: a.longitude },
          { lat: b.latitude, lon: b.longitude }
        );
      }
      return [id, (d / 1000).toFixed(2) + ' km'];
    })
  );

  /* ----- event counts ----- */
  const evtCounts = {};
  for (const e of events) evtCounts[e.name] = (evtCounts[e.name] || 0) + 1;

  const nowISO = new Date().toISOString();

  return [
    `Mission Report  : ${mission.missionName || mission._id}`,
    `Generated       : ${nowISO}`,
    `Interval (ms)   : ${log.Interval}`,
    `Time span       : ${spanStart} → ${spanEnd}`,
    `Telemetry rows  : ${rows.length}`,
    `Event rows      : ${events.length}`,
    '',
    '--- Soldier Summary ----------------------------------',
    ...Object.keys(bySoldier).map(
      (id) => `• ${id}  (${bySoldier[id].length} pts, dist ${distPerSoldier[id]})`
    ),
    '',
    '--- Heart-rate Stats ---------------------------------',
    `Avg: ${avgHr.toFixed(1)}  Min: ${minHr}  Max: ${maxHr}`,
    '',
    '--- Events -------------------------------------------',
    ...Object.entries(evtCounts).map(([n, c]) => `• ${n}: ${c}`),
    '',
    '--- Last Coordinates per Soldier ---------------------',
    ...Object.entries(bySoldier).map(([id, list]) => {
      const { latitude, longitude } = list.at(-1);
      return `• ${id}: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    }),
    '',
  ].join('\n');
}

/* -------- GET /api/missions/:missionId/report -------- */
export async function GET(_req, { params }) {
  await dbConnect();

  const { missionId } = params;

  /* pull the log in one go */
  const mission = await Mission.findById(missionId)
    .populate('Log')       // <— brings back the full log doc
    .lean();

  if (!mission)
    return NextResponse.json({ error: 'Mission not found' }, { status: 404 });

  if (!mission.Log)
    return NextResponse.json({ error: 'Mission has no log' }, { status: 404 });

  /* rawLog is the populated sub-document */
  const rawLog = mission.Log;

  /* one-off debug: see what keys came back */
  console.log('LOG KEYS:', Object.keys(rawLog));   // ← check server console once

  const log  = normaliseLog(rawLog);
  const text = buildReport(log, mission);

  return new Response(text, {
    headers: {
      'Content-Type':        'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="mission-${missionId}-report.txt"`,
    },
  });
}
