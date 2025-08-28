"use client";

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import MissionItem from "../components/missionItem";
import CreateMissionDialog from "../components/CreateMissionDialog";
import styles from "../styles/pagesDesign/createMission.module.css";

/* normalize raw docs → predictable shape */
const shape = (doc) => ({
  id:          (doc._id ?? doc.id)?.toString?.() ?? "",
  missionName: doc.missionName ?? doc.missionsName ?? doc.name ?? "—",
  startTime:   doc.StartTime ?? doc.startTime ?? null,
  duration:    doc.Duration ?? doc.duration ?? null, // seconds
  location:    doc.Location ?? doc.location ?? {},
  isFinished:  doc.IsFinished ?? doc.isFinished ?? false,
});

/* client fetch (cookies included automatically same-site) */
async function fetchActiveMissions() {
  const res = await fetch("/api/missionFunctions?finished=false", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) return [];
  const { missions } = await res.json();
  return (missions || []).map(shape);
}

export default function MissionsInProgressPage() {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetchActiveMissions()
      .then((m) => { if (!ignore) { setMissions(m); } })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  const count = missions.length;

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />
      <Navbar />

      <header className={`glass-card ${styles.header}`}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Missions — In Progress</h1>
            <p className={styles.subtitle}>Live operations currently running across the grid.</p>
          </div>

          <div className={styles.meta}>
            <span className={`badge ${styles.countBadge}`}>{count} active</span>
            <button
              onClick={() => setOpenDialog(true)}
              className="btn btn-primary"
              style={{ marginLeft: 8 }}
            >
              + Create Mission
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.missionsContainer}>
          {/* loading skeletons */}
          {loading && [1,2,3].map((i) => (
            <div key={i} className="glass" style={{ height: 120, borderRadius: 18 }} />
          ))}

          {/* empty state */}
          {!loading && count === 0 && (
            <div className={`glass ${styles.empty}`}>
              <div className={styles.emptyIcon}>🛰️</div>
              <h3>No missions running</h3>
              <p>Launch a new mission to get things moving.</p>
              <button onClick={() => setOpenDialog(true)} className="btn btn-primary">
                + Create Mission
              </button>
            </div>
          )}

          {/* missions */}
          {!loading && count > 0 && missions.map((m) => (
            <MissionItem key={m.id} mission={m} />
          ))}
        </div>

        {/* sticky CTA shelf */}
        {!loading && count > 0 && (
          <div className={styles.cta}>
            <button onClick={() => setOpenDialog(true)} className="btn btn-primary">
              + Create Mission
            </button>
          </div>
        )}

        {/* inline dialog */}
        <CreateMissionDialog
          isOpen={openDialog}
          onClose={() => setOpenDialog(false)}
        />
      </main>
    </div>
  );
}
