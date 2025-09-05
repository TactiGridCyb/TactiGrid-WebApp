'use client';
import PropTypes from 'prop-types';
import useDebouncedSearch from '../hooks/useDebouncedSearch';
import { fetchConfigs } from '@/lib/missionHelpers';
import '../styles/componentsDesign/CreateMissionDialog.css';

export default function ConfigPicker({ value, onChange }) {
  const { query, setQuery, items, loading } = useDebouncedSearch(fetchConfigs);

  const fmtInterval = (n) => {
    if (!Number.isFinite(n)) return '—';
    // show nice units (e.g., 2s, 500ms)
    return n >= 1000 ? `${Math.round(n / 100) / 10}s` : `${n}ms`;
  };

  const countKeys = (obj) =>
    obj && typeof obj === 'object' ? Object.keys(obj).length : 0;

  return (
    <div className="cfg-picker">
      {/* Search */}
      <div className="cfg-search">
        <input
          className="cfg-input"
          placeholder="Search configurations…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search configurations"
        />
        {loading && (
          <div className="cfg-spinner" aria-label="Loading" />
        )}
      </div>

      {/* Results */}
      <div className="cfg-options" role="radiogroup" aria-label="Configurations">
        {!loading && items.length === 0 && (
          <div className="cfg-empty">No matches</div>
        )}

        {!loading && items.map((c) => {
          const id = String(c._id);
          const selected = value === id;
          const gmkParams = countKeys(c?.parameters?.gmk);
          const fhfParams = countKeys(c?.parameters?.fhf);

          return (
            <label
              key={id}
              className={`cfg-card ${selected ? 'is-selected' : ''}`}
            >
              <input
                type="radio"
                name="configRadio"
                checked={selected}
                onChange={() => onChange(id)}
                className="sr-only"
              />

              {/* Top line: function names */}
              <div className="cfg-card-head">
                <div className="cfg-fns">
                  <div className="cfg-fn">
                    <span className="cfg-fn-label">GMK</span>
                    <code className="cfg-code">{c.gmkFunction || '—'}</code>
                  </div>
                  <div className="cfg-sep">·</div>
                  <div className="cfg-fn">
                    <span className="cfg-fn-label">FHF</span>
                    <code className="cfg-code">{c.fhfFunction || '—'}</code>
                  </div>
                </div>

                {/* Right side: interval pill */}
                <span className="cfg-pill" title="FHF Interval">
                  ⏱ {fmtInterval(c.fhfInterval)}
                </span>
              </div>

              {/* Meta row */}
              <div className="cfg-meta">
                <span className="cfg-chip" title="GMK parameters count">
                  GMK params: {gmkParams}
                </span>
                <span className="cfg-chip" title="FHF parameters count">
                  FHF params: {fhfParams}
                </span>
                {c.createdAt && (
                  <span className="cfg-chip dim" title="Created">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>

      <style jsx>{`
        .cfg-picker { display: grid; gap: 12px; }

        .cfg-search {
          position: relative;
          display: flex;
          align-items: center;
        }

        .cfg-input {
          width: 100%;
          padding: 10px 40px 10px 12px;
          border: 1px solid rgba(0,0,0,0.15);
          border-radius: 10px;
          background: rgba(255,255,255,0.8);
          outline: none;
        }
        .cfg-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }

        .cfg-spinner {
          position: absolute;
          right: 10px;
          width: 18px; height: 18px;
          border-radius: 50%;
          border: 2px solid rgba(0,0,0,0.2);
          border-top-color: #6366f1;
          animation: spin 0.8s linear infinite;
        }

        .cfg-options { display: grid; gap: 10px; }
        .cfg-empty { padding: 10px; color: #666; }

        .cfg-card {
          display: grid;
          gap: 8px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.12);
          background: #fff;
          transition: border-color .15s, box-shadow .15s, transform .06s;
          cursor: pointer;
        }
        .cfg-card:hover {
          border-color: #c7d2fe;
          box-shadow: 0 6px 18px rgba(0,0,0,0.06);
        }
        .cfg-card.is-selected {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }

        .cfg-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .cfg-fns { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .cfg-fn { display: flex; align-items: center; gap: 6px; }
        .cfg-fn-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: .04em;
        }
        .cfg-sep { color: #9ca3af; }

        .cfg-code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 6px;
          background: #f3f4f6;
          color: #111827;
        }

        .cfg-pill {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 999px;
          background: #eef2ff;
          color: #3730a3;
          border: 1px solid #c7d2fe;
          white-space: nowrap;
        }

        .cfg-meta { display: flex; gap: 8px; flex-wrap: wrap; }
        .cfg-chip {
          font-size: 12px;
          padding: 3px 8px;
          border-radius: 999px;
          background: #f3f4f6;
          color: #374151;
        }
        .cfg-chip.dim {
          background: #f9fafb;
          color: #6b7280;
        }

        .sr-only {
          position: absolute; 
          width: 1px; height: 1px; 
          padding: 0; margin: -1px; 
          overflow: hidden; clip: rect(0,0,0,0); 
          white-space: nowrap; border: 0;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

ConfigPicker.propTypes = {
  value:    PropTypes.string,      // selected _id (or '')
  onChange: PropTypes.func.isRequired,
};
