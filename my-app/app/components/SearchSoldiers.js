'use client';
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './SearchSoldiers.css';          // spinner styles

export default function SearchSoldiers({ onSelect }) {
  const [query,   setQuery]   = useState('');
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(false);

  const abortRef = useRef(null);

  // Debounced fetch whenever `query` changes
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();         // cancel in-flight fetch

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(() => {
      const url = query
        ? `/api/soldiers?search=${encodeURIComponent(query)}`
        : `/api/soldiers?all=1`;

      fetch(url, { signal: controller.signal })
        .then(r => r.json())
        .then(setItems)
        .catch(() => {})      // ignore abort errors
        .finally(() => setLoading(false));
    }, 300);                  // 300 ms debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="soldier-search">
      <input
        className="ss-input"
        placeholder="Search soldiers…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {loading && (
        <div className="spinner-wrapper">
          <div className="spinner" />
        </div>
      )}

      {!loading && (
        <ul className="results">
          {items.map(s => (
            <li key={s._id}
                onClick={() => onSelect(s)}
                className="result-item">
              {s.rank && <span className="rank">{s.rank}</span>} {s.name}
            </li>
          ))}
          {items.length === 0 && <li className="no-hit">No matches</li>}
        </ul>
      )}
    </div>
  );
}

SearchSoldiers.propTypes = {
  /** callback receives the clicked soldier object */
  onSelect: PropTypes.func.isRequired,
};
