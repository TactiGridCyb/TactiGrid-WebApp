'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ---------- helper ---------- */
const toMs = (v) => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (v instanceof Date)     return v.getTime();
  if (typeof v === 'string') return new Date(v).getTime();
  if (typeof v === 'object' && '$date' in v) return new Date(v.$date).getTime();
  return 0;
};

/* ---------- component ---------- */
export default function LogPlayer({ log }) {
  if (!log) return null;                               // guard

  const { Interval: intervalMs = 1000, Data = [], Events = [] } = log;

  /* ---------- timeline ---------- */
  const sortedData = [...Data].sort(
    (a, b) => toMs(a.time_sent) - toMs(b.time_sent)
  );
  const startMs    = sortedData.length ? toMs(sortedData[0].time_sent) : 0;
  const endMs      = sortedData.length ? toMs(sortedData[sortedData.length - 1].time_sent) : 0;
  const durationMs = Math.max(endMs - startMs, 0);

  /* ---------- state ---------- */
  const [t, setT]      = useState(0);
  const [playing, setPlay] = useState(false);

  /* ---------- leaflet refs ---------- */
  const mapRef   = useRef(null);
  const layerRef = useRef(L.layerGroup());

  /* ---------- init map ---------- */
  useEffect(() => {
    if (mapRef.current || !sortedData.length) return;

    mapRef.current = L.map('log-map', {
      zoomControl: false,
      attributionControl: false,
    }).setView(
      [sortedData[0].latitude, sortedData[0].longitude],
      15
    );

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© OpenStreetMap contributors' }
    ).addTo(mapRef.current);

    layerRef.current.addTo(mapRef.current);
  }, [sortedData]);

  /* ---------- draw frame ---------- */
  const draw = useCallback(() => {
    if (!mapRef.current) return;
    layerRef.current.clearLayers();

    const now = startMs + t;

    /* latest row per soldier up to "now" */
    const latest = new Map();
    for (const row of sortedData) {
      const ts = toMs(row.time_sent);
      if (ts > now) break;
      latest.set(row.soldierId, row);
    }

    /* dots & ripples */
    latest.forEach((row) => {
      const { latitude, longitude, heartRate, soldierId } = row;
      const color = heartRate < 50 ? '#ef4444' : '#3b82f6';

      L.circleMarker([latitude, longitude], {
        radius: 6,
        color,
        weight: 2,
        fillOpacity: 0.9,
      })
        .bindTooltip(`${soldierId} • HR ${heartRate}`, {
          permanent: true,
          direction: 'top',
        })
        .addTo(layerRef.current);

      if (!playing) {
        ['pulse-1', 'pulse-2'].forEach((cls) =>
          L.circleMarker([latitude, longitude], {
            radius: 6,
            className: cls,
          }).addTo(layerRef.current)
        );
      }
    });

    /* event icons */
    Events.forEach((e) => {
      if (toMs(e.timestamp) > now) return;   // future event
      if (e.__drawn) return;                 // idempotent
      const lat = typeof e?.data?.lat === 'number' ? e.data.lat : undefined;
      const lng = typeof e?.data?.lng === 'number' ? e.data.lng : undefined;
      let coords;

      if (lat !== undefined && lng !== undefined) {
        coords = [lat, lng];
      } else if (latest.size) {
        const anyRow = latest.values().next().value;
        coords = [anyRow.latitude, anyRow.longitude];
      } else {
        return;                               // nowhere to place -> skip
      }

      e.__drawn = true;
      L.marker(coords, {
        icon: L.divIcon({ className: 'event-marker', html: '⚡' }),
      })
        .bindTooltip(
          `${e.name} @ ${new Date(e.timestamp).toLocaleTimeString()}`
        )
        .addTo(layerRef.current);
    });
  }, [Events, playing, sortedData, startMs, t]);

  useEffect(draw, [draw]);

  /* ---------- playback loop ---------- */
  useEffect(() => {
    if (!playing) return;
    let raf;
    const step = (prev) => (now) => {
      const delta = now - prev;
      setT((old) => {
        const next = old + delta;
        if (next >= durationMs) {
          setPlay(false);
          return durationMs;
        }
        return next;
      });
      raf = requestAnimationFrame(step(now));
    };
    raf = requestAnimationFrame(step(performance.now()));
    return () => cancelAnimationFrame(raf);
  }, [playing, durationMs]);

  /* ---------- JSX ---------- */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div id="log-map" style={{ flex: 1, minHeight: 350 }} />

      <input
        type="range"
        min={0}
        max={durationMs || 1}
        step={intervalMs || 1}
        value={Math.min(t, durationMs || 1)}
        onChange={(e) => setT(+e.target.value)}
        style={{ width: '100%' }}
      />

      <div style={{ display: 'flex', gap: 8, padding: 8 }}>
        <button onClick={() => setPlay((p) => !p)}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <span style={{ userSelect: 'none' }}>
          {(t / 1000).toFixed(1)} s / {(durationMs / 1000).toFixed(1)} s
        </span>
      </div>
    </div>
  );
}

/* ---------- CSS (add once in a global sheet) ----------
.pulse-1,
.pulse-2 {
  border: 0;
  background: rgba(0, 149, 255, 0.25);
  animation: ripple 2.4s infinite ease-out;
}
.pulse-2 { animation-delay: 1.2s; }

@keyframes ripple {
  0%   { transform: scale(0.1); opacity: 0.7; }
  80%  { transform: scale(3);   opacity: 0; }
  100% { transform: scale(3);   opacity: 0; }
}

.event-marker {
  font-size: 1.3rem;
  line-height: 1;
  text-shadow: 0 0 2px #000;
}
--------------------------------------------------------*/
