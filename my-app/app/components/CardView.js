import React from 'react';

/**
 * This component renders a notification card that looks
 * exactly like the screenshot you provided:
 *
 *  ------------------------------------------------------
 * | [Bell Icon]  Financial Report Over...     [ ... ]    |
 * | Notification • 2m                                   |
 * | Alex Miller                                         |
 * | High Priority (in red)                              |
 * |                                                      |
 * | Please submit your quarterly figures by the end of   |
 * | the business day today, as they are overdue.         |
 * |                                                      |
 * | [ Dismiss ]                         [ Submit ]       |
 *  ------------------------------------------------------
 */
export default function NotificationCard() {
  return (
    <div style={styles.cardContainer}>
      {/* Header row: bell icon, title, and 3-dot menu */}
      <div style={styles.headerRow}>
        {/* Bell Icon in a colored box */}
        <div style={styles.bellIconContainer}>
          <span style={styles.bellIcon} role="img" aria-label="bell">
            🔔
          </span>
        </div>

        {/* Title */}
        <div style={styles.title}>Financial Report Over...</div>

        {/* 3-dot menu (ellipsis) - purely for visual mimic */}
        <div style={styles.ellipsis}>⋯</div>
      </div>

      {/* Subheader row: "Notification • 2m" */}
      <div style={styles.subHeaderRow}>
        Notification • 2m
      </div>

      {/* Name */}
      <div style={styles.nameRow}>
        Alex Miller
      </div>

      {/* Priority label in red */}
      <div style={styles.priority}>High Priority</div>

      {/* Main message */}
      <div style={styles.mainMessage}>
        Please submit your quarterly figures by the end of the business today, as they are overdue.
      </div>

      {/* Button row */}
      <div style={styles.buttonRow}>
        <button style={styles.dismissButton}>
          Dismiss
        </button>
        <button style={styles.submitButton}>
          Submit
        </button>
      </div>
    </div>
  );
}

//
// Inline styles to replicate the look
// (You could replace with your own CSS/SCSS/Tailwind/etc.)
//
const styles = {
  cardContainer: {
    width: '300px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '16px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
  },
  bellIconContainer: {
    width: '40px',
    height: '40px',
    backgroundColor: '#FFD966', // approximate yellow box color
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '8px',
  },
  bellIcon: {
    fontSize: '18px',
  },
  title: {
    flexGrow: 1,
    color: '#000000',
    fontWeight: 'bold',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  ellipsis: {
    cursor: 'pointer',
    color: '#000000',
    fontSize: '20px',
    lineHeight: '20px',
    marginLeft: '8px',
    userSelect: 'none',
  },
  subHeaderRow: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '4px',
  },
  nameRow: {
    fontSize: '13px',
    color: '#333',
    marginBottom: '2px',
  },
  priority: {
    color: 'red',
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  mainMessage: {
    color: '#000000',
    fontSize: '13px',
    marginBottom: '16px',
    lineHeight: '1.4',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  dismissButton: {
    backgroundColor: '#f2f2f2',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
  },
  submitButton: {
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
  },
};
