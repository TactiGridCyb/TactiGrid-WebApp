
export async function geocode(address) {
  if (!address?.trim()) throw new Error('Please enter an address first.');

  const endpoint =
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;

  const res = await fetch(endpoint, {
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


async function hit(endpoint, signal) {
  const res = await fetch(endpoint, { signal });
  if (!res.ok) throw new Error(`Request failed ${res.status}`);
  return res.json();
}


export function fetchSoldiers(term = '', signal) {
  const url = term
    ? `/api/soldiers?role=Soldier&search=${encodeURIComponent(term)}`
    : `/api/soldiers?role=Soldier&all=1`;
  return hit(url, signal);
}

export function fetchCommanders(term = '', signal) {
  const url = term
    ? `/api/soldiers?role=Commander&search=${encodeURIComponent(term)}`
    : `/api/soldiers?role=Commander&all=1`;
  return hit(url, signal);
}


export function fetchConfigs(term = '', signal) {
  const url = term
    ? `/api/configs?search=${encodeURIComponent(term)}`
    : `/api/configs`;                 
  return hit(url, signal);
}