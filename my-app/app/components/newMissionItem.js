'use client';
import PropTypes from 'prop-types';
import styles    from '../styles/componentsDesign/MissionItemsCard.module.css';  


export default function MissionItem({ m, onOpen }) {
  return (
    <article
      className={styles.missionCard}
      onClick={onOpen}            
    >

      <div className={styles.overlay}>Click to open</div>


      <div className={styles.headerRow}>
        <span className={styles.icon}>ℹ️</span>

        <div className={styles.titleContainer}>
          <h2 className={styles.title}>{m.name}</h2>
          <small className={styles.missionId}>MissionID: {m.missionId}</small>
        </div>
      </div>


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
  onOpen: PropTypes.func               
};
