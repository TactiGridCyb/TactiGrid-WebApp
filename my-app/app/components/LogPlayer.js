'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * LogPlayer
 * Props:
 *   mission = {
 *     StartTime, EndTime, intervalMs,
 *     data: [ { soldierId, latitude, longitude, heartRate, time_sent }, … ]
 *   }
 */

const toMs = (v) => {
  if (!v) return 0;                           // null / undefined
  if (typeof v === 'number')  return v;       // already ms
  if (v instanceof Date)      return v.getTime();
  if (typeof v === 'string')  return new Date(v).getTime(); // ISO string
  if (typeof v === 'object' && '$date' in v)
    return new Date(v.$date).getTime();       // Mongo Extended JSON
  return 0;
};

export default function LogPlayer({ mission }) {
  const mapRef  = useRef(null);
  const layer   = useRef(L.layerGroup());
  const [t, setT]        = useState(0);        // ms offset from StartTime
  const [playing, setPlaying] = useState(false);

  const { StartTime, EndTime, intervalMs, data } = mission;
const startMs    = toMs(StartTime);
const endMs      = toMs(EndTime);
const durationMs = Math.max(endMs - startMs, 0);


  /* ---------- init Leaflet map ---------- */
  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = L.map('mission-map').setView(
      [data[0].latitude, data[0].longitude],
      15
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(mapRef.current);
    layer.current.addTo(mapRef.current);
  }, [data]);

  /* ---------- redraw dots on t / play‑state change ---------- */
  useEffect(() => {
    if (!mapRef.current) return;
    layer.current.clearLayers();

    const now = startMs + t;
    const latest = {};
    for (const row of data) {
      const ts = toMs(row.time_sent);
      if (ts <= now) latest[row.soldierId] = row;
      else break;
    }

    Object.values(latest).forEach((row) => {
      const color = row.heartRate < 50 ? '#f43f5e' : '#2563eb';

      /* base marker */
      L.circleMarker([row.latitude, row.longitude], {
        radius: 6,
        color,
        fillOpacity: 0.9
      })
        .bindTooltip(
          `${row.soldierId}: HR ${row.heartRate}`,
          { permanent: true, direction: 'top' }
        )
        .addTo(layer.current);

      /* pulsing ring when paused */
      if (!playing) {
        L.circleMarker([row.latitude, row.longitude], {
          radius: 6,
          className: 'pulse-ring'
        }).addTo(layer.current);
        L.circleMarker([row.latitude, row.longitude], {
              radius: 6,
              className: 'ripple-ring'
            }).addTo(layer.current);
          
            // second ring, offset so two ripples alternate
            L.circleMarker([row.latitude, row.longitude], {
              radius: 6,
              className: 'ripple-ring second'
            }).addTo(layer.current);



      }
    });
  }, [t, playing, data, startMs]);

  /* ---------- play / pause ---------- */
  const play = async () => {
    setPlaying(true);
    for (let ms = 0; ms <= durationMs; ms += intervalMs) {
      setT(ms);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 30));
      if (!playing) return;                 // paused mid-loop
    }
    setPlaying(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div id="mission-map" style={{ flex: 1 }} />

      <input
  type="range"
  min={0}
  max={durationMs || 1}                 // fallback keeps React happy
  step={intervalMs || 1}
  value={Math.min(t, durationMs || 1)}
  onChange={(e) => setT(+e.target.value)}
/>

      <div style={{ display: 'flex', gap: '8px', padding: '8px' }}>
        <button onClick={playing ? () => setPlaying(false) : play}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <span>
          {(t / 1000).toFixed(1)} s / {(durationMs / 1000).toFixed(1)} s
        </span>
      </div>
    </div>
  );
}
