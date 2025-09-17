// app/old-missions/page.jsx
import { cookies } from 'next/headers';
import Navbar from '../components/Navbar.jsx';
import MissionItem from '../components/missionItem.jsx';
import styles from '../styles/pagesDesign/OldMissions.module.css';

const shape = (doc) => ({
  id:          (doc._id ?? doc.id).toString(),
  missionName: doc.missionName ?? doc.name ?? '—',
  startTime:   doc.StartTime   ?? doc.startTime ?? null,
  duration:    doc.Duration    ?? doc.duration  ?? null,
  location:    doc.Location    ?? doc.location  ?? {},
  isFinished:  doc.IsFinished  ?? doc.isFinished ?? false,
});

async function getFinishedMissions() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  const res = await fetch(`${base}/api/missionFunctions?finished=true`, {
    headers: { cookie: cookieHeader },
    cache:   'no-store',
  });

  if (!res.ok) return [];
  const { missions } = await res.json();
  return missions.map(shape);
}

export default async function FinishedMissionsPage() {
  const missions = await getFinishedMissions();

  return (
    <div className={styles.page}>
      <Navbar />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.title}>Missions — Finished</h1>
          <p className={styles.subtitle}>
            Review and manage completed missions. Click a card to expand actions.
          </p>
          <span className={styles.countBadge}>{missions.length}</span>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.panel}>
          {missions.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🗂️</div>
              <h3>No finished missions yet</h3>
              <p>Once missions complete, they’ll appear here with quick actions.</p>
            </div>
          ) : (
            <div className={styles.missionsGrid}>
              {missions.map((m) => (
                <MissionItem key={m.id} mission={m} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
