// app/config/page.js

'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar.js';
import styles from '../styles/pagesDesign/CreateConfiguration.module.css';

// 1) Generate allowed channels as floats with 0.1 MHz steps:
//    • 433.0 ≤ f < 434.0  → [433.0, 433.1, …, 433.9]
//    • 868.0 ≤ f < 879.0  → [868.0, 868.1, …, 878.9]
export const LEGAL_CHANNELS = [
  ...Array.from({ length: 10 }, (_, i) => Number((433 + i * 0.1).toFixed(1))),
  ...Array.from({ length: 110 }, (_, i) => Number((868 + i * 0.1).toFixed(1))),
];

// 2) Parameter metadata with descriptions & new defaults:
export const PARAM_INFO = {
  seed: {
    desc:    'PRNG seed string shared between devices',
    default: 'shared_sync_key_123',
  },
  baseFreq: {
    desc:    'Starting frequency (MHz). Must be in the allowed range.',
    default: 433.0,
  },
  stepSize: {
    desc:    'Hop size between successive frequencies (MHz). Example: 0.1',
    default: 0.1,
  },
  count: {
    desc:    'Number of frequencies to generate (default = all legal channels).',
    default: LEGAL_CHANNELS.length,
  },
  register: {
    desc:    'Initial LFSR register state (0–255).',
    default: 85,
  },
  taps: {
    desc:    'LFSR tap bit positions (array of numbers). Enter comma-separated values, e.g., "8,6,5,4".',
    default: [8, 6, 5, 4],
  },
  key: {
    desc:    'AES key buffer (hex string, 16 bytes).',
    default: '0123456789abcdef0123456789abcdef',
  },
  counter: {
    desc:    'AES CTR counter buffer (hex string, 16 bytes).',
    default: 'abcdef0123456789abcdef0123456789',
  },
  a: {
    desc:    'Prime-modulo parameter a (integer).',
    default: 3,
  },
  b: {
    desc:    'Prime-modulo parameter b (integer).',
    default: 7,
  },
  p: {
    desc:    'Prime-modulo prime (large integer).',
    default: 101,
  },
  passphrase: {
    desc:    'PBKDF2 passphrase (string).',
    default: 'strong_secret',
  },
  salt: {
    desc:    'PBKDF2 salt (string).',
    default: 'random_salt',
  },
  privateKey: {
    desc:    'ECDH private key (hex string, 32 bytes).',
    default: 'd1b4692830dbfae6db7637d003d40d810ff0e1ad223e5279f54d8a840182480f',
  },
  peerPublicKey: {
    desc:    'ECDH peer public key (hex string).',
    default:
      '04d14eac69c14c8ba071a9bdcf4b8f93c7d1315ac31ce3b57e84c7dbe9a441758c0a11850f2c7901d443c2d7dd107f90d531ea24e05bbccecd34191e0a302595ab',
  },
  deviceId: {
    desc:    'Device identifier (MAC/UUID).',
    default: 'device-1234',
  },
  legalChannels: {
    desc:    'Select one or more allowed frequencies (MHz).',
    default:   LEGAL_CHANNELS.slice(),
  },
};

export default function CreateConfiguration() {
  const [gmks, setGmks]           = useState([]);
  const [fhfs, setFhfs]           = useState([]);
  const [selGmk, setSelGmk]       = useState('');
  const [selFhf, setSelFhf]       = useState('');
  const [gmkParams, setGmkParams] = useState({});
  const [fhfParams, setFhfParams] = useState({});
  const [interval, setInterval]   = useState(1000);
  const [result, setResult]       = useState(null);

  // 3) Load GMK & FHF definitions from the API
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

  const selectedGmk = gmks.find(fn => fn.name === selGmk);
  const selectedFhf = fhfs.find(fn => fn.name === selFhf);

  // 4) Reset GMK params to defaults when a new GMK is selected
  useEffect(() => {
    if (!selectedGmk) {
      setGmkParams({});
      return;
    }

    // If the selected GMK is gmkEcdh, preload the provided ECDH defaults:
    if (selectedGmk.name === 'gmkEcdh') {
      setGmkParams({
        privateKey:    PARAM_INFO.privateKey.default,
        peerPublicKey: PARAM_INFO.peerPublicKey.default,
      });
      return;
    }

    // Otherwise, for each required param, use the PARAM_INFO default if available
    const defaults = {};
    selectedGmk.parameters.forEach(p => {
      const info = PARAM_INFO[p.name];
      if (p.type === 'number') {
        defaults[p.name] = typeof info?.default === 'number' ? info.default : 0;
      } else if (p.type === 'array<number>') {
        defaults[p.name] = Array.isArray(info?.default) ? info.default.slice() : [];
      } else {
        defaults[p.name] = info?.default !== undefined ? info.default : '';
      }
    });
    setGmkParams(defaults);
  }, [selectedGmk]);

  // 5) Reset FHF params to defaults when a new FHF is selected
  useEffect(() => {
    if (!selectedFhf) {
      setFhfParams({});
      return;
    }
    const defaults = {};
    selectedFhf.parameters.forEach(p => {
      if (p.name === 'legalChannels') {
        defaults.legalChannels = PARAM_INFO.legalChannels.default.slice();
      } else if (p.name === 'count') {
        defaults.count = PARAM_INFO.count.default;
      } else if (p.type === 'array<number>') {
        defaults[p.name] = Array.isArray(PARAM_INFO[p.name]?.default)
          ? PARAM_INFO[p.name].default.slice()
          : [];
      } else if (p.type === 'number') {
        defaults[p.name] = typeof PARAM_INFO[p.name]?.default === 'number'
          ? PARAM_INFO[p.name].default
          : 0;
      } else {
        defaults[p.name] = PARAM_INFO[p.name]?.default ?? '';
      }
    });
    setFhfParams(defaults);
  }, [selectedFhf]);

  // 6) Handle input changes for GMK / FHF parameters
  const onParamChange = (which, name, value, type) => {
    if (type === 'array<number>') {
      // Parse comma-separated string into array of numbers
      const arr = value
        .split(',')
        .map(x => x.trim())
        .filter(x => x !== '')
        .map(x => Number(x));
      if (which === 'gmk') {
        setGmkParams(prev => ({ ...prev, [name]: arr }));
      } else {
        setFhfParams(prev => ({ ...prev, [name]: arr }));
      }
    } else {
      if (which === 'gmk') {
        setGmkParams(prev => ({ ...prev, [name]: value }));
      } else {
        setFhfParams(prev => ({ ...prev, [name]: value }));
      }
    }
  };

  // 7) Submit to /api/config
  const handleCreate = async () => {
    if (!selGmk || !selFhf || !interval) {
      return alert('Please select GMK, FHF functions, and enter interval.');
    }

    const payload = {
      gmkFunction: selGmk,
      gmkParams,
      fhfFunction: selFhf,
      fhfParams,
      fhfInterval: Number(interval),
    };

    try {
      const res = await fetch('/api/config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unknown error');
      }
      setResult(data);
    } catch (err) {
      console.error(err);
      alert('Failed to create configuration: ' + (err.message || err));
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

            {/* GMK Generation Function */}
            <div className={styles.formGroup}>
              <label>GMK Generation Function</label>
              <select
                value={selGmk}
                onChange={e => {
                  setSelGmk(e.target.value);
                  setResult(null);
                }}
              >
                <option value="">— select GMK —</option>
                {gmks.map(fn => (
                  <option key={fn.name} value={fn.name}>
                    {fn.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedGmk && (
              <div
                style={{
                  margin: '1rem 0',
                  padding: '1rem',
                  background: '#f1f1f1',
                  borderRadius: '4px',
                }}
              >
                <h4>{selectedGmk.name}</h4>

                {/* Description box */}
                <div
                  style={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    padding: '0.5rem',
                    background: '#fff',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    lineHeight: '1.4',
                  }}
                >
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '1rem' }}>
                    {selectedGmk.description}
                  </p>
                </div>

                {/* Implementation box */}
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    background: '#fff',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    fontSize: '0.9rem',
                  }}
                >
                  {selectedGmk.implementation}
                </pre>

                {/* GMK Parameters */}
                {selectedGmk.parameters.map(p => (
                  <div key={p.name} className={styles.formGroup}>
                    <label>
                      {p.name} ({p.type})
                    </label>
                    <small style={{ display: 'block', color: '#555' }}>
                      {PARAM_INFO[p.name]?.desc}
                      <br />
                      <strong>Default:</strong>{' '}
                      <span
                        style={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxWidth: '100%',
                        }}
                      >
                        {JSON.stringify(PARAM_INFO[p.name]?.default)}
                      </span>
                    </small>
                    <input
                      type={p.type === 'number' ? 'number' : 'text'}
                      value={
                        p.type === 'array<number>'
                          ? (gmkParams[p.name] || []).join(',')
                          : gmkParams[p.name] ?? ''
                      }
                      onChange={e =>
                        onParamChange(
                          'gmk',
                          p.name,
                          p.type === 'number' ? Number(e.target.value) : e.target.value,
                          p.type
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Frequency Hopping Function */}
            <div className={styles.formGroup}>
              <label>Frequency Hopping Function</label>
              <select
                value={selFhf}
                onChange={e => {
                  setSelFhf(e.target.value);
                  setResult(null);
                }}
              >
                <option value="">— select FHF —</option>
                {fhfs.map(fn => (
                  <option key={fn.name} value={fn.name}>
                    {fn.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedFhf && (
              <div
                style={{
                  margin: '1rem 0',
                  padding: '1rem',
                  background: '#f1f1f1',
                  borderRadius: '4px',
                }}
              >
                <h4>{selectedFhf.name}</h4>

                {/* Description box */}
                <div
                  style={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    padding: '0.5rem',
                    background: '#fff',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    lineHeight: '1.4',
                  }}
                >
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '1rem' }}>
                    {selectedFhf.description}
                  </p>
                </div>

                {/* Implementation box */}
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    background: '#fff',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    fontSize: '0.9rem',
                  }}
                >
                  {selectedFhf.implementation}
                </pre>

                {/* FHF parameters (including editable legalChannels, count & taps) */}
                {selectedFhf.parameters.map(p => {
                  if (p.name === 'legalChannels') {
                    return (
                      <div key="legalChannels" className={styles.formGroup}>
                        <label>legalChannels (array of MHz floats)</label>
                        <small style={{ display: 'block', color: '#555' }}>
                          {PARAM_INFO.legalChannels.desc}
                          <br />
                          <strong>Default:</strong>{' '}
                          <span
                            style={{
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              maxWidth: '100%',
                            }}
                          >
                            {JSON.stringify(PARAM_INFO.legalChannels.default)}
                          </span>
                        </small>
                        <select
                          multiple
                          value={fhfParams.legalChannels || []}
                          onChange={e => {
                            const selectedOptions = Array.from(
                              e.target.selectedOptions,
                              opt => Number(opt.value)
                            );
                            onParamChange('fhf', 'legalChannels', selectedOptions, 'array<number>');
                          }}
                        >
                          {LEGAL_CHANNELS.map(ch => (
                            <option key={ch} value={ch}>
                              {ch.toFixed(1)} MHz
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  } else {
                    return (
                      <div key={p.name} className={styles.formGroup}>
                        <label>
                          {p.name} ({p.type})
                        </label>
                        <small style={{ display: 'block', color: '#555' }}>
                          {PARAM_INFO[p.name]?.desc}
                          <br />
                          <strong>Default:</strong>{' '}
                          <span
                            style={{
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              maxWidth: '100%',
                            }}
                          >
                            {JSON.stringify(PARAM_INFO[p.name]?.default)}
                          </span>
                        </small>
                        <input
                          type={p.type === 'number' ? 'number' : 'text'}
                          value={
                            p.type === 'array<number>'
                              ? (fhfParams[p.name] || []).join(',')
                              : fhfParams[p.name] ?? ''
                          }
                          onChange={e =>
                            onParamChange(
                              'fhf',
                              p.name,
                              p.type === 'number' ? Number(e.target.value) : e.target.value,
                              p.type
                            )
                          }
                        />
                      </div>
                    );
                  }
                })}
              </div>
            )}

            {/* FHF Interval */}
            <div className={styles.formGroup}>
              <label>FHF Interval (ms)</label>
              <input
                type="number"
                value={interval}
                onChange={e => setInterval(e.target.value)}
                placeholder="e.g. 1000"
              />
            </div>

            {/* Create Button */}
            <button className={styles.createBtn} onClick={handleCreate}>
              Create
            </button>

            {/* Result Display */}
            {result && (
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  background: '#f9f9f9',
                }}
              >
                <h3>Configuration Created</h3>
                <p>
                  <strong>ID:</strong> {result.configId}
                </p>
                <p>
                  <strong>GMK Function:</strong> {result.gmkFunction}
                </p>
                <p>
                  <strong>GMK Params:</strong> {JSON.stringify(result.gmkParams)}
                </p>
                <p>
                  <strong>FHF Function:</strong> {result.fhfFunction}
                </p>
                <p>
                  <strong>FHF Params:</strong> {JSON.stringify(result.fhfParams)}
                </p>
                <p>
                  <strong>Interval:</strong> {result.fhfInterval} ms
                </p>
                <p>
                  <strong>Created At:</strong>{' '}
                  {new Date(result.createdAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
