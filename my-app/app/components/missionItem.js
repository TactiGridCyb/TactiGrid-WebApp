// components/MissionItem.js
"use client";
import React from 'react';
import Link from 'next/link';
import styles from '../styles/componentsDesign/missionItemsCard.module.css';

const MissionItem = ({ mission }) => {
  const {
    sessionId,
    name,
    missionID,
    startTime,
    endTime,
    duration,
    logFiles,
    gmk,
    soldiersList,
    location,
    configID,
  } = mission;

  return (
    
    <div className={styles.missionCard}>
      <Link href={`/missions/${sessionId}`} >
      <div className={styles.headerRow}>
        <div className={styles.icon}>
          {/* Replace with your desired icon */}
          <span role="img" aria-label="info">
            ℹ️
          </span>
        </div>
        <div className={styles.titleContainer}>
          <h2 className={styles.title}>{name}</h2>
          <span className={styles.missionId}>MissionID: {missionID}</span>
        </div>
      </div>

      <div className={styles.detailsRow}>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>StartTime:</span> {startTime}
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>EndTime:</span> {endTime}
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Duration:</span> {duration}
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>LogFiles:</span> {logFiles}
        </div>
      </div>

      <div className={styles.detailsRow}>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>GMK:</span> {gmk}
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Soldiers:</span> {soldiersList}
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Location:</span> {location}
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>ConfigID:</span> {configID}
        </div>
      </div>

      

      {/* Overlay that appears on hover */}
      <div className={styles.overlay}>Show Video</div>
      

      </Link>

    </div>
    
    
  );
};

export default MissionItem;
