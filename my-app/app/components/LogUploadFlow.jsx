'use client';

import { useMemo, useState } from 'react';
import styles from '../styles/componentsDesign/ProvisionFlow.module.css';

export default function LogUploadFlow({ missionId }) {
  const [status, setStatus] = useState('stopped'); // 'stopped' | 'starting' | 'up' | 'error'
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [host, setHost] = useState(process.env.NEXT_PUBLIC_LOGS_HTTP_HOST || '0.0.0.0');
  const [port, setPort] = useState(Number(process.env.NEXT_PUBLIC_LOGS_HTTP_PORT || 9002));

  const [last, setLast] = useState(null); // {items, logId, receivedAt, isFinished}

  const endpoint = useMemo(() => {
    if (typeof window === 'undefined') return `http://${host}:${port}/upload/${missionId}`;
    const h = host === '0.0.0.0' ? window.location.hostname : host;
    return `http://${h}:${port}/upload/${missionId}`;
  }, [host, port, missionId]);

  async function start() {
    setErr(''); setMsg(''); setStatus('starting');
    try {
      const res = await fetch('/api/logs/start', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ host, port }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed to start');
      setStatus('up');
      setMsg('Server is up — you can connect the client');
    } catch (e) {
      setStatus('error'); setErr(e.message || 'Failed to start');
    }
  }

  async function stop() {
    setErr(''); setMsg('');
    await fetch('/api/logs/stop', { method:'POST' }).catch(() => {});
    setStatus('stopped');
  }

  async function restart() {
    setErr(''); setMsg(''); setStatus('starting');
    const res = await fetch('/api/logs/restart', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ host, port }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) { setStatus('up'); setMsg('Server is up — you can connect the client'); }
    else { setStatus('error'); setErr(j?.error || 'Failed to restart'); }
  }

  async function refreshStatus() {
    try {
      const url = `/api/logs/status?missionId=${missionId}`;
      const res = await fetch(url, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Status failed');
      setLast({
        items: j.items ?? 0,
        logId: j.logId ?? null,
        receivedAt: j.receivedAt ?? null,
        isFinished: j.isFinished ?? false,
      });
      setMsg('Status refreshed.');
    } catch (e) {
      setErr(e.message || 'Failed to refresh');
    }
  }

  return (
    <div className={styles.wrap}>
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
            <button onClick={start}   className={styles.btnPrimary} disabled={status==='starting'}>{status==='starting'?'Starting…':'Start'}</button>
            <button onClick={stop}    className={styles.btnGhost}>Stop</button>
            <button onClick={restart} className={styles.btnGhost}>Restart</button>
            <button onClick={refreshStatus} className={styles.btnGhost}>Refresh status</button>
          </div>
        </div>

        <div className={styles.progressBar}>
          <div className={styles.progressFill}
               style={{ width: status === 'up' ? '100%' : status === 'starting' ? '50%' : '0%' }} />
        </div>

        <div style={{ marginTop: 12, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <label className={styles.inputGroup}>
            <span>Host</span>
            <input value={host} onChange={e => setHost(e.target.value)} placeholder="0.0.0.0" />
          </label>
          <label className={styles.inputGroup}>
            <span>Port</span>
            <input value={port} onChange={e => setPort(Number(e.target.value)||0)} inputMode="numeric" />
          </label>
          <span style={{opacity:.85}}>POST to: <code>{endpoint}</code></span>
        </div>

        {msg && <div className={styles.banner} style={{ marginTop: 10 }}>
          <span className={styles.bannerLabel}>Status</span>
          <span className={styles.bannerName}>{msg}</span>
        </div>}
        {err && <p className={styles.error}>{err}</p>}
      </div>

      <div className={styles.listCard}>
        <div className={styles.listHeader}>
          <h3>Last Upload</h3>
          <span className={styles.smallMuted}>manual refresh</span>
        </div>

        {last ? (
          <ul className={styles.list}>
            <li className={styles.row}>
              <span className={styles.name}>Items</span>
              <span className={styles.badge} data-ok="1">{last.items}</span>
            </li>
            <li className={styles.row}>
              <span className={styles.name}>Received At</span>
              <span className={styles.badge} data-ok="1">{last.receivedAt ? new Date(last.receivedAt).toLocaleString() : '—'}</span>
            </li>
            {last.logId && (
              <li className={styles.row}>
                <span className={styles.name}>Log ID</span>
                <span className={styles.badge} data-ok="1">{last.logId}</span>
              </li>
            )}
            <li className={styles.row}>
              <span className={styles.name}>Mission Finished</span>
              <span className={styles.badge} data-ok="1">{String(last.isFinished)}</span>
            </li>
          </ul>
        ) : (
          <div className={styles.banner} style={{ justifyContent: 'center' }}>
            No uploads yet
          </div>
        )}
      </div>
    </div>
  );
}
