/* eslint-disable no-console */
// lib/provisionMission.js
import tls from 'tls';
import mongoose from 'mongoose';

import dbConnect from '@/lib/mongoose';
import { getCA } from '@/lib/caLoader';

import Certificate from '@/models/Certificate';
import Soldier from '@/models/Soldier';
import { issueCertificate } from '@/lib/issueCertificate';
import { runMissionConfiguration } from '@/scripts/runConfig.js';

const DEFAULT_PORT = Number(process.env.PROVISION_PORT || 8743);
const DEFAULT_HOST = process.env.PROVISION_HOST || '0.0.0.0';

// Persist across hot reloads
const g = globalThis;
g.__prov_sessions ??= new Map();    // missionId -> { stop, resend, key }
g.__prov_portLocks ??= new Map();   // "host:port" -> missionId
const sessions = g.__prov_sessions;
const portLocks = g.__prov_portLocks;

const portKey = (host, port) => `${host}:${port}`;
const toPemList = (docs) => docs.map((d) => d.certPem);

async function soldierName(id) {
  const s = await Soldier.findById(id).lean();
  return s?.fullName?.toString() || `P#${id.toString().slice(-4)}`;
}

async function ensureCert(missionId, id, fullName, isCommander) {
  let doc = await Certificate.findOne({ subjectId: id, missionId });
  if (doc) return doc;
  const signed = await issueCertificate({ fullName, subjectId: id, isCommander });
  return Certificate.create({ subjectId: id, fullName, isCommander, missionId, ...signed });
}

function safeEnd(socket, obj) {
  try { obj && socket.write(JSON.stringify(obj)); } catch {}
  try { socket.end(); } catch {}
}

/** Start TLS provisioning: client connects → server immediately sends bundle (no hello). */
export async function startMissionProvision({
  missionId,
  soldiers = [],
  commanders = [],
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  force = true,
}) {
  console.log('[provision] start', { missionId, host, port, force });

  await dbConnect();
  // 1) Make sure app Mongo is connected (we never close it here)
  const conn = await dbConnect();
  if ((conn.connection?.readyState ?? mongoose.connection.readyState) !== 1) {
    throw new Error('Mongo is not connected');
  }

  // 2) Replace any existing session for this mission
  if (sessions.has(missionId)) {
    await sessions.get(missionId).stop().catch(() => {});
    sessions.delete(missionId);
  }

  // 3) Port lock handling
  const key = portKey(host, port);
  const occupiedBy = portLocks.get(key);
  if (occupiedBy && occupiedBy !== missionId) {
    if (!force) throw new Error(`EADDRINUSE ${key}`);
    await stopMissionProvision(occupiedBy).catch(() => {});
  }

  // 4) Load mission config (GMK/FHF/interval)
  const cfg = await runMissionConfiguration(missionId);
  const GMK = cfg.gmk;
  const FREQS = cfg.fhf;
  const INTERVAL = cfg.interval || 2000;

  // 5) Load CA (via native driver, not Mongoose model)
  const { certPem: caCertPem, keyPem: caKeyPem } = await getCA();

  // Validate cert/key now to avoid crashing on listen()
  try { tls.createSecureContext({ key: caKeyPem, cert: caCertPem }); }
  catch (e) { throw new Error(`[TLS] invalid cert/key: ${e.message}`); }

  // 6) Ensure subject certs exist
  const soldierDocs = await Promise.all(
    soldiers.map(async (id) => ensureCert(missionId, id, await soldierName(id), false))
  );
  const commanderDocs = await Promise.all(
    commanders.map(async (id) => ensureCert(missionId, id, await soldierName(id), true))
  );
  const soldierPEMs   = toPemList(soldierDocs);
  const commanderPEMs = toPemList(commanderDocs);

  // 7) Build queue + helpers
  const allIds = [...commanders, ...soldiers].map(String);
  const unserved    = new Set(allIds);
  const resendQueue = [];
  const sockets     = new Set();

  const buildPayloadFor = async (subjectId) => {
    const doc = await Certificate.findOne({ subjectId, missionId }).lean();
    if (!doc) return null;
    const base = {
      certificate  : doc.certPem + doc.keyPem,
      caCertificate: caCertPem,
      Mission      : missionId,
      gmk          : GMK,
      frequencies  : FREQS,
      intervalMs   : INTERVAL,
    };
    return doc.isCommander
      ? { ...base, soldiers: soldierPEMs, commanders: commanderPEMs }
      : { ...base, commanders: commanderPEMs };
  };

  const nextRecipient = () => {
    if (resendQueue.length) return resendQueue.shift();
    const it = unserved.values().next();
    return it.done ? null : it.value;
  };

  const fulfill = async (socket, subjectId) => {
    if (!subjectId) return socket.destroy();
    const payload = await buildPayloadFor(subjectId);
    if (!payload)  return socket.destroy();
    unserved.delete(subjectId);
    safeEnd(socket, payload);

    // Notify UI (SSE)
    const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    try {
      await fetch(`${BASE}/api/provision/ping`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ missionId, subjectId }),
        cache  : 'no-store'
      });
    } catch {}
  };

  // 8) TLS server — send immediately on connect
  const server = tls.createServer({ key: caKeyPem, cert: caCertPem }, (socket) => {
    sockets.add(socket);
    fulfill(socket, nextRecipient());
    const cleanup = () => sockets.delete(socket);
    socket.on('error', cleanup);
    socket.on('close', cleanup);
  });

  // Harden the server (don’t crash the process)
  server.on('error', (err) => console.error('[provision] TLS server error:', err));
  server.on('tlsClientError', (err, s) => { try { s?.destroy(); } catch {} });
  server.on('clientError', (err, s) => { try { s?.destroy(); } catch {} });

  const stop = async () => {
    for (const s of sockets) { try { s.destroy(); } catch {} }
    await new Promise((r) => server.close(() => r()));
    portLocks.delete(key);
    console.log('[provision] session closed:', missionId);
  };

  // 9) Listen
  await new Promise((resolve, reject) => {
    server.once('error', (e) => reject(e?.code === 'EADDRINUSE' ? new Error(`EADDRINUSE ${key}`) : e));
    server.listen(port, host, () => {
      portLocks.set(key, missionId);
      console.log(`[provision] listening on ${host}:${port}`);
      resolve();
    });
  });

  sessions.set(missionId, { stop, resend: (id) => resendQueue.push(String(id)), key });
  return { ok: true, host, port };
}

export async function stopMissionProvision(missionId) {
  const s = sessions.get(missionId);
  if (!s) return { ok: true, alreadyStopped: true };
  await s.stop();
  sessions.delete(missionId);
  return { ok: true };
}

export async function stopAllProvisionSessions() {
  const ids = Array.from(sessions.keys());
  await Promise.all(ids.map((id) => stopMissionProvision(id).catch(() => {})));
  return { ok: true, stopped: ids };
}

export function resendForSubject(missionId, subjectId) {
  const s = sessions.get(missionId);
  if (!s) throw new Error('No active provisioning session for this mission');
  s.resend(subjectId);
  return { ok: true };
}
