'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles       from '../styles/componentsDesign/missionItemsCard.module.css';
import UploadLogButton from '../components/UploadLogButton';

export default function MissionItem({ mission }) {
  const router = useRouter();

  /* -------- normalised props -------- */
  const {
    id          = (mission._id ?? '').toString(),
    missionName = mission.missionName   ?? mission.missionsName ?? mission.name ?? '—',
    startTime   = mission.StartTime     ?? mission.startTime    ?? null,
    duration    = mission.Duration      ?? mission.duration     ?? null,
    location    = mission.Location      ?? mission.location     ?? {},
    isFinished  = mission.IsFinished    ?? mission.isFinished   ?? false,
  } = mission;

  /* -------- helpers -------- */
  const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');
  const fmtDur  = (s) => (s ? `${s}s` : '—');
  const shortId = (str) => str.slice(-6);

  /* -------- local state -------- */
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`${styles.missionCard} ${open ? styles.open : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => setOpen(!open)}
      onKeyDown={(e) => e.key === 'Enter' && setOpen(!open)}
    >
      {/* -------- header & brief details -------- */}
      <div className={styles.headerRow}>
        <span className={styles.icon}>{isFinished ? '✅' : '⏳'}</span>
        <div className={styles.titleContainer}>
          <h2 className={styles.title}>{missionName}</h2>
          <span className={styles.missionId}>#{shortId(id)}</span>
        </div>
      </div>

      <div className={styles.detailsRow}>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Start:</span> {fmtDate(startTime)}
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Duration:</span> {fmtDur(duration)}
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Location:</span>{' '}
          {location.name ?? '—'}
        </div>
      </div>

      {/* -------- expanding drawer -------- */}
      <div className={styles.drawer}>
        {isFinished ? (
          /* one-button version */
          <div className={styles.actions}>
            <button
              className={styles.actionBtn}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/missions/${id}`);   // adjust the route if needed
              }}
            >
              View&nbsp;video
            </button>
          </div>
        ) : (
          /* two-button version (unfinished) */
          <div className={styles.actions}>
            <UploadLogButton
              missionId={id}
              className={styles.actionBtn}
            />
            <button
              className={styles.actionBtn}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/create-mission/${id}/provision`);
              }}
            >
              Upload&nbsp;to&nbsp;watches
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
