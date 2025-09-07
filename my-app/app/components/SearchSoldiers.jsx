"use client";
import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import "../styles/componentsDesign/SearchSoldiers.css"; 

export default function SearchSoldiers({ onSelect }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const abortRef = useRef(null);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(() => {
      const url = query
        ? `/api/soldiers?search=${encodeURIComponent(query)}`
        : `/api/soldiers?all=1`;

      fetch(url, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => setItems(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="ss glass-card">
      <input
        className="ss-input"
        placeholder="Search soldiers…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search soldiers"
      />

      {loading && (
        <div className="ss-spinner">
          <div className="ring" />
        </div>
      )}

      {!loading && (
        <ul className="ss-results" role="listbox">
          {items.map((s) => (
            <li
              key={s._id}
              onClick={() => onSelect(s)}
              className="ss-item"
              role="option"
            >
              {s.rank && <span className="rank">{s.rank}</span>}
              <span className="name">{s.name}</span>
            </li>
          ))}
          {items.length === 0 && <li className="ss-empty">No matches</li>}
        </ul>
      )}
    </div>
  );
}

SearchSoldiers.propTypes = {
  onSelect: PropTypes.func.isRequired,
};
