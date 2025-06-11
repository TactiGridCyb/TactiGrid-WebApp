// app/config/page.js

'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar.js';
import styles from '../styles/pagesDesign/CreateConfiguration.module.css';

// 1) Allowed channels: three bands in 0.1 MHz steps
export const LEGAL_CHANNELS = [
  ...Array.from({ length: 10 }, (_, i) => Number((433 + i * 0.1).toFixed(1))),
  ...Array.from({ length: 10 }, (_, i) => Number((868 + i * 0.1).toFixed(1))),
  ...Array.from({ length: 10 }, (_, i) => Number((915 + i * 0.1).toFixed(1))),
];

// 2) Parameter metadata & defaults
export const PARAM_INFO = {
  seed:           { desc: 'PRNG seed string',                          default: 'shared_sync_key_123' },
  baseFreq:       { desc: 'Starting frequency (MHz)',                  default: 433.0 },
  stepSize:       { desc: 'Hop size between frequencies (MHz)',         default: 0.1 },
  count:          { desc: 'Number of channels to generate',             default: LEGAL_CHANNELS.length },
  register:       { desc: 'Initial LFSR register state (0–255)',        default: 85 },
  taps:           { desc: 'LFSR tap bit positions (array)',            default: [8, 6, 5, 4] },
  key:            { desc: 'AES key (hex string, 16 bytes)',             default: '0123456789abcdef0123456789abcdef' },
  counter:        { desc: 'AES CTR counter (hex string, 16 bytes)',      default: 'abcdef0123456789abcdef0123456789' },
  a:              { desc: 'Prime-modulo parameter a (integer)',         default: 3 },
  b:              { desc: 'Prime-modulo parameter b (integer)',         default: 7 },
  p:              { desc: 'Prime-modulo prime p (integer)',             default: 101 },
  passphrase:     { desc: 'PBKDF2 passphrase (string)',                 default: 'strong_secret' },
  salt:           { desc: 'PBKDF2 salt (string)',                       default: 'random_salt' },
  privateKey:     { desc: 'ECDH private key (hex, 32 bytes)',           default: 'd1b4692830dbfae6db7637d003d40d810ff0e1ad223e5279f54d8a840182480f' },
  peerPublicKey:  { desc: 'ECDH peer public key (hex)',                  default: '04d14eac69c14c8ba071a9bdcf4b8f93c7d1315ac31ce3b57e84c7dbe9a441758c0a11850f2c7901d443c2d7dd107f90d531ea24e05bbccecd34191e0a302595ab' },
  deviceId:       { desc: 'Device identifier (MAC/UUID)',               default: 'device-1234' },
  legalChannels:  { desc: 'Allowed frequencies (MHz)',                  default: LEGAL_CHANNELS.slice() },
};

export default function CreateConfiguration() {
  const [gmks, setGmks]               = useState([]);
  const [fhfs, setFhfs]               = useState([]);
  const [selGmk, setSelGmk]           = useState('');
  const [selFhf, setSelFhf]           = useState('');
  const [gmkParams, setGmkParams]     = useState({});
  const [fhfParams, setFhfParams]     = useState({});
  const [fhfInterval, setFhfInterval] = useState(1000);
  const [result, setResult]           = useState(null);

  // Load function definitions
  useEffect(() => {
    (async () => {
      try {
        const all = await fetch('/api/functions').then(r => r.json());
        setGmks(all.filter(f => f.type === 'GMK'));
        setFhfs(all.filter(f => f.type === 'FHF'));
      } catch (e) {
        console.error('Failed to load functions', e);
      }
    })();
  }, []);

  const selectedGmk = gmks.find(f => f.name === selGmk);
  const selectedFhf = fhfs.find(f => f.name === selFhf);

  // Reset GMK params on selection
  useEffect(() => {
    if (!selectedGmk) return setGmkParams({});
    if (selectedGmk.name === 'gmkEcdh') {
      setGmkParams({
        privateKey:    PARAM_INFO.privateKey.default,
        peerPublicKey: PARAM_INFO.peerPublicKey.default,
      });
      return;
    }
    const defs = {};
    selectedGmk.parameters.forEach(p => {
      defs[p.name] = p.type === 'array<number>' 
        ? [...PARAM_INFO[p.name].default]
        : PARAM_INFO[p.name].default;
    });
    setGmkParams(defs);
  }, [selectedGmk]);

  // Reset FHF params on selection
  useEffect(() => {
    if (!selectedFhf) return setFhfParams({});
    const defs = {};
    selectedFhf.parameters.forEach(p => {
      if (p.name === 'legalChannels') defs[p.name] = [...LEGAL_CHANNELS];
      else if (p.name === 'count') defs[p.name] = PARAM_INFO.count.default;
      else defs[p.name] = PARAM_INFO[p.name].default;
    });
    setFhfParams(defs);
  }, [selectedFhf]);

  // Handle parameter change
  const onParamChange = (which, name, val, type) => {
    let v = val;
    if (type === 'number') v = Number(val);
    if (type === 'array<number>') v = val.split(',').map(s => Number(s.trim()));
    which === 'gmk'
      ? setGmkParams(prev => ({ ...prev, [name]: v }))
      : setFhfParams(prev => ({ ...prev, [name]: v }));
  };

  // Submit configuration
  const handleCreate = async () => {
    if (!selGmk || !selFhf) {
      alert('Please select both GMK and FHF functions');
      return;
    }
    const payload = {
      gmkFunction: selGmk,
      gmkParams,
      fhfFunction: selFhf,
      fhfParams,
      fhfInterval: Number(fhfInterval),
    };
    try {
      const res = await fetch('/api/config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setResult(data);
    } catch (e) {
      console.error(e);
      alert('Error creating configuration: ' + e.message);
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

            {/* GMK selection */}
            <div className={styles.formGroup}>
              <label>Select GMK Function</label>
              <select
                value={selGmk}
                onChange={e => { setSelGmk(e.target.value); setResult(null); }}
              >
                <option value="">— choose GMK —</option>
                {gmks.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
              </select>
            </div>

            {/* GMK parameters */}
            {selectedGmk && (
              <div className={styles.paramContainer}>
                <h3>{selectedGmk.name} Parameters</h3>
                <p className={styles.description}>{selectedGmk.description}</p>
                {selectedGmk.parameters.map(p => (
                  <div key={p.name} className={styles.formGroup}>
                    <label>{p.name} ({p.type})</label>
                    <input
                      type={p.type==='number' ? 'number' : 'text'}
                      value={p.type==='array<number>'
                        ? (gmkParams[p.name]||[]).join(',')
                        : gmkParams[p.name]||''}
                      onChange={e=>onParamChange('gmk',p.name,e.target.value,p.type)}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* FHF selection */}
            <div className={styles.formGroup}>
              <label>Select FHF Function</label>
              <select
                value={selFhf}
                onChange={e => { setSelFhf(e.target.value); setResult(null); }}
              >
                <option value="">— choose FHF —</option>
                {fhfs.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
              </select>
            </div>

            {/* FHF parameters */}
            {selectedFhf && (
              <div className={styles.paramContainer}>
                <h3>{selectedFhf.name} Parameters</h3>
                <p className={styles.description}>{selectedFhf.description}</p>
                {selectedFhf.parameters.map(p => p.name==='legalChannels' ? (
                  <div key={p.name} className={styles.formGroup}>
                    <label>legalChannels (MHz)</label>
                    <select
                      multiple
                      value={fhfParams.legalChannels||[]}
                      onChange={e=>onParamChange(
                        'fhf',
                        'legalChannels',
                        Array.from(e.target.selectedOptions, o=>Number(o.value)),
                        'array<number>'
                      )}
                    >
                      {LEGAL_CHANNELS.map(ch => (
                        <option key={ch} value={ch}>{ch.toFixed(1)}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div key={p.name} className={styles.formGroup}>
                    <label>{p.name} ({p.type})</label>
                    <input
                      type={p.type==='number' ? 'number' : 'text'}
                      value={p.type==='array<number>'
                        ? (fhfParams[p.name]||[]).join(',')
                        : fhfParams[p.name]||''}
                      onChange={e=>onParamChange('fhf',p.name,e.target.value,p.type)}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* FHF interval */}
            <div className={styles.formGroup}>
              <label>FHF Interval (ms)</label>
              <input
                type="number"
                value={fhfInterval}
                onChange={e=>setFhfInterval(e.target.value)}
              />
            </div>

            {/* Submit */}
            <button className={styles.createBtn} onClick={handleCreate}>
              Create Configuration
            </button>

            {/* Result */}
            {result && (
              <div className={styles.result}>
                <p>Created ID: <strong>{result.configId}</strong></p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
