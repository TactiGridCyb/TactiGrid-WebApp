'use client';
import { useState, useRef, useCallback } from 'react';

/**
 * Hook that manages a single “pin” location on a Leaflet map.
 * Returns the current position, a setter, and a helper that
 * animates (flyTo) the map when you set a new pos.
 */
export default function useMapPin(initial = { lat: 31.7717, lng: 35.217 }) {
  const [pos, setPos] = useState(initial);
  const mapRef = useRef(null);

  /** programmatically move pin *and* center map */
  const movePin = useCallback((lat, lng) => {
    setPos({ lat, lng });
    if (mapRef.current) mapRef.current.flyTo([lat, lng], mapRef.current.getZoom(), { duration: 0.6 });
  }, []);

  /** attach the real Leaflet map instance */
  const registerMap = useCallback((map) => { mapRef.current = map; }, []);

  return { pos, movePin, registerMap };
}
