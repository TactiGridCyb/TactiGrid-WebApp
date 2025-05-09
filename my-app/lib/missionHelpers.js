/**
 * lib/missionHelpers.js
 * ------------------------------------------------------------
 * Pure client-side helpers for the “Create Mission” dialog.
 * All functions return plain JSON objects and accept an optional
 * AbortSignal so you can cancel in-flight fetches.
 * ------------------------------------------------------------
 */

/* ───────────────────────── 1. Address → coordinates ───────────────────────── */

/**
 * Convert a free-text address into { lat, lng } using the public
 * OpenStreetMap / Nominatim geocoder.
 *
 * @param  {string} address
 * @return {Promise<{ lat:number, lng:number }>}
 */
export async function geocode(address) {
  if (!address?.trim()) throw new Error('Please enter an address first.');

  const endpoint =
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;

  const res = await fetch(endpoint, {
    // polite User-Agent header (Nominatim’s usage policy asks for it)
    headers: { 'User-Agent': 'TactiGrid-MissionPlanner/1.0 (https://your-domain)' }
  });

  if (!res.ok) throw new Error(`Geocoder error ${res.status}`);

  const data = await res.json();
  if (data.length === 0) throw new Error('Address not found.');

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon)
  };
}

/* ──────────────────────── 2. Generic API fetch helper ─────────────────────── */

async function hit(endpoint, signal) {
  const res = await fetch(endpoint, { signal });
  if (!res.ok) throw new Error(`Request failed ${res.status}`);
  return res.json();
}

/* ───────────────────────────── 3. Soldiers API ────────────────────────────── */

/**
 * Fetch soldiers from your own /api endpoint.
 * • term === ''  →  /api/soldiers?all=1
 * • term !== ''  →  /api/soldiers?search=<term>
 *
 * @param  {string} term        search string (empty for “all”)
 * @param  {AbortSignal?} signal optional AbortController.signal
 * @return {Promise<Array<{ _id:string, name:string, rank?:string }>>}
 */
/* only real soldiers */
export function fetchSoldiers(term = '', signal) {
  const url = term
    ? `/api/soldiers?role=Soldier&search=${encodeURIComponent(term)}`
    : `/api/soldiers?role=Soldier&all=1`;
  return hit(url, signal);
}

/* only commanders */
export function fetchCommanders(term = '', signal) {
  const url = term
    ? `/api/soldiers?role=Commander&search=${encodeURIComponent(term)}`
    : `/api/soldiers?role=Commander&all=1`;
  return hit(url, signal);
}
