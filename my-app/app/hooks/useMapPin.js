'use client';
import { useState, useRef, useCallback } from 'react';


export default function useMapPin(initial = { lat: 31.7717, lng: 35.217 }) {
  const [pos, setPos] = useState(initial);
  const mapRef = useRef(null);


  const movePin = useCallback((lat, lng) => {
    setPos({ lat, lng });
    if (mapRef.current) mapRef.current.flyTo([lat, lng], mapRef.current.getZoom(), { duration: 0.6 });
  }, []);


  const registerMap = useCallback((map) => { mapRef.current = map; }, []);

  return { pos, movePin, registerMap ,mapRef };
}
