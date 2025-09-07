"use client";

import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/componentsDesign/CreateMissionDialog.css"; 


const normalize = (doc) => ({
  _id: doc._id?.toString?.() ?? doc._id,
  fullName: doc.fullName ?? doc.name ?? "—",
  IDF_ID: doc.IDF_ID ?? "",
  role: doc.role ?? "Soldier",
});
async function fetchJSON(input, init) {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
const debounce = (fn, ms) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };


export default function PersonPicker({ role, values, setValues }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState([]); 
  const already = useMemo(() => new Set(values), [values]);


  useEffect(() => {
    const ids = Array.isArray(values) ? values : [];
    if (!ids.length) { setSelected([]); return; }

    let ignore = false;
    (async () => {
      try {
        const { map } = await fetchJSON("/api/soldiers/names", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (ignore) return;
        const objs = ids.map((id) => (map?.[id] ? normalize({ _id: id, ...map[id] }) : null)).filter(Boolean);
        setSelected(objs);
      } catch {/* ignore */}
    })();
    return () => { ignore = true; };
  }, [values]);

  const doSearch = useMemo(() => debounce(async (q, ctl) => {
    try {
      const base = `/api/soldiers?role=${encodeURIComponent(role)}`;
      const url = q.trim() ? `${base}&search=${encodeURIComponent(q.trim())}` : `${base}&all=1`;
      const data = await fetchJSON(url, { signal: ctl.signal });
      setResults((Array.isArray(data) ? data : []).map(normalize));
    } catch {/* ignore abort */} finally { setLoading(false); }
  }, 300), [role]);

  const abortRef = useRef(null);
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLoading(true);
    doSearch(query, ctl);
    return () => ctl.abort();
  }, [query, doSearch]);

  const pushIdsFromObjs = useCallback((objs) => setValues(objs.map((o) => o._id)), [setValues]);

  const add = useCallback((p) => {
    if (already.has(p._id)) return;
    const next = [...selected, p];
    setSelected(next);
    pushIdsFromObjs(next);
  }, [already, selected, pushIdsFromObjs]);

  const removeId = useCallback((id, e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const next = selected.filter((x) => x._id !== id);
    setSelected(next);
    pushIdsFromObjs(next);
  }, [selected, pushIdsFromObjs]);

  const move = useCallback((from, to, e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (to < 0 || to >= selected.length) return;
    const next = selected.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setSelected(next);
    pushIdsFromObjs(next);
  }, [selected, pushIdsFromObjs]);

  return (
    <div
      className="pp"
      onKeyDownCapture={(e) => { if (e.key === "Enter") e.preventDefault(); }}
    >
      <div className="pp-head">
        <input
          className="pp-search"
          placeholder={`Search ${role.toLowerCase()}s…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={`Search ${role.toLowerCase()}s`}
        />
        <span className="pp-count">{selected.length} selected</span>
      </div>

      <div className="pp-body">
        {/* Results */}
        <div className="pp-results">
          {loading && <div className="pp-loading"><div className="ring" /></div>}
          {!loading && (
            <ul className="pp-list" role="listbox" aria-label={`${role} search results`}>
              {results.map((p) => {
                const isAdded = already.has(p._id);
                return (
                  <li
                    key={p._id}
                    className="pp-item"
                    role="option"
                    aria-selected={isAdded}
                    onClick={() => !isAdded && add(p)}
                  >
                    <span className="pp-avatar fallback">{(p.fullName || "?").slice(0, 1)}</span>
                    <div className="pp-m">
                      <div className="pp-name">{p.fullName}</div>
                      <div className="pp-rank">
                        {p.role}{p.IDF_ID ? ` • ${p.IDF_ID}` : ""}
                      </div>
                    </div>
                    <button
                      type="button"                 
                      className="pp-add"
                      aria-label={isAdded ? "Added" : "Add"}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); !isAdded && add(p); }}
                      disabled={isAdded}
                    >
                      {isAdded ? "Added" : "Add"}
                    </button>
                  </li>
                );
              })}
              {results.length === 0 && <li className="pp-empty">No matches</li>}
            </ul>
          )}
        </div>

        {/* Selected chips */}
        <div className="pp-selected glass">
          <div className="pp-selected-title">{role}s</div>
          {selected.length === 0 && <div className="pp-selected-empty">None selected yet</div>}
          <ul className="pp-chips">
            {selected.map((p, idx) => (
              <li key={p._id} className="pp-chip">
                <button
                  type="button"                 
                  className="pp-chip-move"
                  onClick={(e) => move(idx, idx - 1, e)}
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"                 
                  className="pp-chip-move"
                  onClick={(e) => move(idx, idx + 1, e)}
                  aria-label="Move down"
                >
                  ↓
                </button>
                <span className="pp-chip-avatar fallback">{(p.fullName || "?").slice(0, 1)}</span>
                <div className="pp-chip-main">
                  <div className="pp-chip-name">{p.fullName}</div>
                  <div className="pp-chip-rank">{p.role}{p.IDF_ID ? ` • ${p.IDF_ID}` : ""}</div>
                </div>
                <button
                  type="button"                 
                  className="pp-chip-x"
                  onClick={(e) => removeId(p._id, e)}
                  aria-label="Remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

PersonPicker.propTypes = {
  role: PropTypes.oneOf(["Soldier", "Commander"]).isRequired,
  values: PropTypes.arrayOf(PropTypes.string).isRequired,
  setValues: PropTypes.func.isRequired,
};
