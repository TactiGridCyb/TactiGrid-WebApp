'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar.js';
import styles from '../styles/pagesDesign/CreateConfiguration.module.css';

// 1. Fixed legal channels list (in MHz)
const LEGAL_CHANNELS = [
  // 2400–2444, 2456–2479 (1 MHz steps)
  ...Array.from({length: 45}, (_,i) => 2400 + i),
  ...Array.from({length: 24}, (_,i) => 2456 + i)
];

// 2. Parameter metadata lookup
const PARAM_INFO = {
  seed:            { desc: 'PRNG seed string shared between devices', recommended: 'e.g. "shared_sync_key_123"' },
  baseFreq:        { desc: 'Starting frequency (MHz)',             recommended: '2400' },
  stepSize:        { desc: 'Step size between hops (MHz)',          recommended: '1' },
  index:           { desc: 'Current hop index (0-based)',           recommended: '0' },
  register:        { desc: 'Initial LFSR register state (0–255)',   recommended: 'e.g. 85' },
  taps:            { desc: 'LFSR tap positions (array of bit indices)', recommended: 'e.g. [8,6,5,4]' },
  key:             { desc: 'AES key buffer',                       recommended: '32-byte hex string' },
  counter:         { desc: 'AES CTR counter buffer',               recommended: '16-byte hex string' },
  a:               { desc: 'Prime-modulo param a',                  recommended: 'random integer' },
  b:               { desc: 'Prime-modulo param b',                  recommended: 'random integer' },
  p:               { desc: 'Prime-modulo prime',                    recommended: 'large prime, e.g. 101' },
  passphrase:      { desc: 'PBKDF2 passphrase',                     recommended: 'strong secret' },
  salt:            { desc: 'PBKDF2 salt',                           recommended: 'random string' },
  privateKey:      { desc: 'ECDH private key (Buffer)',             recommended: '32-byte hex' },
  peerPublicKey:   { desc: 'ECDH peer public key (Buffer)',         recommended: 'hex string' },
  deviceId:        { desc: 'Device identifier (MAC, UUID)',        recommended: 'e.g. "device-1234"' }
};

export default function CreateConfiguration() {
  const [gmks, setGmks]           = useState([]);
  const [fhfs, setFhfs]           = useState([]);
  const [selGmk, setSelGmk]       = useState('');
  const [selFhf, setSelFhf]       = useState('');
  const [gmkParams, setGmkParams] = useState({});
  const [fhfParams, setFhfParams] = useState({});
  const [interval, setInterval]   = useState('');
  const [result, setResult]       = useState(null);

  // Load available functions
  useEffect(() => {
    fetch('/api/functions?type=GMK').then(r=>r.json()).then(setGmks).catch(console.error);
    fetch('/api/functions?type=FHF').then(r=>r.json()).then(setFhfs).catch(console.error);
  }, []);

  const selectedGmk = gmks.find(f=>f.name===selGmk);
  const selectedFhf = fhfs.find(f=>f.name===selFhf);

  // handle param changes
  const onParamChange = (which, name, value) => {
    const setter = which==='gmk' ? setGmkParams : setFhfParams;
    setter(prev=>({ ...prev, [name]: value }));
  };

  // submit configuration
  const handleCreate = async () => {
    if (!selGmk||!selFhf||!interval) return alert('Select both functions and enter interval');
    try {
      const res = await fetch('/api/config',{
        method: 'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          gmkFunction: selGmk,
          gmkParams,
          fhfFunction: selFhf,
          fhfParams,        // does NOT include legalChannels
          fhfInterval: +interval
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResult(data);
    } catch(e) {
      console.error(e);
      alert('Failed to create: '+e.message);
    }
  };

  return (
    <div>
      <Navbar/>
      <header className={styles.header}><h1>Create Configuration</h1></header>
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.formContainer}>

            {/* GMK Selection */}
            <div className={styles.formGroup}>
              <label>GMK Function</label>
              <select value={selGmk} onChange={e=>{
                setSelGmk(e.target.value);
                setGmkParams({});
              }}>
                <option value="">— select GMK —</option>
                {gmks.map(fn=>(
                  <option key={fn.name} value={fn.name}>{fn.name}</option>
                ))}
              </select>
            </div>
            {selectedGmk && (
              <div style={{margin:'1rem 0', padding:'1rem', background:'#f1f1f1', borderRadius:'4px'}}>
                <h4>{selectedGmk.name}</h4>
                <p><em>{selectedGmk.description}</em></p>
                <pre style={{
                  whiteSpace:'pre-wrap', background:'#fff',
                  padding:'0.5rem', borderRadius:'4px', maxHeight:'120px', overflow:'auto'
                }}>{selectedGmk.implementation}</pre>
                {selectedGmk.parameters.map(p=>(
                  <div key={p.name} className={styles.formGroup}>
                    <label>{p.name} ({p.type})</label>
                    <small style={{display:'block', color:'#555'}}>
                      {PARAM_INFO[p.name]?.desc}<br/>
                      <strong>Recommended:</strong> {PARAM_INFO[p.name]?.recommended}
                    </small>
                    <input
                      type={p.type==='number'?'number':'text'}
                      value={gmkParams[p.name]||''}
                      onChange={e=>onParamChange('gmk', p.name,
                        p.type==='number'? +e.target.value : e.target.value
                      )}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* FHF Selection */}
            <div className={styles.formGroup}>
              <label>FHF Function</label>
              <select value={selFhf} onChange={e=>{
                setSelFhf(e.target.value);
                setFhfParams({});
              }}>
                <option value="">— select FHF —</option>
                {fhfs.map(fn=>(
                  <option key={fn.name} value={fn.name}>{fn.name}</option>
                ))}
              </select>
            </div>
            {selectedFhf && (
              <div style={{margin:'1rem 0', padding:'1rem', background:'#f1f1f1', borderRadius:'4px'}}>
                <h4>{selectedFhf.name}</h4>
                <p><em>{selectedFhf.description}</em></p>
                <pre style={{
                  whiteSpace:'pre-wrap', background:'#fff',
                  padding:'0.5rem', borderRadius:'4px', maxHeight:'120px', overflow:'auto'
                }}>{selectedFhf.implementation}</pre>

                {/* Render all params except legalChannels */}
                {selectedFhf.parameters
                    .filter(p=>p.name!=='legalChannels')
                    .map(p=>(
                  <div key={p.name} className={styles.formGroup}>
                    <label>{p.name} ({p.type})</label>
                    <small style={{display:'block', color:'#555'}}>
                      {PARAM_INFO[p.name]?.desc}<br/>
                      <strong>Recommended:</strong> {PARAM_INFO[p.name]?.recommended}
                    </small>
                    <input
                      type={p.type==='number'?'number':'text'}
                      value={fhfParams[p.name]||''}
                      onChange={e=>onParamChange('fhf', p.name,
                        p.type==='number'? +e.target.value : e.target.value
                      )}
                    />
                  </div>
                ))}

                {/* Show legal channels as read-only */}
                <div className={styles.formGroup}>
                  <label>Legal Channels (MHz)</label>
                  <small style={{display:'block', color:'#555'}}>
                    These channels are pre-approved for use in Israel.
                  </small>
                  <pre style={{
                    whiteSpace:'pre-wrap', background:'#fff',
                    padding:'0.5rem', borderRadius:'4px', maxHeight:'100px', overflow:'auto'
                  }}>{LEGAL_CHANNELS.join(', ')}</pre>
                </div>
              </div>
            )}

            {/* FHF Interval */}
            <div className={styles.formGroup}>
              <label>FHF Interval (ms)</label>
              <input
                type="number"
                value={interval}
                onChange={e=>setInterval(e.target.value)}
                placeholder="e.g. 1000"
              />
            </div>

            {/* Submit */}
            <button className={styles.createBtn} onClick={handleCreate}>
              Create
            </button>

            {/* Result */}
            {result && (
              <div style={{
                marginTop:'1.5rem', padding:'1rem',
                border:'1px solid #ccc', borderRadius:'4px', background:'#f9f9f9'
              }}>
                <h3>Configuration Created</h3>
                <p><strong>ID:</strong> {result.configId}</p>
                <p><strong>GMK Function:</strong> {result.gmkFunction}</p>
                <p><strong>GMK Params:</strong> {JSON.stringify(result.gmkParams)}</p>
                <p><strong>FHF Function:</strong> {result.fhfFunction}</p>
                <p><strong>FHF Params:</strong> {JSON.stringify(result.fhfParams)}</p>
                <p><strong>Interval:</strong> {result.fhfInterval} ms</p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
