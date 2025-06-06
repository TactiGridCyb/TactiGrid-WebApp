'use client';
import PropTypes from 'prop-types';
import useDebouncedSearch from '../hooks/useDebouncedSearch';
import { fetchConfigs } from '@/lib/missionHelpers';
import '../styles/componentsDesign/CreateMissionDialog.css';

export default function ConfigPicker({ value, onChange }) {
  const { query, setQuery, items, loading } = useDebouncedSearch(fetchConfigs);

  return (
    <>
      <input
        className="input"
        placeholder="Search configurations…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && (
        <div className="spinner-wrapper"><div className="spinner" /></div>
      )}

      {!loading && (
        <div className="options">
          {items.map((c) => (
            <label key={c._id} className="option">
              <input
                type="radio"
                name="configRadio"
                checked={value === c._id}
                onChange={() => onChange(c._id)}
              />
              <span className="idf">{c.gmkFunction}</span>
              <span className="name">{c.fhfFunction}</span>
            </label>
          ))}
          {items.length === 0 && <div className="no-hit">No matches</div>}
        </div>
      )}
    </>
  );
}

ConfigPicker.propTypes = {
  value:    PropTypes.string,      // selected _id (or '')
  onChange: PropTypes.func.isRequired,
};
