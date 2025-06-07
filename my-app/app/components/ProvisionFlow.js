'use client';

import { useEffect, useState } from 'react';
import styles from '../styles/componentsDesign/ProvisionFlow.module.css';

export default function ProvisionFlow({ missionId, soldiers, commanders }) {
  /* commanders first, then soldiers */
  const queue = [...commanders, ...soldiers];

  const [done,     setDone]     = useState([]);   // IDs that already pinged
  const [starting, setStarting] = useState(false);
  const [names,    setNames]    = useState({});   // id → "Name" / "Name - Commander"

  /* ---------- fetch “pretty” names once ---------- */
  useEffect(() => {
    if (!queue.length) return;

    (async function getSoldierDisplayNames(idList = []) {
      const res = await fetch('/api/soldiers/names', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ ids: idList }),
      });
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);

      const { map } = await res.json();           // { id: { name, role } }

      const labelMap = Object.fromEntries(
        idList.map(id => {
          const info  = map[id];
          if (!info) return [id, id];             // fallback → raw id
          const label = info.role === 'Commander'
            ? `${info.fullName} - Commander`
            : info.fullName;
          return [id, label];
        }),
      );

      setNames(labelMap);
    })(queue).catch(console.error);
  }, [queue.join(',')]);                          // join() keeps dep array primitive

  /* ---------- SSE stream updates “done” ---------- */
  useEffect(() => {
    const es = new EventSource(`/api/provision/stream?missionId=${missionId}`);
    es.onmessage = e => {
      const { subjectId } = JSON.parse(e.data);
      setDone(d => [...new Set([...d, subjectId])]);
    };
    return () => es.close();
  }, [missionId]);

  const nextId = queue.find(id => !done.includes(id));

  /* ---------- start provisioning ---------- */
  async function handleStart() {
    setStarting(true);
    const res = await fetch('/api/provision/start', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ missionId, soldiers, commanders }),
    });
    if (!res.ok) alert('Failed to start provisioning');
  }

  return (
    <main className={styles.main}>
      {/* button only before anything starts */}
      {done.length === 0 && (
        <button
          onClick={handleStart}
          className={styles.startBtn}
          disabled={starting}
        >
          {starting ? 'Starting…' : 'Start provisioning'}
        </button>
      )}

      {/* banner shows the next device to connect */}
      {nextId ? (
        <h2 className={styles.banner}>
          Please connect&nbsp;
          <span className={styles.highlight}>{names[nextId]}</span>
        </h2>
      ) : (
        done.length === queue.length && (
          <h2 className={styles.done}>✓ All devices provisioned</h2>
        )
      )}

      {/* list of every subject, marked when done */}
      <ul className={styles.list}>
        {queue.map(id => (
          <li key={id} className={done.includes(id) ? styles.ok : ''}>
            {names[id] ?? 'loading…'} {done.includes(id) && '✔︎'}
          </li>
        ))}
      </ul>
    </main>
  );
}

function short(id) {
  return id.toString().slice(-6);
}
