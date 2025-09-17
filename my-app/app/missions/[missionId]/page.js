// app/missions/[sessionId]/page.js 
import { cookies } from 'next/headers';
import ClientPlayer from '../../components/ClientPlayer.jsx';
import Navbar from '@/app/components/Navbar.jsx';


async function getMissionAndLog(id) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  const res = await fetch(`${base}/api/logs/${id}/positions`, {
    headers: { cookie },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  return res.json();         
}

export default async function MissionPage({ params }) {
  const { missionId } = await params;         
  const bundle = await getMissionAndLog(missionId);

  if (!bundle) return <p>Mission not found or not yours.</p>;

  const { mission, log } = bundle;

  return (
    <div style={{ height: '100vh' }}>
      <Navbar></Navbar>
     
      <ClientPlayer log={log} mission={mission} />
    </div>
  );
}