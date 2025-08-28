'use client';
// app/components/ProvisionFlow.jsx

import { useEffect, useState } from 'react';
import styles from '../styles/componentsDesign/ProvisionFlow.module.css';

export default function ProvisionFlow({
  missionId, soldiers = [], commanders = [],
  defaultHost = '0.0.0.0', defaultPort = 8743, defaultForce = true
}) {
  const queue = [...commanders, ...soldiers].map(String);

  const [done,      setDone]      = useState([]);
  const [starting,  setStarting]  = useState(false);
  const [started,   setStarted]   = useState(false);
  const [stopping,  setStopping]  = useState(false);
  const [names,     setNames]     = useState({});
  const [errorMsg,  setErrorMsg]  = useState('');
  const [host, setHost]   = useState(defaultHost);
  const [port, setPort]   = useState(defaultPort);
  const [force, setForce] = useState(defaultForce);

  // Pretty names
  useEffect(() => {
    if (!queue.length) return;
    (async (idList = []) => {
      try {
        const res = await fetch('/api/soldiers/names', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: idList }),
        });
        const { map } = await res.json();
        const labelMap = Object.fromEntries(
          idList.map(id => {
            const info = map?.[id];
            if (!info) return [id, id];
            return [id, info.role === 'Commander' ? `${info.fullName} - Commander` : info.fullName];
          })
        );
        setNames(labelMap);
      } catch { setErrorMsg('Failed loading names'); }
    })(queue);
  }, [JSON.stringify(queue)]);

  // SSE progress
  useEffect(() => {
    const es = new EventSource(`/api/provision/stream?missionId=${missionId}`);
    es.onmessage = e => {
      try {
        const { subjectId } = JSON.parse(e.data);
        if (subjectId) setDone(d => [...new Set([...d, String(subjectId)])]);
      } catch {}
    };
    return () => es.close();
  }, [missionId]);

  const nextId = queue.find(id => !done.includes(id));

  async function handleStart() {
    setStarting(true); setErrorMsg('');
    try {
      const res = await fetch('/api/provision/start', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ missionId, soldiers, commanders, host, port: Number(port), force }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || `HTTP ${res.status}`);
      }
      setStarted(true);
      setDone([]); // reset UI from previous run
    } catch (e) {
      setErrorMsg(e.message || 'Failed to start provisioning');
    } finally { setStarting(false); }
  }

  async function handleStop() {
    setStopping(true); setErrorMsg('');
    try {
      const res = await fetch('/api/provision/stop', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ missionId }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setStarted(false);
    } catch (e) {
      setErrorMsg(e.message || 'Failed to end provisioning');
    } finally { setStopping(false); }
  }

  async function handleStopAll() {
    await fetch('/api/provision/stop-all', { method: 'POST' });
  }

  async function handleResend(subjectId) {
    try {
      await fetch('/api/provision/resend', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ missionId, subjectId }),
      });
    } catch (e) {
      setErrorMsg(`Failed to resend for ${subjectId}`);
    }
  }

  return (
    <div className={styles.flow}>

      {/* controller strip */}
      <div className={styles.controller}>
        <div className={styles.row}>
          <label className={styles.inputGroup}>
            <span>Host</span>
            <input value={host} onChange={e => setHost(e.target.value)} placeholder="0.0.0.0" />
          </label>
          <label className={styles.inputGroup}>
            <span>Port</span>
            <input value={port} onChange={e => setPort(e.target.value)} inputMode="numeric" />
          </label>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} />
            <span>Force takeover</span>
          </label>
        </div>

        <div className={styles.row}>
          <button onClick={handleStart} disabled={starting || started} className={styles.startBtn}>
            {starting ? 'Starting…' : 'Start provisioning'}
          </button>
          <button onClick={handleStop} disabled={!started || stopping} className={styles.stopBtn}>
            {stopping ? 'Stopping…' : 'End provisioning'}
          </button>
          <button onClick={handleStopAll} className={styles.killBtn} title="Stop every mission session">
            Stop all
          </button>
        </div>

        {errorMsg && <p className={styles.error}>{errorMsg}</p>}
      </div>

      {/* banner */}
      {started && nextId ? (
        <h2 className={styles.banner}>
          Please connect&nbsp;
          <span className={styles.highlight}>{names[nextId] ?? nextId}</span>
        </h2>
      ) : started && done.length === queue.length ? (
        <h2 className={styles.done}>✓ All devices provisioned</h2>
      ) : null}

      {/* list */}
      <ul className={styles.list}>
        {queue.map(id => {
          const finished = done.includes(id);
          return (
            <li key={id} className={finished ? styles.ok : ''}>
              <span>{names[id] ?? 'loading…'}</span>
              {finished && <span>&nbsp;✔︎</span>}
              <button onClick={() => handleResend(id)} className={styles.resendBtn}>Resend</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
