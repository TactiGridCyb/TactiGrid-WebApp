// lib/sseBus.js
// Tiny in-memory SSE bus: missionId -> Set<controller>
const g = globalThis;
g.__sse_channels ??= new Map();
const channels = g.__sse_channels;

export function subscribe(missionId, controller) {
  const key = String(missionId);
  if (!channels.has(key)) channels.set(key, new Set());
  channels.get(key).add(controller);
}

export function unsubscribe(missionId, controller) {
  const key = String(missionId);
  const set = channels.get(key);
  if (!set) return;
  set.delete(controller);
  if (set.size === 0) channels.delete(key);
}

export function emit(missionId, payload) {
  const key = String(missionId);
  const set = channels.get(key);
  if (!set) return;
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  for (const c of set) {
    try { c.enqueue(line); } catch {}
  }
}
