'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar.jsx';
import styles from '../styles/pagesDesign/CreateConfiguration.module.css';


export const LEGAL_CHANNELS = [
  ...Array.from({ length: 10 }, (_, i) => Number((433 + i * 0.1).toFixed(1))),
  ...Array.from({ length: 110 }, (_, i) => Number((868 + i * 0.1).toFixed(1))),
];


export const PARAM_INFO = {
  seed: { desc: 'PRNG seed string shared between devices', default: 'shared_sync_key_123' },
  baseFreq: { desc: 'Starting frequency (MHz). Must be in the allowed range.', default: 433.0 },
  stepSize: { desc: 'Hop size between successive frequencies (MHz). Example: 0.1', default: 0.1 },
  count: { desc: 'Number of frequencies to generate (default = all legal channels).', default: LEGAL_CHANNELS.length },
  register: { desc: 'Initial LFSR register state (0–255).', default: 85 },
  taps: { desc: 'LFSR tap bit positions (array of numbers). Enter comma-separated values, e.g., "8,6,5,4".', default: [8, 6, 5, 4] },
  key: { desc: 'AES key buffer (hex string, 16 bytes).', default: '0123456789abcdef0123456789abcdef' },
  counter: { desc: 'AES CTR counter buffer (hex string, 16 bytes).', default: 'abcdef0123456789abcdef0123456789' },
  a: { desc: 'Prime-modulo parameter a (integer).', default: 3 },
  b: { desc: 'Prime-modulo parameter b (integer).', default: 7 },
  p: { desc: 'Prime-modulo prime (large integer).', default: 101 },
  passphrase: { desc: 'PBKDF2 passphrase (string).', default: 'strong_secret' },
  salt: { desc: 'PBKDF2 salt (string).', default: 'random_salt' },
  privateKey: { desc: 'ECDH private key (hex string, 32 bytes).', default: 'd1b4692830dbfae6db7637d003d40d810ff0e1ad223e5279f54d8a840182480f' },
  peerPublicKey: {
    desc: 'ECDH peer public key (hex string).',
    default:
      '04d14eac69c14c8ba071a9bdcf4b8f93c7d1315ac31ce3b57e84c7dbe9a441758c0a11850f2c7901d443c2d7dd107f90d531ea24e05bbccecd34191e0a302595ab',
  },
  deviceId: { desc: 'Device identifier (MAC/UUID).', default: 'device-1234' },
  legalChannels: { desc: 'Select one or more allowed frequencies (MHz).', default: LEGAL_CHANNELS.slice() },
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
  const [creating, setCreating]   = useState(false);

  
  useEffect(() => {
    fetch('/api/functions?type=GMK').then(r => r.json()).then(setGmks).catch(console.error);
    fetch('/api/functions?type=FHF').then(r => r.json()).then(setFhfs).catch(console.error);
  }, []);

  const selectedGmk = gmks.find(fn => fn.name === selGmk);
  const selectedFhf = fhfs.find(fn => fn.name === selFhf);


  useEffect(() => {
    if (!selectedGmk) { setGmkParams({}); return; }
    if (selectedGmk.name === 'gmkEcdh') {
      setGmkParams({ privateKey: PARAM_INFO.privateKey.default, peerPublicKey: PARAM_INFO.peerPublicKey.default });
      return;
    }
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


  useEffect(() => {
    if (!selectedFhf) { setFhfParams({}); return; }
    const defaults = {};
    selectedFhf.parameters.forEach(p => {
      if (p.name === 'legalChannels') {
        defaults.legalChannels = PARAM_INFO.legalChannels.default.slice();
      } else if (p.name === 'count') {
        defaults.count = PARAM_INFO.count.default;
      } else if (p.type === 'array<number>') {
        defaults[p.name] = Array.isArray(PARAM_INFO[p.name]?.default) ? PARAM_INFO[p.name].default.slice() : [];
      } else if (p.type === 'number') {
        defaults[p.name] = typeof PARAM_INFO[p.name]?.default === 'number' ? PARAM_INFO[p.name].default : 0;
      } else {
        defaults[p.name] = PARAM_INFO[p.name]?.default ?? '';
      }
    });
    setFhfParams(defaults);
  }, [selectedFhf]);


  const onParamChange = (which, name, value, type) => {
    if (type === 'array<number>') {
      const arr = Array.isArray(value)
        ? value
        : value.split(',').map(x => x.trim()).filter(Boolean).map(Number);
      which === 'gmk'
        ? setGmkParams(prev => ({ ...prev, [name]: arr }))
        : setFhfParams(prev => ({ ...prev, [name]: arr }));
    } else {
      which === 'gmk'
        ? setGmkParams(prev => ({ ...prev, [name]: value }))
        : setFhfParams(prev => ({ ...prev, [name]: value }));
    }
  };


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
      setCreating(true);
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setResult(data);
    } catch (err) {
      console.error(err);
      alert('Failed to create configuration: ' + (err.message || err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.title}>Create Configuration</h1>
          <p className={styles.subtitle}>Compose cryptographic seeds and frequency hopping plans in a clean, guided interface.</p>
        </div>
      </header>

      <main className={styles.main}>
        {/* selectors row */}
        <section className={styles.selectRow}>
          <div className={styles.selectCard}>
            <label className={styles.label}>GMK Generation Function</label>
            <select
              className={styles.input}
              value={selGmk}
              onChange={(e) => { setSelGmk(e.target.value); setResult(null); }}
            >
              <option value="">— select GMK —</option>
              {gmks.map(fn => <option key={fn.name} value={fn.name}>{fn.name}</option>)}
            </select>
          </div>

          <div className={styles.selectCard}>
            <label className={styles.label}>Frequency Hopping Function</label>
            <select
              className={styles.input}
              value={selFhf}
              onChange={(e) => { setSelFhf(e.target.value); setResult(null); }}
            >
              <option value="">— select FHF —</option>
              {fhfs.map(fn => <option key={fn.name} value={fn.name}>{fn.name}</option>)}
            </select>
          </div>

          <div className={styles.selectCard}>
            <label className={styles.label}>FHF Interval (ms)</label>
            <input
              className={styles.input}
              type="number"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              placeholder="e.g. 1000"
              min={1}
            />
          </div>
        </section>

        {/* details + params */}
        <section className={styles.grid}>
          {/* GMK column */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>GMK</h2>
              {selectedGmk && (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => {
                    
                    setSelGmk(selGmk); 
                    const ev = new Event('noop'); 
                  }}
                >
                  Reset defaults
                </button>
              )}
            </div>

            {!selectedGmk && <div className={styles.placeholder}>Pick a GMK function to see details and parameters.</div>}

            {selectedGmk && (
              <>
                <div className={styles.infoBox}>
                  <div className={styles.infoTitle}>{selectedGmk.name}</div>
                  <div className={styles.infoBody}>
                    <p>{selectedGmk.description}</p>
                  </div>
                </div>

                <div className={styles.codeBox}>
                  <pre className={styles.pre}>{selectedGmk.implementation}</pre>
                </div>

                <div className={styles.params}>
                  {selectedGmk.parameters.map((p) => (
                    <div key={p.name} className={styles.formGroup}>
                      <div className={styles.formRow}>
                        <label className={styles.label}>
                          {p.name} <span className={styles.typeTag}>{p.type}</span>
                        </label>
                        <span className={styles.help}>
                          {PARAM_INFO[p.name]?.desc || ''}
                          {PARAM_INFO[p.name]?.default !== undefined && (
                            <>
                              <br />
                              <strong>Default:</strong>{' '}
                              <span className={styles.monoSmall}>
                                {JSON.stringify(PARAM_INFO[p.name]?.default)}
                              </span>
                            </>
                          )}
                        </span>
                      </div>

                      {p.name === 'taps' || p.type === 'array<number>' ? (
                        <input
                          className={styles.input}
                          type="text"
                          value={(gmkParams[p.name] || []).join(',')}
                          onChange={(e) => onParamChange('gmk', p.name, e.target.value, 'array<number>')}
                          placeholder="e.g. 8,6,5,4"
                        />
                      ) : (
                        <input
                          className={styles.input}
                          type={p.type === 'number' ? 'number' : 'text'}
                          value={gmkParams[p.name] ?? ''}
                          onChange={(e) =>
                            onParamChange('gmk', p.name, p.type === 'number' ? Number(e.target.value) : e.target.value, p.type)
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* FHF column */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>FHF</h2>
              {selectedFhf && (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => {
                    setSelFhf(selFhf);
                  }}
                >
                  Reset defaults
                </button>
              )}
            </div>

            {!selectedFhf && <div className={styles.placeholder}>Pick a Frequency Hopping Function to see details and parameters.</div>}

            {selectedFhf && (
              <>
                <div className={styles.infoBox}>
                  <div className={styles.infoTitle}>{selectedFhf.name}</div>
                  <div className={styles.infoBody}>
                    <p>{selectedFhf.description}</p>
                  </div>
                </div>

                <div className={styles.codeBox}>
                  <pre className={styles.pre}>{selectedFhf.implementation}</pre>
                </div>

                <div className={styles.params}>
                  {selectedFhf.parameters.map((p) => {
                    if (p.name === 'legalChannels') {
                      return (
                        <div key="legalChannels" className={styles.formGroup}>
                          <div className={styles.formRow}>
                            <label className={styles.label}>
                              legalChannels <span className={styles.typeTag}>array&lt;number&gt;</span>
                            </label>
                            <span className={styles.help}>
                              {PARAM_INFO.legalChannels.desc}
                            </span>
                          </div>

                          <select
                            className={`${styles.input} ${styles.multiselect}`}
                            multiple
                            value={fhfParams.legalChannels || []}
                            onChange={(e) => {
                              const selectedOptions = Array.from(e.target.selectedOptions, opt => Number(opt.value));
                              onParamChange('fhf', 'legalChannels', selectedOptions, 'array<number>');
                            }}
                            size={10}
                          >
                            {LEGAL_CHANNELS.map((ch) => (
                              <option key={ch} value={ch}>{ch.toFixed(1)} MHz</option>
                            ))}
                          </select>
                          <div className={styles.hint}>
                            Hold <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> to select multiple.
                          </div>
                        </div>
                      );
                    }

                    const isArrayNumber = p.type === 'array<number>';
                    return (
                      <div key={p.name} className={styles.formGroup}>
                        <div className={styles.formRow}>
                          <label className={styles.label}>
                            {p.name} <span className={styles.typeTag}>{p.type}</span>
                          </label>
                          <span className={styles.help}>
                            {PARAM_INFO[p.name]?.desc}
                            {PARAM_INFO[p.name]?.default !== undefined && (
                              <>
                                <br />
                                <strong>Default:</strong>{' '}
                                <span className={styles.monoSmall}>{JSON.stringify(PARAM_INFO[p.name]?.default)}</span>
                              </>
                            )}
                          </span>
                        </div>

                        {isArrayNumber ? (
                          <input
                            className={styles.input}
                            type="text"
                            value={(fhfParams[p.name] || []).join(',')}
                            onChange={(e) => onParamChange('fhf', p.name, e.target.value, 'array<number>')}
                            placeholder="e.g. 1,2,3"
                          />
                        ) : (
                          <input
                            className={styles.input}
                            type={p.type === 'number' ? 'number' : 'text'}
                            value={fhfParams[p.name] ?? ''}
                            onChange={(e) =>
                              onParamChange('fhf', p.name, p.type === 'number' ? Number(e.target.value) : e.target.value, p.type)
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Action + Result */}
        <section className={styles.footerRow}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : 'Create'}
          </button>

          {result && (
            <div className={`${styles.card} ${styles.resultCard}`}>
              <h3 className={styles.resultTitle}>Configuration Created</h3>
              <div className={styles.resultGrid}>
                <div><strong>ID:</strong> {result.configId}</div>
                <div><strong>GMK Function:</strong> {result.gmkFunction}</div>
                <div className={styles.monoSmall}><strong>GMK Params:</strong> {JSON.stringify(result.gmkParams)}</div>
                <div><strong>FHF Function:</strong> {result.fhfFunction}</div>
                <div className={styles.monoSmall}><strong>FHF Params:</strong> {JSON.stringify(result.fhfParams)}</div>
                <div><strong>Interval:</strong> {result.fhfInterval} ms</div>
                <div><strong>Created At:</strong> {new Date(result.createdAt).toLocaleString()}</div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
