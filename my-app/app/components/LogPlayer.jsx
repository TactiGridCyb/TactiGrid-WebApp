'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from '../styles/componentsDesign/LogPlayer.module.css';

/* ---------- helpers ---------- */
const toMs = (v) => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string') return new Date(v).getTime();
  if (typeof v === 'object' && '$date' in v) return new Date(v.$date).getTime();
  return 0;
};
const slug = (s) => (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, '-');

const fmtClock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
};
const agoText = (ms) => {
  if (ms <= 0) return 'now';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
};

/* ---------- marker html ---------- */
const markerHtml = (variant, label) => `
  <div class="dot dot--${variant}">
    <div class="dot-core"></div>
    <div class="dot-glow"></div>
    ${variant !== 'missing' ? '<div class="dot-pulse"></div>' : ''}
    <div class="dot-label">${label ?? ''}</div>
  </div>
`;
const divIcon = (variant, label) =>
  L.divIcon({
    className: '',
    html: markerHtml(variant, label),
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

export default function LogPlayer({ log, mission, names = {} }) {
  if (!log) return null;

  const intervalMs = Number(log.Interval ?? 1000);
  const Data = Array.isArray(log.Data) ? log.Data : [];
  const Events = Array.isArray(log.Events) ? log.Events : [];

  /* display names */
  const displayName = useMemo(() => {
    const map = new Map(Object.entries(names || {}).map(([k, v]) => [slug(k), v]));
    return (id) => map.get(slug(id)) ?? String(id);
  }, [names]);

  /* timeline */
  const sortedData = useMemo(
    () => [...Data].sort((a, b) => toMs(a.time_sent) - toMs(b.time_sent)),
    [Data]
  );
  const startMs = sortedData.length ? toMs(sortedData[0].time_sent) : 0;
  const endMs = sortedData.length ? toMs(sortedData[sortedData.length - 1].time_sent) : 0;
  const durationMs = Math.max(endMs - startMs, 0);
  const sortedEvents = useMemo(
    () => [...Events].sort((a, b) => toMs(a.timestamp) - toMs(b.timestamp)),
    [Events]
  );

  /* UI */
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  /* map setup */
  const mapRef = useRef(null);
  const layerRef = useRef(L.layerGroup());

  useEffect(() => {
    if (mapRef.current || !sortedData.length) return;
    const first = sortedData[0];
    const map = L.map('log-map', { zoomControl: false, attributionControl: false })
      .setView([first.latitude, first.longitude], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    layerRef.current.addTo(map);
    mapRef.current = map;

    return () => {
      try { map.remove(); } catch {}
      mapRef.current = null;
    };
  }, [sortedData]);

  /* commander/missing/compromised at time */
  const stateAt = useCallback(
    (nowMs) => {
      const missing = new Set();
      const compromised = new Set();
      const cutOff = new Map();
      const commanders = mission?.Commanders ?? mission?.commanders ?? [];
      let commander = commanders.length ? slug(commanders[0]) : null;

      for (const e of sortedEvents) {
        const ts = toMs(e.timestamp);
        if (ts > nowMs) break;
        switch (e.eventName) {
          case 'commanderSwitch':
            if (e.newCommanderID) commander = slug(e.newCommanderID);
            break;
          case 'missingSoldier': {
            const id = e.missingID ? slug(e.missingID) : null;
            if (id) { missing.add(id); cutOff.set(id, ts); }
            break;
          }
          case 'compromisedSoldier': {
            const id = e.compromisedID ? slug(e.compromisedID) : null;
            if (id) { compromised.add(id); cutOff.set(id, ts); }
            break;
          }
          default:
            break;
        }
      }
      return { commander, missing, compromised, cutOff };
    },
    [mission, sortedEvents]
  );

  /* ✅ DERIVED ROSTER (no setState here) */
  const nowMs = startMs + t;
  const roster = useMemo(() => {
    const { commander, missing, compromised, cutOff } = stateAt(nowMs);

    // latest row per soldier up to now
    const latest = new Map();
    for (const row of sortedData) {
      const ts = toMs(row.time_sent);
      if (ts > nowMs) break;
      const id = slug(row.soldierId);
      if (cutOff.has(id) && ts > cutOff.get(id)) continue;
      latest.set(id, row);
    }

    const list = [];
    latest.forEach((row, id) => {
      const { latitude, longitude, heartRate } = row;
      const ts = toMs(row.time_sent);
      const age = nowMs - ts;

      let status = 'ok';
      if (id === commander) status = 'commander';
      else if (compromised.has(id)) status = 'compromised';
      else if (missing.has(id)) status = 'missing';
      else if (heartRate < 50) status = 'low';

      list.push({
        id,
        name: displayName(id),
        hr: heartRate,
        status,
        lastUpdateMs: age,
        lat: latitude,
        lng: longitude,
      });
    });

    // commander first, then compromised, missing, low, ok
    const weight = { commander: 0, compromised: 1, missing: 2, low: 3, ok: 4 };
    list.sort((a, b) => (weight[a.status] - weight[b.status]) || a.name.localeCompare(b.name));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedData, displayName, stateAt, nowMs]);

  /* draw markers from roster (NO setState) */
  useEffect(() => {
    if (!mapRef.current) return;
    layerRef.current.clearLayers();

    // draw roster
    for (const s of roster) {
      const label = s.name?.[0]?.toUpperCase() ?? '';
      const icon = divIcon(s.status, label);
      L.marker([s.lat, s.lng], { icon })
        .bindTooltip(`${s.name} • HR ${s.hr}`, { permanent: true, direction: 'top' })
        .addTo(layerRef.current);
    }

    // draw generic ⚡events up to now, near first soldier if any
    const any = roster[0];
    if (any) {
      for (const e of sortedEvents) {
        const ts = toMs(e.timestamp);
        if (ts > nowMs) break;
        if (['commanderSwitch', 'missingSoldier', 'compromisedSoldier'].includes(e.eventName)) continue;
        L.marker([any.lat, any.lng], {
          icon: L.divIcon({ className: styles.eventIcon, html: '⚡' }),
        })
          .bindTooltip(`${e.eventName} @ ${new Date(ts).toLocaleTimeString()}`)
          .addTo(layerRef.current);
      }
    }
  }, [roster, sortedEvents, nowMs]);

  /* playback loop */
  useEffect(() => {
    if (!playing) return;
    let raf;
    const step = (prev) => (now) => {
      const delta = (now - prev) * speed;
      setT((old) => Math.min(old + delta, durationMs));
      raf = requestAnimationFrame(step(now));
    };
    raf = requestAnimationFrame(step(performance.now()));
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, durationMs]);

  const centerOn = (lat, lng) => {
    try { mapRef.current?.setView([lat, lng], 16, { animate: true }); } catch {}
  };

  return (
    <div className={styles.shell}>
      {/* top bar */}
      <div className={styles.topbar}>
        <div className={styles.status}>
          <span className={styles.badge}>Mission</span>
          <strong className={styles.missionName}>
            {mission?.missionName || mission?.name || mission?._id}
          </strong>
        </div>

        <div className={styles.controls}>
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => { setT(0); setPlaying(false); }}
            title="Go to start"
          >⏮</button>

          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? 'Pause' : 'Play'}
          </button>

          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => { setT(durationMs); setPlaying(false); }}
            title="Go to end"
            disabled={!durationMs}
          >⏭</button>

          <label className={styles.speed}>
            Speed
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
            </select>
          </label>

          <div className={styles.time}>
            {fmtClock(t)} / {fmtClock(durationMs)}
          </div>
        </div>
      </div>

      {/* main grid: map + roster */}
      <div className={styles.grid}>
        <div id="log-map" className={styles.map} />

        <aside className={styles.panel}>
          <div className={styles.panelHead}>
            <h3>Soldiers</h3>
            <span className={styles.subtle}>{roster.length} active</span>
          </div>

          <ul className={styles.list}>
            {roster.map((s) => (
              <li key={s.id} className={`${styles.card} ${styles['card--' + s.status]}`}>
                <div className={styles.cardLeft}>
                  <div className={`${styles.avatar} ${styles['avatar--' + s.status]}`}>
                    {s.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className={styles.cardTitle}>{s.name}</div>
                    <div className={styles.cardMeta}>
                      <span className={`${styles.chip} ${styles['chip--' + s.status]}`}>
                        {s.status === 'ok' ? 'OK' : s.status}
                      </span>
                      <span className={styles.dotSep} />
                      <span className={s.hr < 50 ? styles.hrLow : styles.hrGood}>HR {s.hr}</span>
                      <span className={styles.dotSep} />
                      <span className={styles.muted}>{agoText(s.lastUpdateMs)}</span>
                    </div>
                  </div>
                </div>
                <button
                  className={`${styles.btn} ${styles.btnTiny}`}
                  onClick={() => centerOn(s.lat, s.lng)}
                  title="Center on map"
                >
                  🔎
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* timeline */}
      <input
        type="range"
        min={0}
        max={durationMs || 1}
        step={intervalMs || 1}
        value={Math.min(t, durationMs || 1)}
        onChange={(e) => setT(+e.target.value)}
        className={styles.slider}
        disabled={!durationMs}
      />

      {/* legend */}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.ldCommander}`} /> Commander
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.ldOk}`} /> Soldier
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.ldLow}`} /> Low HR
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.ldComp}`} /> Compromised
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.ldMiss}`} /> Missing
        </span>
      </div>
    </div>
  );
}
