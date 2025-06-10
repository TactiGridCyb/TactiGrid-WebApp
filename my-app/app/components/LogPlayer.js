'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ------------------------------------------------------------------
  Helpers
-------------------------------------------------------------------*/
const toMs = (v) => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string') return new Date(v).getTime();
  if (typeof v === 'object' && '$date' in v) return new Date(v.$date).getTime();
  return 0;
};

// 👉 Canonicalise every soldier‑identifier so comparisons always match
//    • converts Mongo ObjectId, strings, names –> lower‑case, spaces→dashes
const slug = (s) =>
  (s ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

/* ------------------------------------------------------------------
  Component
-------------------------------------------------------------------*/
export default function LogPlayer({ log, mission }) {
  if (!log) return null; // guard – still loading

  /* ------------------- unpack --------------------*/
  const { Interval: intervalMs = 1000, Data = [], Events = [] } = log;

  /* ---------------- display‑name lookup ----------*/
  const displayName = useMemo(() => {
    const map = new Map();
    mission?.soldiers?.forEach((s) => {
      // key by slug of Mongo _id (string) plus any fallback keys
      const key = slug(s._id ?? s.id ?? s.IDF_ID ?? s.fullName ?? '');
      map.set(key, s.fullName ?? s.displayName ?? key);
    });
    return (id) => map.get(slug(id)) ?? id;
  }, [mission]);

  /* ---------------- timeline calc ----------------*/
  const sortedData = [...Data].sort((a, b) => toMs(a.time_sent) - toMs(b.time_sent));
  const startMs = sortedData.length ? toMs(sortedData[0].time_sent) : 0;
  const endMs = sortedData.length ? toMs(sortedData[sortedData.length - 1].time_sent) : 0;
  const durationMs = Math.max(endMs - startMs, 0);

  /* ---------------- UI state ---------------------*/
  const [t, setT] = useState(0);
  const [playing, setPlay] = useState(false);

  /* ---------------- leaflet refs -----------------*/
  const mapRef = useRef(null);
  const layerRef = useRef(L.layerGroup());

  /* ---------------- init map ---------------------*/
  useEffect(() => {
    if (mapRef.current || !sortedData.length) return;

    mapRef.current = L.map('log-map', {
      zoomControl: false,
      attributionControl: false,
    }).setView([sortedData[0].latitude, sortedData[0].longitude], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current);

    layerRef.current.addTo(mapRef.current);
  }, [sortedData]);

  /* ------------------------------------------------------------------
    Event state – who is commander / missing / compromised at time nowMs
  -------------------------------------------------------------------*/
  const stateAt = useCallback(
    (nowMs) => {
      const missing = new Set();
      const compromised = new Set();
      const cutOff = new Map(); // soldierId → timeMs after which rows are ignored

      // first commander = first ObjectId in mission.commanders
      let commander = mission?.commanders?.length ? slug(mission.commanders[0]) : null;

      for (const e of Events) {
        const ts = toMs(e.timestamp);
        if (ts > nowMs) break; // future event → ignore for this frame

        switch (e.eventName) {
          case 'commanderSwitch':
            commander = slug(e.newCommanderID);
            break;
          case 'missingSoldier': {
            const id = slug(e.missingID);
            missing.add(id);
            cutOff.set(id, ts);
            break;
          }
          case 'compromisedSoldier': {
            const id = slug(e.compromisedID);
            compromised.add(id);
            cutOff.set(id, ts);
            break;
          }
          default:
            break; // other event types handled elsewhere
        }
      }

      return { commander, missing, compromised, cutOff };
    },
    [Events, mission]
  );

  /* ------------------------------------------------------------------
    DRAW FRAME
  -------------------------------------------------------------------*/
  const draw = useCallback(() => {
    if (!mapRef.current) return;
    layerRef.current.clearLayers();

    const nowMs = startMs + t;
    const { commander, missing, compromised, cutOff } = stateAt(nowMs);

    // latest row per soldier up to nowMs, subject to cut‑offs
    const latest = new Map();
    for (const row of sortedData) {
      const ts = toMs(row.time_sent);
      const id = slug(row.soldierId);
      if (ts > nowMs) break;
      if (cutOff.has(id) && ts > cutOff.get(id)) continue; // ignore rows after missing / compromised
      latest.set(id, row);
    }

    /* --------- draw soldiers ---------*/
    latest.forEach((row, id) => {
      const { latitude, longitude, heartRate } = row;

      // resolve marker style
      let marker;
      if (missing.has(id)) {
        marker = L.marker([latitude, longitude], {
          icon: L.divIcon({ className: 'missing-marker', html: '❓' }),
        });
      } else {
        let color = heartRate < 50 ? '#ef4444' : '#3b82f6';
        let radius = 6;
        if (id === commander) {
          color = '#a855f7';
          radius = 8;
        }
        if (compromised.has(id)) {
          color = '#000';
        }
        marker = L.circleMarker([latitude, longitude], {
          radius,
          color,
          weight: 2,
          fillOpacity: compromised.has(id) ? 1 : 0.9,
        });
      }

      marker
        .bindTooltip(`${displayName(id)} • HR ${heartRate}`, {
          permanent: true,
          direction: 'top',
        })
        .addTo(layerRef.current);

      // ripples (only for active, non‑missing markers)
      if (!playing && !missing.has(id) && !compromised.has(id)) {
        ['pulse-1', 'pulse-2'].forEach((cls, i) =>
          L.circleMarker([latitude, longitude], {
            radius: 6,
            className: id === commander ? `pulse-commander-${i + 1}` : cls,
          }).addTo(layerRef.current)
        );
      }
    });

    /* ------- other event markers (⚡) -------*/
    Events.forEach((e) => {
      if (toMs(e.timestamp) > nowMs) return; // future event
      if (e.__drawn) return; // already placed
      if (['commanderSwitch', 'missingSoldier', 'compromisedSoldier'].includes(e.eventName)) return;

      // coords from event.data, else somewhere sensible
      const lat = typeof e?.data?.lat === 'number' ? e.data.lat : undefined;
      const lng = typeof e?.data?.lng === 'number' ? e.data.lng : undefined;
      let coords;
      if (lat !== undefined && lng !== undefined) {
        coords = [lat, lng];
      } else if (latest.size) {
        const anyRow = latest.values().next().value;
        coords = [anyRow.latitude, anyRow.longitude];
      } else {
        return; // nowhere to drop icon
      }

      e.__drawn = true;
      L.marker(coords, {
        icon: L.divIcon({ className: 'event-marker', html: '⚡' }),
      })
        .bindTooltip(`${e.eventName} @ ${new Date(e.timestamp).toLocaleTimeString()}`)
        .addTo(layerRef.current);
    });
  }, [displayName, sortedData, startMs, t, stateAt, Events, playing]);

  useEffect(draw, [draw]);

  /* ------------------------------------------------------------------
    Playback loop – unchanged
  -------------------------------------------------------------------*/
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
  
  /* ---------------- JSX ----------------*/
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
        <button onClick={() => setPlay((p) => !p)}>{playing ? 'Pause' : 'Play'}</button>
        <span style={{ userSelect: 'none' }}>{(t / 1000).toFixed(1)} s / {(durationMs / 1000).toFixed(1)} s</span>
      </div>
    </div>
  );
}

