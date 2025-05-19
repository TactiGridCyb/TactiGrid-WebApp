'use client';
import PropTypes from 'prop-types';
import styles    from '../styles/componentsDesign/MissionItem.module.css';   // ← paste the CSS you sent into this file

/**
 * One card in the mission list.
 * The markup mirrors the class-names in your CSS so the
 * hover-zoom + grey overlay work out of the box.
 */
export default function MissionItem({ m, onOpen }) {
  return (
    <article
      className={styles.missionCard}
      onClick={onOpen}              /* optional click handler */
    >
      {/* ── grey hover overlay ── */}
      <div className={styles.overlay}>Click to open</div>

      {/* ── header row ── */}
      <div className={styles.headerRow}>
        <span className={styles.icon}>ℹ️</span>

        <div className={styles.titleContainer}>
          <h2 className={styles.title}>{m.name}</h2>
          <small className={styles.missionId}>MissionID: {m.missionId}</small>
        </div>
      </div>

      {/* ── detail rows ── */}
      <div className={styles.detailsRow}>
        <span className={styles.detail}>
          <span className={styles.detailLabel}>Start:</span> {m.startTime}
        </span>
        <span className={styles.detail}>
          <span className={styles.detailLabel}>Duration:</span> {m.duration}
        </span>
      </div>

      <div className={styles.detailsRow}>
        <span className={styles.detail}>
          <span className={styles.detailLabel}>Location:</span> {m.location}
        </span>
        <span className={styles.detail}>
          <span className={styles.detailLabel}>Config ID:</span> {m.configurationId || '—'}
        </span>
      </div>

      <div className={styles.detailsRow}>
        <span className={styles.detail}>
          <span className={styles.detailLabel}>Soldiers:</span> {m.soldiers || '—'}
        </span>
        <span className={styles.detail}>
          <span className={styles.detailLabel}>Commanders:</span> {m.commanders || '—'}
        </span>
      </div>

      {/* ── optional bottom button (remove if you don’t need it) ── */}
      {onOpen && (
        <div className={styles.buttonContainer}>
          <button className={styles.viewVideoBtn}>Open Mission</button>
        </div>
      )}
    </article>
  );
}

MissionItem.propTypes = {
  m: PropTypes.object.isRequired,
  onOpen: PropTypes.func               // pass a handler if you want the button / card clickable
};
