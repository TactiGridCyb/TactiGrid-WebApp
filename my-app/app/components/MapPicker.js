'use client';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import useMapPin from '../hooks/useMapPin';
import { geocode } from '@/lib/missionHelpers';
import '../styles/componentsDesign/CreateMissionDialog.css';

/* ─── prettier red marker icon (uses leaflet-color-markers CDN) ─── */


const pinIcon = L.divIcon({
  className: 'css-pin',   // match the CSS class you just added
  iconSize:   [24, 30],   // 24 head + 6-pixel triangle
  iconAnchor: [12, 30],   // tip of the triangle is the “point”
});
 
/* ─── child component to capture clicks ─── */
function ClickHandler({ move }) {
  useMapEvents({
    click(e) {
      move(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({ value, onChange }) {
  const { pos, movePin, registerMap } = useMapPin(value);

  /* update both hook + RHF */
  const setPos = (lat, lng) => {
    movePin(lat, lng);
    onChange({ lat, lng });
  };

  /* helper for the Search button / Enter key */
  const handleSearch = async (inputEl) => {
    if (!inputEl.value.trim()) return;
    try {
      const { lat, lng } = await geocode(inputEl.value);
      setPos(lat, lng);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="field">
      <label>General Location</label>

      {/* ── address search ────────────────────────── */}
      <div className="address-row">
        <input
          className="input flex"
          placeholder="Search address"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(e.currentTarget)}
        />
        <button
          type="button"
          className="btn"
          onClick={(e) => handleSearch(e.currentTarget.previousSibling)}
        >
          Search
        </button>
      </div>

      {/* ── map with red pin ──────────────────────── */}
      <div className="map-wrapper">
        <MapContainer
          center={[pos.lat, pos.lng]}
          zoom={13}
          whenCreated={registerMap}
          scrollWheelZoom
          className="map"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[pos.lat, pos.lng]} icon={pinIcon} />
          <ClickHandler move={setPos} />
        </MapContainer>
      </div>

      {/* ── live coordinates read-out ──────────────── */}
      <div style={{ marginTop: '.5rem', fontSize: '.9rem', color: '#cbd5e1' }}>
        Lat:&nbsp;<strong>{pos.lat.toFixed(5)}</strong>&nbsp;|&nbsp;
        Lng:&nbsp;<strong>{pos.lng.toFixed(5)}</strong>
      </div>
    </div>
  );
}

MapPicker.propTypes = {
  value:    PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }),
  onChange: PropTypes.func.isRequired,
};
