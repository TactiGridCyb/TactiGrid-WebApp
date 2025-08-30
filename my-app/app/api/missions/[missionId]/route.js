// app/missions/[missionId]/page.js
import ClientPlayer from '../../components/ClientPlayer.js';

async function getMissionAndLog(missionId) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res  = await fetch(`${base}/api/logs/${missionId}/positions`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json(); // { mission, log, names }
}

export default async function MissionPage({ params }) {
  const { missionId } = await params;
  const bundle = await getMissionAndLog(missionId);
  if (!bundle) return <p>Mission not found or no log.</p>;

  const { mission, log, names } = bundle;

  return (
    <div style={{ height: '100vh' }}>
      <ClientPlayer log={log} mission={mission} names={names} />
    </div>
  );
}
