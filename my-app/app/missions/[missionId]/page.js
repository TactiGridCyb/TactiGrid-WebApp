// app/missions/[sessionId]/page.js   (still a server component)
import { cookies } from 'next/headers';
import ClientPlayer from '../../components/ClientPlayer.js';


async function getMissionAndLog(id) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  const res = await fetch(`${base}/api/logs/${id}/positions`, {
    headers: { cookie },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  return res.json();          // ⇒ { mission, log }
}

export default async function MissionPage({ params }) {
  const { missionId } = await params;          // URL segment
  const bundle = await getMissionAndLog(missionId);

  if (!bundle) return <p>Mission not found or not yours.</p>;

  const { mission, log } = bundle;

  return (
    <div style={{ height: '100vh' }}>
      {/* Pass both pieces down; ClientPlayer forwards them to LogPlayer */}
      <ClientPlayer log={log} mission={mission} />
    </div>
  );
}