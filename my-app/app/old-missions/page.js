// app/old-missions/page.jsx  (Server Component – no "use client")
import { cookies } from 'next/headers';
import Navbar from '../components/Navbar.js';
import MissionItem from '../components/missionItem.js';

import styles from '../styles/pagesDesign/OldMissions.module.css';



/* -------- map raw Mongo docs → a clean, predictable shape -------- */
const shape = (doc) => ({
  id:          (doc._id ?? doc.id).toString(),          // always string
  missionName: doc.missionName  ?? doc.name  ?? '—',
  startTime:   doc.StartTime    ?? doc.startTime ?? null,
  duration:    doc.Duration     ?? doc.duration  ?? null, // seconds
  location:    doc.Location     ?? doc.location  ?? {},
  isFinished:  doc.IsFinished   ?? doc.isFinished ?? false,
});

/* -------- fetch only missions in progress -------- */
async function getFinishedMissions() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  const res = await fetch(`${base}/api/missionFunctions?finished=true`, {
    headers: { cookie: cookieHeader },
    cache:   'no-store',
  });

  if (!res.ok) return [];
  const { missions } = await res.json();         // { missions:[…] }

  return missions.map(shape);
}

export default async function MissionsInProgressPage() {
  const missions = await getFinishedMissions();

  return (
    <div>
      <Navbar />

      <header className={styles.header}>
        <h1>Missions — Finished</h1>
      </header>

      <main className={styles.main}>
        <div className={styles.missionsContainer}>
          {missions.length === 0 && (
            <p style={{ textAlign: 'center', color: '#666' }}>
              No missions currently running.
            </p>
          )}

          {missions.map((m) => (
            <MissionItem key={m.id} mission={m} />
          ))}
        </div>

        
      </main>
    </div>
  );
}
