'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from '../styles/componentsDesign/LogPlayer.module.css';

const asStr = (x) => (x ?? '').toString();

const toMs = (v) => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string') return new Date(v).getTime();
  if (typeof v === 'object' && '$date' in v) return new Date(v.$date).getTime();
  return 0;
};

const eventTs = (e) => toMs(e?.timestamp ?? e?.time ?? e?.time_sent ?? e?.createdAt);
const normEvent = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const pick = (obj, keys) => keys.map((k) => obj?.[k]).find((v) => v != null);

const isMongoId = (s) => /^[0-9a-f]{24}$/i.test(asStr(s).trim());
const toIdStr = (x) => {
  if (!x) return '';
  if (typeof x === 'string') return x;
  if (typeof x === 'object') {
    if (x.$oid) return String(x.$oid);
    if (x._id) return toIdStr(x._id);
  }
  return String(x);
};

const nameKey = (s) =>
  asStr(s)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[-\s]/g, ''); 

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

const isHrEvent = (e) => {
  const n = normEvent(e?.eventName);
  return n.includes('hr') || n.includes('heart');
};
const readHrValue = (e) => {
  const v = pick(e, ['heartRate', 'hr', 'bpm', 'value', 'rate']);
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const VARIANT_CLASS = {
  ok: null,
  commander: styles.vCommander,
  compromised: styles.vCompromised,
  missing: styles.vMissing,
  unqualified: styles.vUnqualified,
};
const markerHtml = (variant, label) => `
  <div class="${styles.dot} ${VARIANT_CLASS[variant] || ''}">
    <div class="${styles.dotCore}"></div>
    <div class="${styles.dotGlow}"></div>
    ${variant !== 'missing' ? `<div class="${styles.dotPulse}"></div>` : ''}
    <div class="${styles.dotLabel}">${label ?? ''}</div>
  </div>
`;
const divIcon = (variant, label) =>
  L.divIcon({
    className: '',
    html: markerHtml(variant, label),
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const eventMeta = (e) => {
  const n = normEvent(e?.eventName);
  if (isHrEvent(e)) return { icon: '💓', label: 'Heart rate' };
  switch (n) {
    case 'commanderswitch':
      return { icon: '🎖', label: 'Commander switch' };
    case 'unqualifiedcommander':
      return { icon: '🚫', label: 'Unqualified commander' };
    case 'missingsoldier':
      return { icon: '❓', label: 'Missing soldier' };
    case 'compromisedsoldier':
      return { icon: '⚠️', label: 'Compromised soldier' };
    default:
      return { icon: '⚡', label: asStr(e?.eventName || 'Event') };
  }
};

const buildBaseNameMap = (namesObj) => {
  const m = new Map();
  for (const [k, v] of Object.entries(namesObj || {})) {
    const key = nameKey(v || k);
    m.set(key, v || k);
    m.set(`__token__:${k}`, v || k);
  }
  return m;
};

export default function LogPlayer({ log, mission, names = {} }) {
  if (!log) return null;

  const intervalMs = Number(log.Interval ?? 1000);
  const Data = Array.isArray(log.Data) ? log.Data : [];
  const Events = Array.isArray(log.Events) ? log.Events : [];

  const sortedData = useMemo(
    () => [...Data].sort((a, b) => toMs(a.time_sent) - toMs(b.time_sent)),
    [Data]
  );




  const firstDataMs = sortedData.length
    ? toMs(sortedData[0].time_sent)
    : Number.POSITIVE_INFINITY;
  const lastDataMs = sortedData.length
    ? toMs(sortedData[sortedData.length - 1].time_sent)
    : Number.NEGATIVE_INFINITY;

  let firstEventMs = Number.POSITIVE_INFINITY;
  let lastEventMs = Number.NEGATIVE_INFINITY;
  for (const e of Events) {
    const ts = eventTs(e);
    if (!Number.isFinite(ts)) continue;
    if (ts < firstEventMs) firstEventMs = ts;
    if (ts > lastEventMs) lastEventMs = ts;
  }

  const earliest = Math.min(firstDataMs, firstEventMs);
  const startMs = Number.isFinite(earliest) ? earliest : 0;

  const latest = Math.max(lastDataMs, lastEventMs);
  const endMs = Number.isFinite(latest) ? latest + 5000 : startMs;

  const durationMs = Math.max(endMs - startMs, 0);







  const sortedEvents = useMemo(
    () => [...Events].sort((a, b) => eventTs(a) - eventTs(b)),
    [Events]
  );

  const baseNameMap = useMemo(() => buildBaseNameMap(names), [names]);
  const [fetchedNames, setFetchedNames] = useState(() => new Map());

  const idsToResolve = useMemo(() => {
    const set = new Set();
    const commanders = (mission?.Commanders ?? mission?.commanders ?? []).map(toIdStr);
    commanders.forEach((c) => isMongoId(c) && set.add(c));
    for (const row of sortedData) {
      const sid = toIdStr(row?.soldierId);
      if (isMongoId(sid)) set.add(sid);
    }
    for (const e of sortedEvents) {
      const idish = pick(e, ['soldierID', 'soldierId', 'subjectID', 'subjectId', 'id']);
      const v = toIdStr(idish);
      if (isMongoId(v)) set.add(v);
    }
    return Array.from(set);
  }, [mission, sortedData, sortedEvents]);

  useEffect(() => {
    const unknown = idsToResolve.filter((id) => !fetchedNames.has(id));
    if (!unknown.length) return;

    let cancelled = false;
    (async () => {
      const pairs = await Promise.all(
        unknown.map(async (id) => {
          try {
            const res = await fetch(`/api/soldiers/${id}`);
            if (!res.ok) throw 0;
            const json = await res.json();
            return [id, json?.fullName || id];
          } catch {
            return [id, id];
          }
        })
      );
      if (!cancelled) {
        setFetchedNames((prev) => {
          const next = new Map(prev);
          for (const [id, name] of pairs) next.set(id, name);
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [idsToResolve, fetchedNames]);

  const displayName = useCallback(
    (token) => {
      const t = asStr(token);
      const byToken = baseNameMap.get(`__token__:${t}`);
      if (byToken) return byToken;
      if (isMongoId(t) && fetchedNames.has(t)) return fetchedNames.get(t);
      return t; 
    },
    [baseNameMap, fetchedNames]
  );

  
  const keyFromIdToken = useCallback((token) => nameKey(displayName(token)), [displayName]);
  const keyFromName = useCallback((fullName) => nameKey(fullName), []);

  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const mapRef = useRef(null);
  const markersLayerRef = useRef(L.layerGroup());
  const eventsLayerRef = useRef(L.layerGroup());

  useEffect(() => {
    if (mapRef.current || !sortedData.length) return;
    const first = sortedData[0];

    const map = L.map('log-map', { zoomControl: false, attributionControl: false }).setView(
      [first.latitude, first.longitude],
      15
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.createPane('markersPane');
    map.createPane('eventsPane');
    map.getPane('markersPane').style.zIndex = 600;
    map.getPane('eventsPane').style.zIndex = 700;

    markersLayerRef.current.addTo(map);
    eventsLayerRef.current.addTo(map);

    mapRef.current = map;

    return () => {
      try {
        map.remove();
      } catch { }
      mapRef.current = null;
    };
  }, [sortedData]);

 
  const stateAt = useCallback(
    (nowMs) => {
      const missing = new Set();
      const compromised = new Set();
      const unqualified = new Set();
      const cutOff = new Map();
      const hrMap = new Map(); 

 
      const initialCmdrs = mission?.Commanders ?? mission?.commanders ?? [];
      let commander = null;
      if (initialCmdrs.length) {
        const c0 = initialCmdrs[0];
        commander = isMongoId(c0) ? keyFromIdToken(toIdStr(c0)) : keyFromName(asStr(c0));
      }

      for (const e of sortedEvents) {
        const ts = eventTs(e);
        if (ts > nowMs) break;

        const ev = normEvent(e.eventName);

        if (ev === 'commanderswitch') {
          const nameStr = asStr(pick(e, ['newCommanderID', 'newCommander'])).trim();
          if (nameStr) commander = keyFromName(nameStr);
          continue;
        }

        if (ev === 'missingsoldier') {
          const nameStr = asStr(pick(e, ['missingID', 'missingName'])).trim();
          if (nameStr) {
            const k = keyFromName(nameStr);
            missing.add(k);
            cutOff.set(k, ts);
          }
          continue;
        }

        if (ev === 'compromisedsoldier') {
          const nameStr = asStr(pick(e, ['compromisedID', 'compromisedName'])).trim();
          if (nameStr) {
            const k = keyFromName(nameStr);
            compromised.add(k);
            cutOff.set(k, ts);
          }
          continue;
        }

        if (ev === 'unqualifiedcommander') {
          const nameStr = asStr(pick(e, ['unqualifiedID', 'unqualifiedName'])).trim();
          if (nameStr) unqualified.add(keyFromName(nameStr));
          continue;
        }

        if (isHrEvent(e)) {
          const subjName =
            asStr(pick(e, ['soldierName', 'subjectName', 'name'])).trim() || null;
          const subjId = toIdStr(pick(e, ['soldierID', 'soldierId', 'subjectID', 'subjectId', 'id']));
          const key = subjName ? keyFromName(subjName) : subjId ? keyFromIdToken(subjId) : null;
          const val = readHrValue(e);
          if (key && val != null) hrMap.set(key, val);
        }
      }
      return { commander, missing, compromised, unqualified, cutOff, hrMap };
    },
    [mission, sortedEvents, keyFromIdToken, keyFromName]
  );

  const nowMs = startMs + t;
  const latestRef = useRef(new Map());

  const roster = useMemo(() => {
    const { commander, missing, compromised, unqualified, cutOff, hrMap } = stateAt(nowMs);

    const latest = new Map();
    for (const row of sortedData) {
      const ts = toMs(row.time_sent);
      if (ts > nowMs) break;
      const key = keyFromIdToken(toIdStr(row.soldierId)); 
      if (cutOff.has(key) && ts > cutOff.get(key)) continue;
      latest.set(key, row);
    }
    latestRef.current = latest;

    const list = [];
    latest.forEach((row, key) => {
      const { latitude, longitude } = row;
      const ts = toMs(row.time_sent);
      const age = nowMs - ts;

      let status = 'ok';
      if (key === commander) status = 'commander';
      else if (compromised.has(key)) status = 'compromised';
      else if (missing.has(key)) status = 'missing';
      else if (unqualified.has(key)) status = 'unqualified';

      const name = displayName(toIdStr(row.soldierId));
      const hr = hrMap.has(key) ? hrMap.get(key) : null;

      list.push({
        id: key,
        name,
        hr,
        status,
        lastUpdateMs: age,
        lat: latitude,
        lng: longitude,
      });
    });

    const weight = { commander: 0, compromised: 1, missing: 2, unqualified: 3, ok: 4 };
    list.sort((a, b) => weight[a.status] - weight[b.status] || a.name.localeCompare(b.name));
    return list;
  }, [sortedData, displayName, stateAt, nowMs, keyFromIdToken]);

  useEffect(() => {
    if (!mapRef.current) return;

    markersLayerRef.current.clearLayers();
    eventsLayerRef.current.clearLayers();

    for (const s of roster) {
      const label = s.name?.[0]?.toUpperCase() ?? '';
      const icon = divIcon(s.status, label);

      L.marker([s.lat, s.lng], { icon, pane: 'markersPane' })
        .bindTooltip(`${s.name} • HR ${s.hr ?? '—'}`, {
          permanent: true,
          direction: 'top',
          className: styles.tip,
        })
        .addTo(markersLayerRef.current);
    }

    const first = sortedData[0];
    for (const e of sortedEvents) {
      const ts = eventTs(e);
      if (ts > nowMs) break;

      let subjectName =
        e.eventName === 'commanderSwitch'
          ? asStr(pick(e, ['newCommanderID', 'newCommander'])).trim()
          : e.eventName === 'missingSoldier'
            ? asStr(pick(e, ['missingID', 'missingName'])).trim()
            : e.eventName === 'compromisedSoldier'
              ? asStr(pick(e, ['compromisedID', 'compromisedName'])).trim()
              : isHrEvent(e)
                ? asStr(pick(e, ['soldierName', 'subjectName', 'name'])).trim()
                : '';

      const subjectId = toIdStr(pick(e, ['soldierID', 'soldierId', 'subjectID', 'subjectId', 'id']));

      let evLat = e.latitude;
      let evLng = e.longitude;

      if ((evLat == null || evLng == null) && (subjectName || subjectId)) {
        const key =
          subjectName ? keyFromName(subjectName) : isMongoId(subjectId) ? keyFromIdToken(subjectId) : null;
        if (key) {
          const row = latestRef.current.get(key);
          if (row) {
            evLat = row.latitude;
            evLng = row.longitude;
          }
        }
      }

      if (evLat == null || evLng == null) {
        const c = mapRef.current.getCenter?.();
        if (c) {
          evLat = c.lat;
          evLng = c.lng;
        } else if (first) {
          evLat = first.latitude;
          evLng = first.longitude;
        } else continue;
      }

      const { icon, label } = eventMeta(e);
      const who =
        subjectName ||
        (isMongoId(subjectId) ? displayName(subjectId) : asStr(subjectId).trim()) ||
        '';
      const hrPart = isHrEvent(e) ? ` ${readHrValue(e) ?? ''}` : '';
      const tip = `${label}${hrPart}${who ? ' • ' + who : ''} @ ${new Date(ts).toLocaleTimeString()}`;

      L.marker([evLat, evLng], {
        pane: 'eventsPane',
        zIndexOffset: 10000,
        icon: L.divIcon({
          className: styles.eventIcon,
          html: icon,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
      })
        .bindTooltip(tip, { className: styles.tip })
        .addTo(eventsLayerRef.current);
    }
  }, [roster, sortedEvents, nowMs, displayName, keyFromIdToken, keyFromName, sortedData]);

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
    try {
      mapRef.current?.setView([lat, lng], 16, { animate: true });
    } catch { }
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
            onClick={() => {
              setT(0);
              setPlaying(false);
            }}
            title="Go to start"
          >
            ⏮
          </button>

          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pause' : 'Play'}
          </button>

          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => {
              setT(durationMs);
              setPlaying(false);
            }}
            title="Go to end"
            disabled={!durationMs}
          >
            ⏭
          </button>

          <label className={styles.speed}>
            Speed
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
            </select>
          </label>

          <div className={styles.time}>{fmtClock(t)} / {fmtClock(durationMs)}</div>
        </div>
      </div>

      <br />

      {/* main grid */}
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
                    <div className={styles.cardTitle}>
                      {s.name}{' '}
                      {s.status === 'commander' && (
                        <span className={`${styles.chip} ${styles['chip--commander']}`}>COMMANDER</span>
                      )}
                    </div>
                    <div className={styles.cardMeta}>
                      {s.status !== 'commander' && (
                        <>
                          <span className={`${styles.chip} ${styles['chip--' + s.status]}`}>
                            {s.status === 'ok' ? 'OK' : s.status}
                          </span>
                          <span className={styles.dotSep} />
                        </>
                      )}
                      <span className={styles.hr}>HR {s.hr ?? '—'}</span>
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
        <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.ldCommander}`} /> Commander</span>
        <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.ldOk}`} /> Soldier</span>
        <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.ldComp}`} /> Compromised</span>
        <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.ldMiss}`} /> Missing</span>
        <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.ldUnqualified}`} /> Unqualified Cmdr</span>
        <span className={styles.legendItem}><span className={styles.eventDot}>💓</span> HR Event</span>
        <span className={styles.legendItem}><span className={styles.eventDot}>🎖</span> Commander Switch</span>
      </div>
    </div>
  );
}
