// app/api/analytics/route.js

import dbConnect from '../../../lib/mongoose';
import Mission   from '../../../models/MissionModel';        // note: no “Model” suffix
import Configuration from '../../../models/Configuration';

export async function GET() {
  // 1) Connect to DB
  await dbConnect();

  // 2) Missions per month
  const perMonth = await Mission.aggregate([
    { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 }
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
  const monthNames = [ '', 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec' ];
  const missionsPerMonth = perMonth.map(m => ({
    month:    monthNames[m._id.month],
    missions: m.count
  }));

  // 3) Recent creations & closures
  const created = await Mission.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('createdAt missionName')
    .lean();
  const closed = await Mission.find({ EndTime: { $ne: null } })
    .sort({ EndTime: -1 })
    .limit(5)
    .select('EndTime missionName')
    .lean();

  const acts = [];
  created.forEach(c => acts.push({
    text: 'Mission "' + c.missionName + '" created',
    date: c.createdAt
  }));
  closed.forEach(c => acts.push({
    text: 'Mission "' + c.missionName + '" closed',
    date: c.EndTime
  }));
  acts.sort((a,b) => b.date - a.date);

  const recentActivities = acts.slice(0,5).map(a => ({
    text: a.text,
    date: a.date.toLocaleDateString('en', {
      day:   '2-digit',
      month: 'short',
      year:  'numeric'
    })
  }));

  // 4) Average soldiers per mission
  const avgSoldiersAgg = await Mission.aggregate([
    { $project: { num: { $size: '$Soldiers' } } },
    { $group:   { _id: null, avg: { $avg: '$num' } } }
  ]);
  const avgSoldiers = Math.round((avgSoldiersAgg[0]?.avg || 0) * 100) / 100;

  // 5) Average duration
  const avgDurationAgg = await Mission.aggregate([
    { $group: { _id: null, avg: { $avg: '$Duration' } } }
  ]);
  const avgDuration = Math.round((avgDurationAgg[0]?.avg || 0) * 100) / 100;

  // 6) Most‐used GMK
  const gmkAgg = await Mission.aggregate([
    { $lookup: {
        from: 'configurations',
        localField: 'Configuration',
        foreignField: '_id',
        as: 'cfg'
    }},
    { $unwind: '$cfg' },
    { $group: { _id: '$cfg.gmkFunction', count: { $sum: 1 } } },
    { $sort:  { count: -1 } },
    { $limit: 1 }
  ]);
  const mostUsedGmk = gmkAgg[0]?._id || null;

  // 7) Most‐used FHF
  const fhfAgg = await Mission.aggregate([
    { $lookup: {
        from: 'configurations',
        localField: 'Configuration',
        foreignField: '_id',
        as: 'cfg'
    }},
    { $unwind: '$cfg' },
    { $group: { _id: '$cfg.fhfFunction', count: { $sum: 1 } } },
    { $sort:  { count: -1 } },
    { $limit: 1 }
  ]);
  const mostUsedFhf = fhfAgg[0]?._id || null;

  // 8) Return JSON
  return new Response(JSON.stringify({
    missionsPerMonth,
    recentActivities,
    avgSoldiers,
    avgDuration,
    mostUsedGmk,
    mostUsedFhf
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
