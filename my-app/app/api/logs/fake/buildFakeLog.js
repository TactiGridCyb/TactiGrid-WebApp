import { brotliCompressSync } from 'node:zlib';

export function buildFakeLog() {
  const base = new Date('2025-03-30T08:00:00Z');
  const rows = [];
  const soldiers = [
    { id:'john',  callsign:'John',  lat:32.08510, lon:34.78800 },
    { id:'sarah', callsign:'Sarah', lat:32.08520, lon:34.78820 },
    { id:'alex',  callsign:'Alex',  lat:32.08530, lon:34.78840 }
  ];

  /* 30 rows, 1 every 3 s */
  for (let i=0; i<30; i++) {
    const s = soldiers[i % 3];
    rows.push({
      soldierId: s.id,
      latitude:  +(s.lat + 0.00005*i).toFixed(6),
      longitude: +(s.lon + 0.00005*i).toFixed(6),
      heartRate: 85 + (i % 7),
      time_sent: new Date(base.getTime() + i*3000)
    });
  }

  /* tiny demo blob */
  const blob = brotliCompressSync(Buffer.from('demo‑payload'));

  return {
    sessionId:  `sess-fake-${Date.now()}`,
    operation:  'OPERATION REDHAWK',
    missionId:  'ABC123',

    StartTime:  base,
    EndTime:    new Date(base.getTime() + (30-1)*3000),
    Duration:   (30-1)*3,                     // seconds

    GMK:        'mission_map.gmk',
    Location:   { name:'Base Delta', bbox:[34.7878,32.0850,34.7890,32.0860] },
    Soldiers:   soldiers,
    ConfigID:   'config_v2',

    intervalMs: 3000,
    codec:      { path:'polyline', hr:'delta‑varint', compression:'brotli' },

    data: rows,
    blob
  };
}
