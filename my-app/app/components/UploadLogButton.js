'use client';
import ReloadOnDoneSSE from '../components/ReloadOnDoneSSE';

import { useState, useCallback } from 'react';

const ARM_ENDPOINT = '/api/logs/toggle-uploads';

export default function WatchLogListener({ id ,  className = '' }) {
  const [armed, setArmed] = useState(false);
  const [msg,   setMsg]   = useState('');

  const arm = useCallback(async () => {
    if (armed) return;
    setArmed(true);                           // lock button immediately

    try {
      const res  = await fetch(ARM_ENDPOINT, { method: 'POST' });
      const json = await res.json();

      if (json.armed) {
        setMsg('Listening… (watch can send now)');
      } else {
        setArmed(false);
        setMsg('Could not arm uploads');
      }
    } catch {
      setArmed(false);
      setMsg('Network error');
    }
  }, [armed]);

  return (
    
    <div style={{ textAlign: 'center' }}>
      <ReloadOnDoneSSE missionId={id} />
      <button
        onClick={arm}
        disabled={armed}
        className={className}
        style={{
          padding: '8px 16px',
          cursor: armed ? 'not-allowed' : 'pointer',
          background: armed ? '#94a3b8' : '#2563eb',
          color: '#fff',
          borderRadius: 6
        }}
      >
        {armed ? 'Waiting for watch…' : 'Start Listening'}
      </button>

      {msg && <p style={{ marginTop: 6 }}>{msg}</p>}
    </div>
  );
}
