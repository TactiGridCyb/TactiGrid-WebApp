// app/old-missions/page.jsx  (Server Component – no "use client")
import { cookies } from 'next/headers';
import Navbar from '../components/Navbar.js';
import MissionItem from '../components/missionItem.js';
import styles from '../styles/pagesDesign/OldMissions.module.css';

// ---------- helpers -----------------
const fmtTime = d =>
  new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const fmtDuration = sec =>
  `${Math.floor(sec / 60)}h${sec % 60}m`;

// Convert DB shape → props your card expects
function shape(log) {
  return {
    _id:        log._id,
    sessionId:  log.sessionId,
    name:       log.operation,
    missionID:  log.missionId,
    startTime:  fmtTime(log.StartTime),
    endTime:    fmtTime(log.EndTime),
    duration:   fmtDuration(log.Duration),
    logFiles:   log.LogFiles?.[0] ?? '—',
    gmk:        log.GMK ?? '—',
    soldiersList: log.Soldiers.map(s => s.callsign).join(', '),
    location:   log.Location?.name ?? '—',
    configID:   log.ConfigID ?? '—'
  };
}

// ---------- data fetch -----------------
async function getMyLogs() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();          // forward authToken
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  const res = await fetch(`${base}/api/logs/mine`, {
    headers: { cookie: cookieHeader },
    // ensure fresh data; you could switch to SWR on the client later
    cache: 'no-store'
  });

  if (!res.ok) return [];               // 401 → not signed‑in
  const raw = await res.json();
  return raw.map(shape);
}

// ---------- component -----------------
export default async function ViewOldMissions() {
  const missions = await getMyLogs();   // waits on the server

  return (
    <div>
      <Navbar />

      <header className={styles.header}>
        <h1>View Old Missions</h1>
      </header>

      <main className={styles.main}>
        <div className={styles.missionsContainer}>
          {missions.length === 0 && (
            <p style={{ textAlign: 'center', color: '#666' }}>
              No logs yet.
            </p>
          )}

          {missions.map((m) => (
            /* MissionItem is (or should be) a CLIENT component
               so it can use onClick etc. */
            <MissionItem key={m._id} mission={m} />
          ))}
        </div>

        <button className={styles.createReportBtn}>Create Report</button>
      </main>
    </div>
  );
}
