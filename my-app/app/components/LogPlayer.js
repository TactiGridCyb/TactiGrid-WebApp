// components/LogPlayer.js
'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Props
 *   mission: {
 *     StartTime, EndTime, intervalMs, data: [ {soldierId, latitude, longitude, heartRate, time_sent}, … ]
 *   }
 */
export default function LogPlayer({ mission }) {
  const mapRef   = useRef(null);
  const dotsRef  = useRef(L.layerGroup());
  const [t, setT] = useState(0);                       // ms offset from StartTime
  const { StartTime, EndTime, data } = mission;
  const startMs = new Date(StartTime).getTime();
  const endMs   = new Date(EndTime).getTime();
  const durationMs = endMs - startMs;

  /* initialise Leaflet map once */
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map('mission-map').setView(
      [data[0].latitude, data[0].longitude],
      15
    );
    mapRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© OpenStreetMap' }
    ).addTo(map);
    dotsRef.current.addTo(map);
  }, [data]);

  /* redraw dots whenever `t` changes */
  useEffect(() => {
    if (!mapRef.current) return;
    dotsRef.current.clearLayers();

    const now   = startMs + t;
    const latest = {};                        // soldierId → last row <= now
    for (const row of data) {
      const ts = new Date(row.time_sent).getTime();
      if (ts <= now) latest[row.soldierId] = row;
      else break;                             // rows are sorted
    }

    Object.entries(latest).forEach(([sid, row]) => {
      L.circleMarker(
        [row.latitude, row.longitude],
        { radius:6, color:'#f43f5e', fillOpacity:0.9 }
      )
        .bindTooltip(sid, { permanent:true, direction:'top' })
        .addTo(dotsRef.current);
    });
  }, [t, data, startMs]);

  /* simple play loop */
  const play = async () => {
    for (let ms = 0; ms <= durationMs; ms += mission.intervalMs) {
      setT(ms);
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 30));
    }
  };

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      <div id="mission-map" style={{ flex:1 }} />

      <input
        type="range"
        min={0}
        max={durationMs}
        step={mission.intervalMs}
        value={t}
        onChange={e => setT(+e.target.value)}
      />

      <div style={{ display:'flex', gap:'8px', padding:'8px' }}>
        <button onClick={play}>Play</button>
        <span>{(t/1000).toFixed(1)} s / {(durationMs/1000).toFixed(1)} s</span>
      </div>
    </div>
  );
}
