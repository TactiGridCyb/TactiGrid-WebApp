'use client';

import { useEffect, useState } from 'react';
import styles from '../styles/componentsDesign/ProvisionFlow.module.css';

export default function ProvisionFlow({ missionId, soldiers, commanders }) {
  /* ordered queue: commanders first, then soldiers (change if you like) */
  const queue = [...commanders, ...soldiers];
  const [done, setDone] = useState([]);           // subjectIds that have pinged
  const [starting, setStarting] = useState(false);

  /* ------- SSE stream for pings ------- */
  useEffect(() => {
    const es = new EventSource(`/api/provision/stream?missionId=${missionId}`);
    es.onmessage = (e) => {
      const { subjectId } = JSON.parse(e.data);
      setDone((d) => [...new Set([...d, subjectId])]);
    };
    return () => es.close();
  }, [missionId]);

  const nextId = queue.find((id) => !done.includes(id));

  /* ------- click handler starts the backend work ------- */
  async function handleStart() {
    setStarting(true);
    const res = await fetch('/api/provision/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionId, soldiers, commanders }),
    });
    if (!res.ok) alert('Failed to start provisioning');
  }

  return (
    <main className={styles.main}>
      {/* start button shows only while provisioning hasn’t begun */}
      {done.length === 0 && (
        <button
          onClick={handleStart}
          className={styles.startBtn}
          disabled={starting}
        >
          {starting ? 'Starting…' : 'Start provisioning'}
        </button>
      )}

      {nextId ? (
        <h2 className={styles.banner}>
          Please connect&nbsp;
          <span className={styles.highlight}>{short(nextId)}</span>
        </h2>
      ) : (
        done.length === queue.length && (
          <h2 className={styles.done}>✓ All devices provisioned</h2>
        )
      )}

      <ul className={styles.list}>
        {queue.map((id) => (
          <li
            key={id.toString()}
            className={done.includes(id) ? styles.ok : ''}
          >
            {short(id)} {done.includes(id) && '✔︎'}
          </li>
        ))}
      </ul>
    </main>
  );
}

function short(id) {
  return id.toString().slice(-6);
}
