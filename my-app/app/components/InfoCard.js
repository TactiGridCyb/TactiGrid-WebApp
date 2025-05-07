import React from "react";
import styles from '../styles/componentsDesign/InfoCard.module.css'

export default function InformationCard({ title, lines }) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconcontainer}>
            <span role="img" aria-label="info" className={styles.icon}>
              ℹ️
            </span>
          </div>
          
          <h2 className={styles.mainheader} >{title}</h2>
        </div>
  
        {/* Map through lines array */}
        {lines.map((line, index) => (
          <p key={index} className={styles.text}>{line}</p>
        ))}
      </div>
    );
  }

// Simple inline styles for illustration purposes
