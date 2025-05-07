// app/missions/[sessionId]/page.js   (still a server component)
import { cookies } from 'next/headers';
import ClientPlayer from '../../components/ClientPlayer.js';

async function getMission(id) {
  const base   = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const cookieStore =await cookies();
  const cookie = cookieStore.toString();
  const res = await fetch(`${base}/api/logs/${id}/positions`, {
    headers: { cookie },
    cache: 'no-store'
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function MissionPage({ params }) {
  const paramsStore = await params;
  const mission = await getMission(paramsStore.sessionId);
  if (!mission) return <p>Mission not found or not yours.</p>;

  return (
    <div style={{ height: '100vh' }}>
      <ClientPlayer mission={mission} />   {/* renders only on the client */}
    </div>
  );
}
