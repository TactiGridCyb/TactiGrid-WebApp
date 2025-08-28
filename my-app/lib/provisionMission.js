/* eslint-disable no-console */
// lib/provisionMission.js
import tls from 'tls';
import mongoose from 'mongoose';
import forge from 'node-forge';

import dbConnect from '@/lib/mongoose';
import { getCA } from '@/lib/caLoader';

import Certificate from '@/models/Certificate';
import Soldier from '@/models/Soldier';
import { issueCertificate } from '@/lib/issueCertificate';
import { runMissionConfiguration } from '@/scripts/runConfig.js';

const DEFAULT_PORT = Number(process.env.PROVISION_PORT || 8743);
const DEFAULT_HOST = process.env.PROVISION_HOST || '0.0.0.0';

// survive dev hot reloads
const g = globalThis;
g.__prov_sessions ??= new Map();   // missionId -> { stop, resend, key }
g.__prov_portLocks ??= new Map();  // "host:port" -> missionId
const sessions = g.__prov_sessions;
const portLocks = g.__prov_portLocks;

const portKey = (host, port) => `${host}:${port}`;
const toPemList = (docs) => docs.map((d) => d.certPem);

const stubName = async (id) => {
  const s = await Soldier.findById(id).lean();
  return s?.fullName?.toString() || `P#${id.toString().slice(-4)}`;
};

async function upsertCert(missionId, id, fullName, isCommander) {
  let doc = await Certificate.findOne({ subjectId: id, missionId });
  if (doc) return doc;
  const signed = await issueCertificate({ fullName, subjectId: id, isCommander });
  return Certificate.create({ subjectId: id, fullName, isCommander, missionId, ...signed });
}

function jsonSafeWrite(socket, obj) {
  try { socket.write(JSON.stringify(obj)); } catch {}
  try { socket.end(); } catch {}
}

/**
 * Start a TLS provisioning server for a mission.
 * Immediate-send mode: client connects → server sends next bundle (no hello).
 */
export async function startMissionProvision({
  missionId,
  soldiers = [],
  commanders = [],
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  force = true,
}) {
  // Stop any previous session for this mission
  if (sessions.has(missionId)) {
    await sessions.get(missionId).stop().catch(() => {});
    sessions.delete(missionId);
  }

  // Ensure global mongoose connection
  const conn = await dbConnect();
  if ((conn.connection?.readyState ?? mongoose.connection.readyState) !== 1) {
    throw new Error('Mongo is not connected');
  }

  // Port ownership
  const key = portKey(host, port);
  const occupiedBy = portLocks.get(key);
  if (occupiedBy && occupiedBy !== missionId) {
    if (!force) throw new Error(`EADDRINUSE ${key}`);
    await stopMissionProvision(occupiedBy).catch(() => {});
  }

  // Mission configuration
  const cfg = await runMissionConfiguration(missionId);
  const GMK = cfg.gmk;
  const FREQS = cfg.fhf;
  const INTERVAL = cfg.interval || 2000;

  // CA material (via shared connection)
  const { certPem: caCertPem, keyPem: caKeyPem } = await getCA();

  // Ensure subject certs exist
  const soldierDocs = await Promise.all(
    soldiers.map(async (id) => upsertCert(missionId, id, await stubName(id), false))
  );
  const commanderDocs = await Promise.all(
    commanders.map(async (id) => upsertCert(missionId, id, await stubName(id), true))
  );
  const soldierPEMs   = toPemList(soldierDocs);
  const commanderPEMs = toPemList(commanderDocs);

  // Recipient queue
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
    jsonSafeWrite(socket, payload);

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

  // TLS server — send immediately on connect (no client hello required)
  const server = tls.createServer({ key: caKeyPem, cert: caCertPem }, (socket) => {
    sockets.add(socket);
    fulfill(socket, nextRecipient());
    const cleanup = () => sockets.delete(socket);
    socket.once('close', cleanup);
    socket.once('error', cleanup);
  });

  const stop = async () => {
    for (const s of sockets) { try { s.destroy(); } catch {} }
    await new Promise((r) => server.close(() => r())); // release port fully
    portLocks.delete(key);
    console.log('Provision session closed:', missionId);
  };

  await new Promise((resolve, reject) => {
    server.once('error', (e) => {
      if (e?.code === 'EADDRINUSE') reject(new Error(`EADDRINUSE ${key}`));
      else reject(e);
    });
    server.listen(port, host, () => {
      portLocks.set(key, missionId);
      console.log(`TLS provision server listening on ${host}:${port}`);
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
