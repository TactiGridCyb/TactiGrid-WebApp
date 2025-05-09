'use client';
import PropTypes from 'prop-types';
import useDebouncedSearch from '../hooks/useDebouncedSearch';
import { fetchSoldiers, fetchCommanders } from '@/lib/missionHelpers';
import '../styles/componentsDesign/CreateMissionDialog.css';   // spinner + row CSS

/**
 * Generic search-n-select list.
 */
export default function PersonPicker({
  role, values, setValues, selected, setSelected,
}) {
  const fetcher = role === 'Soldier' ? fetchSoldiers : fetchCommanders;
  const { query, setQuery, items, loading } = useDebouncedSearch(fetcher);

  const add    = (p) => !values.includes(p._id) && (
    setValues([...values, p._id]),
    setSelected([...selected, p])
  );
  const remove = (id) => {
    setValues(values.filter((x) => x !== id));
    setSelected(selected.filter((p) => p._id !== id));
  };

  return (
    <>
      <input
        className="input"
        placeholder={`Type to search ${role.toLowerCase()}s…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && (
        <div className="spinner-wrapper"><div className="spinner" /></div>
      )}

      {!loading && (
        <>
          <div className="options">
            {items.map((p) => (
              <label key={p._id} className="option">
                <input
                  type="checkbox"
                  checked={values.includes(p._id)}
                  onChange={(e) => e.target.checked ? add(p) : remove(p._id)}
                />
                <span className="idf">{p.IDF_ID}</span>
                <span className="name">{p.fullName}</span>
              </label>
            ))}
            {items.length === 0 && <div className="no-hit">No matches</div>}
          </div>

          {selected.length > 0 && (
            <>
              <div className="selected-title">Selected:</div>
              <div className="selected-list">
                {selected.map((p) => (
                  <div key={p._id} className="selected-row">
                    <span className="idf">{p.IDF_ID}</span>
                    <span className="name">{p.fullName}</span>
                    <button type="button" className="del" onClick={() => remove(p._id)}>✕</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

PersonPicker.propTypes = {
  role:        PropTypes.oneOf(['Soldier', 'Commander']).isRequired,
  values:      PropTypes.array.isRequired,
  setValues:   PropTypes.func.isRequired,
  selected:    PropTypes.array.isRequired,
  setSelected: PropTypes.func.isRequired,
};
