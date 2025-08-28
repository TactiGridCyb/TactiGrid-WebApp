"use client";

import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/componentsDesign/CreateMissionDialog.css";

/* Recenter when position changes */
function RecenterOnPosition({ position }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: true });
  }, [map, position]);
  return null;
}

/* Invalidate map size when dialog/layout changes */
function InvalidateOnResize({ containerRef }) {
  const map = useMap();
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [map, containerRef]);
  return null;
}

/* Click anywhere to move the pin */
function ClickToMove({ onMove }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/* Simple OpenStreetMap forward+reverse geocoder (no key required) */
async function forwardGeocode(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const arr = await res.json();
  if (!arr?.length) throw new Error("Address not found");
  return {
    lat: Number(arr[0].lat),
    lng: Number(arr[0].lon),
    formatted: arr[0].display_name,
  };
}
async function reverseGeocode({ lat, lng }) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const data = await res.json();
  return data?.display_name || "";
}

export default function MapPicker({ value, onChange }) {
  const [pos, setPos] = useState({
    lat: Number(value?.lat ?? 31.7717),
    lng: Number(value?.lng ?? 35.217),
  });
  const [address, setAddress] = useState(value?.address ?? "");
  const [busy, setBusy] = useState(false);

  const wrapperRef = useRef(null);

  const pinIcon = useMemo(() => L.divIcon({
    className: "css-pin",
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    html: "",
  }), []);

  const setPosBoth = useCallback(async (lat, lng, maybeAddress) => {
    setPos({ lat, lng });
    let addr = maybeAddress ?? address ?? "";
    if (maybeAddress === undefined) {
      // update address by reverse geocoding (debounced by user actions)
      try { addr = await reverseGeocode({ lat, lng }); } catch {}
    }
    setAddress(addr);
    onChange?.({ lat, lng, address: addr });
  }, [onChange, address]);

  const handleSearch = useCallback(async () => {
    const q = address?.trim();
    if (!q) return;
    try {
      setBusy(true);
      const { lat, lng, formatted } = await forwardGeocode(q);
      await setPosBoth(lat, lng, formatted);
    } catch (err) {
      alert(err?.message || "Could not find that address.");
    } finally {
      setBusy(false);
    }
  }, [address, setPosBoth]);

  return (
    <div className="map-block" ref={wrapperRef}>
      <div className="map-toolbar">
        <input
          className="cmd-input map-input"
          placeholder="Search address…"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          aria-label="Search address"
        />
        <button type="button" className="cmd-btn cmd-primary" onClick={handleSearch} disabled={busy}>
          {busy ? "Searching…" : "Search"}
        </button>
      </div>

      <div className="map-wrapper">
        <MapContainer
          center={[pos.lat, pos.lng]}
          zoom={13}
          scrollWheelZoom
          className="map"
          attributionControl
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          <Marker
            position={[pos.lat, pos.lng]}
            icon={pinIcon}
            draggable
            eventHandlers={{
              dragend: async (e) => {
                const p = e.target.getLatLng();
                await setPosBoth(p.lat, p.lng);
              },
            }}
          />

          <ClickToMove onMove={(lat, lng) => setPosBoth(lat, lng)} />
          <RecenterOnPosition position={[pos.lat, pos.lng]} />
          <InvalidateOnResize containerRef={wrapperRef} />
        </MapContainer>
      </div>

      <div className="map-readout">
        Lat:&nbsp;<strong>{pos.lat.toFixed(5)}</strong>&nbsp;|&nbsp;
        Lng:&nbsp;<strong>{pos.lng.toFixed(5)}</strong>
      </div>
    </div>
  );
}

MapPicker.propTypes = {
  value:    PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number, address: PropTypes.string }),
  onChange: PropTypes.func.isRequired,
};
