'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/* -------------------------------------------------
   helper: deep‑clean a Mongo export
   ------------------------------------------------- */
function cleanMongoExport(obj) {
  function walk(v) {
    if (Array.isArray(v)) return v.map(walk);

    if (v && typeof v === 'object') {
      // $date  → ISO string
      if ('$date' in v) return new Date(v.$date).toISOString();
      // $oid / $binary  → drop (we’ll generate blob or let server handle)
      if ('$oid' in v || '$binary' in v) return undefined;

      const out = {};
      for (const [k, val] of Object.entries(v)) {
        if (['_id', 'userId', 'createdAt', 'updatedAt', '__v'].includes(k))
          continue;                               // strip bookkeeping keys


        if (k === 'codec' && val.hr)
          val.hr = val.hr.replace(/[–‑—]/g, '-');   


        const cleaned = walk(val);
        if (cleaned !== undefined) out[k] = cleaned;
      }
      return out;
    }

    return v;                                    // primitives untouched
  }
  return walk(obj);
}

/* -------------------------------------------------
   component
   ------------------------------------------------- */
export default function UploadLogButton() {
  const fileInput = useRef(null);
  const router    = useRouter();
  const [msg, setMsg] = useState('');

  const openPicker = () => fileInput.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      /* 1️⃣  parse raw export */
      const raw     = JSON.parse(await file.text());
      const cleaned = cleanMongoExport(raw);

      /* 2️⃣  send to server */
      const res  = await fetch('/api/logs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify(cleaned)
      });
      const body = await res.json();

      if (!res.ok) {
        setMsg(` ${body.error}`);
      } else {
        setMsg('✅ uploaded');
        router.refresh();                // refresh /old‑missions page
      }
    } catch (err) {
      console.error(err);
      setMsg('❌ invalid JSON file');
    } finally {
      e.target.value = '';               // allow re‑selecting same file
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: 12 }}>
      <input
        type="file"
        accept=".json,application/json"
        hidden
        ref={fileInput}
        onChange={handleFile}
      />
      <button
        onClick={openPicker}
        style={{
          padding: '8px 16px',
          background: '#2563eb',
          color: '#fff',
          borderRadius: 6,
          cursor: 'pointer'
        }}
      >
        Upload Log (.json)
      </button>
      {msg && <p style={{ marginTop: 4 }}>{msg}</p>}
    </div>
  );
}
