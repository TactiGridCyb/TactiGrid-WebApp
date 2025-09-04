'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from '../styles/componentsDesign/ProvisionFlow.module.css';

export default function ProvisionFlow({ missionId, soldiers, commanders }) {
  const queue = useMemo(() => [...commanders, ...soldiers].map(String), [commanders, soldiers]);

  const [done,     setDone]     = useState([]);   // IDs that already pinged
  const [starting, setStarting] = useState(false);
  const [status,   setStatus]   = useState('stopped'); // 'stopped' | 'starting' | 'up' | 'error'
  const [names,    setNames]    = useState({});
  const [err,      setErr]      = useState('');

  // Pretty names
  useEffect(() => {
    if (!queue.length) return;
    (async (ids) => {
      try {
        const res = await fetch('/api/soldiers/names', {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // ← ensure cookie rides along
          body   : JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error(`names fetch failed ${res.status}`);
        const { map } = await res.json();
        const m = Object.fromEntries(ids.map(id => {
          const info = map?.[id];
          if (!info) return [id, id];
          return [id, info.role === 'Commander' ? `${info.fullName} — Commander` : info.fullName];
        }));
        setNames(m);
      } catch (e) { setErr(e.message || 'Failed loading names'); }
    })(queue);
  }, [queue.join(',')]);

  // SSE progress
  useEffect(() => {
    const es = new EventSource(`/api/provision/stream?missionId=${missionId}`);
    es.onmessage = e => {
      try {
        const { subjectId } = JSON.parse(e.data);
        setDone(d => [...new Set([...d, String(subjectId)])]);
      } catch {}
    };
    es.onerror = () => {
      // Let EventSource handle retries; could set a UI hint if you want
    };
    return () => es.close();
  }, [missionId]);

  const progress = queue.length ? Math.round((done.length / queue.length) * 100) : 0;
  const nextId = queue.find(id => !done.includes(id));

  async function start() {
    setStarting(true);
    setErr('');
    setStatus('starting'); // 🔴 show "Starting up server…"
    try {
      const res = await fetch('/api/provision/start', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body   : JSON.stringify({ missionId, soldiers, commanders }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to start provisioning');
      setStatus('up');     // 🟢 server is up → you can connect
      setDone([]);         // fresh run
    } catch (e) {
      setStatus('error');
      setErr(e.message || 'Failed to start provisioning');
    } finally {
      setStarting(false);
    }
  }

  async function stop() {
    setErr('');
    await fetch('/api/provision/stop', { method: 'POST', credentials: 'include' }).catch(() => {});
    setStatus('stopped');
  }

  async function restart() {
    setErr('');
    setStatus('starting');
    const res = await fetch('/api/provision/restart', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body   : JSON.stringify({ missionId, soldiers, commanders }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus('up');
      setDone([]);
    } else {
      setStatus('error');
      setErr(data?.error || 'Failed to restart');
    }
  }

  // Resend: only if already done → remove checkmark and add back to queue (end)
  async function resend(subjectId) {
    subjectId = String(subjectId);
    if (!done.includes(subjectId)) return;           // no-op if not already sent
    setDone(d => d.filter(x => x !== subjectId));    // remove checkmark immediately (UX)
    try {
      const res = await fetch('/api/provision/resend', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body   : JSON.stringify({ missionId, subjectId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Resend failed');
      }
    } catch (e) {
      setErr(e.message || 'Resend failed');
    }
  }

  return (
    <div className={styles.wrap}>
      {/* Controller card */}
      <div className={styles.controller}>
        <div className={styles.rowTop}>
          <div className={styles.statusPill} data-state={status}>
            <span className={styles.dot} />
            {status === 'starting' && 'Starting up server…'}
            {status === 'up'       && 'Server is up — you can connect the client'}
            {status === 'stopped'  && 'Server stopped'}
            {status === 'error'    && 'Failed to start — check logs'}
          </div>

          <div className={styles.actions}>
            <button onClick={start}   className={styles.btnPrimary} disabled={starting}>
              {starting ? 'Starting…' : 'Start'}
            </button>
            <button onClick={stop}    className={styles.btnGhost}>Stop</button>
            <button onClick={restart} className={styles.btnGhost}>Restart</button>
          </div>
        </div>

        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        {nextId ? (
          <div className={styles.banner}>
            <span className={styles.bannerLabel}>Please connect</span>
            <span className={styles.bannerName}>{names[nextId] ?? nextId}</span>
          </div>
        ) : (
          done.length === queue.length && queue.length > 0 && (
            <div className={styles.bannerDone}>✓ All devices provisioned</div>
          )
        )}
      </div>

      {/* List card */}
      <div className={styles.listCard}>
        <div className={styles.listHeader}>
          <h3>Subjects</h3>
          <span className={styles.smallMuted}>{done.length} / {queue.length} done</span>
        </div>

        <ul className={styles.list}>
          {queue.map(id => {
            const isDone = done.includes(id);
            return (
              <li key={id} className={styles.row}>
                <span className={styles.name}>{names[id] ?? 'loading…'}</span>
                <span className={styles.badge} data-ok={isDone ? '1' : '0'}>
                  {isDone ? 'Done' : 'Waiting'}
                </span>
                <button
                  onClick={() => resend(id)}
                  disabled={!isDone}
                  className={styles.btnResend}
                  title={isDone ? 'Resend (adds back to the queue)' : 'Available after sent'}
                >
                  Resend
                </button>
              </li>
            );
          })}
        </ul>

        {err && <p className={styles.error}>{err}</p>}
      </div>
    </div>
  );
}
