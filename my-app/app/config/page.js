'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar.js';
import styles from '../styles/pagesDesign/CreateConfiguration.module.css';

export default function CreateConfiguration() {
  const [gmks, setGmks]             = useState([]);
  const [fhfs, setFhfs]             = useState([]);
  const [selectedGmkName, setGmk]   = useState('');
  const [selectedFhfName, setFhf]   = useState('');
  const [result, setResult]         = useState(null);

  // load functions on mount
  useEffect(() => {
    fetch('/api/functions?type=GMK')
      .then(res => res.json())
      .then(setGmks)
      .catch(console.error);

    fetch('/api/functions?type=FHF')
      .then(res => res.json())
      .then(setFhfs)
      .catch(console.error);
  }, []);

  // find the full object for each selection
  const selectedGmk = gmks.find(fn => fn.name === selectedGmkName);
  const selectedFhf = fhfs.find(fn => fn.name === selectedFhfName);

  const handleCreate = async () => {
    if (!selectedGmkName || !selectedFhfName) {
      return alert('Please select both a GMK and a FHF function.');
    }
    try {
      const res = await fetch('/api/config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          gmkFunction: selectedGmkName,
          fhfFunction: selectedFhfName
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Unknown error');
      setResult(data);
    } catch (err) {
      console.error(err);
      alert('Failed to create configuration');
    }
  };

  return (
    <div>
      <Navbar />

      <header className={styles.header}>
        <h1>Create Configuration</h1>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.formContainer}>

            {/* GMK dropdown */}
            <div className={styles.formGroup}>
              <label>GMK Generation Function</label>
              <select
                value={selectedGmkName}
                onChange={e => setGmk(e.target.value)}
              >
                <option value="">Select GMK…</option>
                {gmks.map(fn => (
                  <option key={fn.name} value={fn.name}>
                    {fn.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Show GMK details */}
            {selectedGmk && (
              <div style={{ margin: '1rem 0', padding: '1rem', background: '#f1f1f1', borderRadius: '4px' }}>
                <h4>Description</h4>
                <p>{selectedGmk.description}</p>
                <h4>Implementation</h4>
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  background: '#fff',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  maxHeight: '200px',
                  overflow: 'auto',
                  fontSize: '0.9rem'
                }}>
                  {selectedGmk.implementation}
                </pre>
              </div>
            )}

            {/* FHF dropdown */}
            <div className={styles.formGroup}>
              <label>Frequency Hopping Function</label>
              <select
                value={selectedFhfName}
                onChange={e => setFhf(e.target.value)}
              >
                <option value="">Select FHF…</option>
                {fhfs.map(fn => (
                  <option key={fn.name} value={fn.name}>
                    {fn.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Show FHF details */}
            {selectedFhf && (
              <div style={{ margin: '1rem 0', padding: '1rem', background: '#f1f1f1', borderRadius: '4px' }}>
                <h4>Description</h4>
                <p>{selectedFhf.description}</p>
                <h4>Implementation</h4>
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  background: '#fff',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  maxHeight: '200px',
                  overflow: 'auto',
                  fontSize: '0.9rem'
                }}>
                  {selectedFhf.implementation}
                </pre>
              </div>
            )}

            {/* Create button */}
            <button
              className={styles.createBtn}
              onClick={handleCreate}
            >
              Create
            </button>

            {/* Result display */}
            {result && (
              <div style={{
                marginTop:'1.5rem',
                padding:'1rem',
                border:'1px solid #ccc',
                borderRadius:'4px',
                background:'#f9f9f9'
              }}>
                <h3>Configuration Created</h3>
                <p><strong>ID:</strong> {result.configId}</p>
                <p><strong>GMK:</strong> {result.gmkFunction}</p>
                <p><strong>FHF:</strong> {result.fhfFunction}</p>
                <p><strong>At:</strong> {new Date(result.createdAt).toLocaleString()}</p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
