"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../styles/componentsDesign/missionItemsCard.module.css";
import ReportButton from "../components/ReportButton";

export default function MissionItem({ mission }) {
  const router = useRouter();

  const {
    id          = (mission._id ?? "").toString(),
    missionName = mission.missionName ?? mission.missionsName ?? mission.name ?? "—",
    startTime   = mission.StartTime ?? mission.startTime ?? null,
    duration    = mission.Duration ?? mission.duration ?? null,
    location    = mission.Location ?? mission.location ?? {},
    isFinished  = mission.IsFinished ?? mission.isFinished ?? false,
  } = mission;

  const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");
  const fmtDur  = (s) => (s ? `${s}s` : "—");
  const shortId = (str) => (str ? str.slice(-6) : "—");

  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);

  return (
    <div
      className={`glass glass-hover ${styles.missionCard} ${open ? styles.open : ""}`}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={toggle}
      onKeyDown={(e) => e.key === "Enter" && toggle()}
    >
      <span className={styles.sheen} aria-hidden="true" />

      <div className={styles.headerRow}>
        <span className={styles.icon} aria-hidden="true">
          {isFinished ? "✅" : "⏳"}
        </span>

        <div className={styles.titleContainer}>
          <h2 className={styles.title}>{missionName}</h2>
          <span className={styles.missionId}>#{shortId(id)}</span>
        </div>

        <div className={styles.headerRight}>
          <span
            className={`${styles.chip} ${
              isFinished ? styles.chipFinished : styles.chipLive
            }`}
          >
            {isFinished ? "Finished" : "In Progress"}
          </span>
          <span className={styles.caret} aria-hidden="true" />
        </div>
      </div>

      <div className={styles.detailsRow}>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Start</span>
          <span className={styles.detailValue}>{fmtDate(startTime)}</span>
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Duration</span>
          <span className={styles.detailValue}>{fmtDur(duration)}</span>
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Location</span>
          <span className={styles.detailValue}>{location.name ?? "—"}</span>
        </div>
      </div>

      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {isFinished ? (
          <div className={styles.actions}>
            <button
              className={`btn btn-primary ${styles.actionBtn}`}
              onClick={() => router.push(`/missions/${id}`)}
            >
              View&nbsp;video
            </button>
            <ReportButton missionId={id} className={`btn ${styles.actionBtn}`} />
          </div>
        ) : (
          <div className={styles.actions}>
            <button
              className={`btn ${styles.actionBtn}`}
              onClick={() => router.push(`/create-mission/${id}/uploadlog`)}
            >
              Open&nbsp;Log&nbsp;Upload
            </button>

            <button
              className={`btn btn-primary ${styles.actionBtn}`}
              onClick={() => router.push(`/create-mission/${id}/provision`)}
            >
              Upload&nbsp;to&nbsp;watches
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
