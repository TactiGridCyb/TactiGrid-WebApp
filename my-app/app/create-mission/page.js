// File: my-app/app/create-mission/page.js
'use client';

import React, { useState } from 'react';
import Navbar from '../components/Navbar.js';
import styles from '../styles/pagesDesign/createMission.module.css';

export default function CreateNewMission() {
  const [showModal, setShowModal] = useState(false);
  const [revokeCertFile, setRevokeCertFile] = useState(null);
  
  const handleCreateMission = async () => {
    alert("Created Mission!");
  };

  const handleIssueCertificate = async () => {
    const selectEl = document.querySelector('select[name="soldiers"]');
    const soldiersName = selectEl?.value;
    if (!soldiersName) {
      alert('Please select a soldier');
      return;
    }

    try {
      const res = await fetch('/api/cert/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: soldiersName })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        const certBlob = new Blob([data.certificate], { type: 'application/x-pem-file' });
        const certUrl = URL.createObjectURL(certBlob);
        const aCert = document.createElement('a');
        aCert.href = certUrl;
        aCert.download = `${data.name}_cert.pem`;
        aCert.click();
        URL.revokeObjectURL(certUrl);
      
        const keyBlob = new Blob([data.privateKey], { type: 'application/x-pem-file' });
        const keyUrl = URL.createObjectURL(keyBlob);
        const aKey = document.createElement('a');
        aKey.href = keyUrl;
        aKey.download = `${data.name}_key.pem`;
        aKey.click();
        URL.revokeObjectURL(keyUrl);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate certificate');
    }
  };
  
  const handleRevokeCertificate = async () => {
    if (!revokeCertFile) {
      alert('Please select a certificate file to revoke');
      return;
    }
  
    try {
      const certPem = await revokeCertFile.text();
  
      const res = await fetch('/api/cert/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certPem })
      });
  
      const result = await res.json();
  
      if (res.ok) {
        alert(`Certificate revoked successfully! (Serial: ${result.serial})`);
      } else {
        alert(`Revocation failed: ${result.error || result.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error reading or revoking certificate');
    }
  };
  
  

  return (
    <div>
      {/* Nav Bar */}
      <Navbar />

      {/* Header Section */}
      <header className={styles.header}>
        <h1>Create New Mission</h1>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.formContainer}>
          <div className={styles.formGroup}>
            <label>Mission ID</label>
            <input
              type="text"
              placeholder="GENERATED MISSIONID..."
              disabled
            />
          </div>

          <div className={styles.formGroup}>
            <label>Enter Mission Name</label>
            <input type="text" placeholder="Enter mission name..." />
          </div>

          <div className={styles.formGroup}>
            <label>Enter ConfigurationID</label>
            <select name="config">
              <option value="">Select configuration...</option>
              <option value="config1">Configuration #1</option>
              <option value="config2">Configuration #2</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Enter Commander</label>
            <select name="commander">
              <option value="">Select commander...</option>
              <option value="commander1">Commander #1</option>
              <option value="commander2">Commander #2</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Enter Soldiers</label>
            <select name="soldiers">
              <option value="">Select soldiers...</option>
              <option value="soldier1">Soldier #1</option>
              <option value="soldier2">Soldier #2</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              className={styles.createMissionBtn}
              onClick={handleCreateMission}
            >
              Create Mission
            </button>

            <button
              className={styles.createMissionBtn}
              onClick={handleIssueCertificate}
              style={{ backgroundColor: '#28a745' }}
            >
              Issue Certificate
            </button>

            <button
              className={styles.createMissionBtn}
              onClick={handleRevokeCertificate}
              style={{ backgroundColor: '#dc3545' }}
            >
              Revoke Certificate
            </button>
            <input
              type="file"
              accept=".pem"
              onChange={(e) => setRevokeCertFile(e.target.files[0])}
              style={{ marginTop: '1rem' }}
            />
          </div>
        </div>
      </main>

      {/* Pop-out Modal */}
      {showModal && certData && (
        <div
          style={{
            position:      'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor:'rgba(0,0,0,0.6)',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
            zIndex:        1000
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background:   '#fff',
              padding:      '2rem',
              borderRadius: '8px',
              maxWidth:     '800px',
              width:        '95%',
              display:      'flex',
              gap:          '2rem',
              boxShadow:    '0 4px 12px rgba(0,0,0,0.2)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Soldier Section */}
            <div style={{ flex: 1 }}>
              <h2 style={{ marginTop: 0 }}>🪖 Soldier</h2>
              <p><strong>Name:</strong> {certData.name}</p>
              <p><strong>Mission ID:</strong> {certData.missionId}</p>
              <h3 style={{ marginBottom: '0.5rem' }}>Certificate:</h3>
              <pre style={{
                background:   '#f0f0f0',
                padding:      '1rem',
                border:       '1px solid #ccc',
                borderRadius: '4px',
                maxHeight:    '150px',
                overflowY:    'auto',
                fontSize:     '0.85rem'
              }}>
                {certData.certificate}
              </pre>
              <button
                onClick={() => downloadPem(`${certData.name}_cert.pem`, certData.certificate)}
                style={{
                  marginTop:   '0.5rem',
                  padding:     '0.5rem 1rem',
                  border:      'none',
                  borderRadius:'4px',
                  background:  '#0070f3',
                  color:       '#fff',
                  cursor:      'pointer'
                }}
              >
                Download Certificate
              </button>

              <h3 style={{ marginBottom: '0.5rem', marginTop: '1rem' }}>Private Key:</h3>
              <pre style={{
                background:   '#f0f0f0',
                padding:      '1rem',
                border:       '1px solid #ccc',
                borderRadius: '4px',
                maxHeight:    '150px',
                overflowY:    'auto',
                fontSize:     '0.85rem'
              }}>
                {certData.privateKey}
              </pre>
              <button
                onClick={() => downloadPem(`${certData.name}_key.pem`, certData.privateKey)}
                style={{
                  marginTop:   '0.5rem',
                  padding:     '0.5rem 1rem',
                  border:      'none',
                  borderRadius:'4px',
                  background:  '#0070f3',
                  color:       '#fff',
                  cursor:      'pointer'
                }}
              >
                Download Private Key
              </button>
            </div>

            {/* Commander Section */}
            <div style={{ flex: 1 }}>
              <h2 style={{ marginTop: 0 }}>🗡️ Commander</h2>
              <p>
                <strong>Receives:</strong><br />
                • Root CA public certificate<br />
                • Signed whitelist.json<br />
                • Mission whitelist entries
              </p>
              <h3 style={{ marginBottom: '0.5rem', marginTop: '1rem' }}>Whitelist Entries:</h3>
              <div style={{
                background:   '#fafafa',
                padding:      '1rem',
                border:       '1px solid #ddd',
                borderRadius: '4px',
                maxHeight:    '350px',
                overflowY:    'auto',
                fontSize:     '0.9rem'
              }}>
                {certData.whitelist.map((e, i) => (
                  <div key={i} style={{ marginBottom: '0.5rem' }}>
                    <strong>Serial:</strong> {e.serial}<br/>
                    <strong>Name:</strong> {e.name}<br/>
                    <strong>Mission:</strong> {e.missionId}<br/>
                    <strong>Expires:</strong> {new Date(e.expires).toLocaleString()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
