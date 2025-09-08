import forge    from 'node-forge';
import tls      from 'tls';
import mongoose from 'mongoose';

import Certificate          from '@/models/Certificate';
import Soldier              from '@/models/Soldier';
import RevokedCert          from '@/models/RevokedCert';
import { issueCertificate } from '@/lib/issueCertificate';
import { runMissionConfiguration } from '@/scripts/runConfig.js';
import { interCaLoader } from '@/lib/interCaLoader';

let GMK;
let FREQS;
let INTERVAL = 2000;

const PASS = '12345';
const PORT = 8743;

const g = globalThis;
g.__provisionTLS ??= null;

const getState = () => g.__provisionTLS;
const setState = (s) => (g.__provisionTLS = s);

const toPemList = (docs) => docs.map((d) => d.certPem);

const stubName = async (id) => {
  const soldier = await Soldier.findById(id).lean();
  return soldier?.fullName?.toString() || `P#${id.toString().slice(-4)}`;
};

async function ensureFreshCert(missionId, subjectId, fullName, isCommander) {
  const old = await Certificate.find({ subjectId, missionId });
  if (old.length) {
    await RevokedCert.collection.createIndex({ serial: 1 }, { unique: true });
    for (const cert of old) {
      try {
        const serial = forge.pki.certificateFromPem(cert.certPem).serialNumber;
        await RevokedCert.updateOne(
          { serial },
          { $setOnInsert: { serial }, $set: { revokedAt: new Date() } },
          { upsert: true }
        );
      } catch (e) {
        console.warn('[provision] failed to parse certPem for revocation:', e?.message);
      }
    }
    await Certificate.deleteMany({ _id: { $in: old.map(c => c._id) } });
  }
  const signed = await issueCertificate({ fullName, subjectId, isCommander });
  const doc = await Certificate.create({
    subjectId,
    fullName,
    isCommander,
    missionId,
    ...signed,
  });
  return doc;
}

function safeWriteAndEnd(socket, payload) {
  try { socket.write(JSON.stringify(payload)); } catch {}
  try { socket.end(); } catch {}
}

function attachSocketGuards(socket, socketsSet) {
  socketsSet.add(socket);
  const cleanup = () => socketsSet.delete(socket);
  socket.on('close', cleanup);
  socket.on('error', (err) => {
    if (err?.code !== 'ECONNRESET') console.warn('[provision] socket error:', err?.message);
    cleanup();
  });
}

async function stopActiveServer() {
  const st = getState();
  if (!st?.server) return;
  st.closing = true;
  for (const s of st.sockets) { try { s.destroy(); } catch {} }
  await new Promise((resolve) => {
    try { st.server.close(() => resolve()); }
    catch { resolve(); }
  });
  setState(null);
  console.log('[provision] previous TLS server closed');
}

export async function startMissionProvision({ missionId, soldiers, commanders }) {
  await stopActiveServer();
  const cfgOut = await runMissionConfiguration(missionId);
  GMK      = cfgOut.gmk;
  FREQS    = cfgOut.fhf;
  INTERVAL = cfgOut.interval;
  console.log('GMK (32-hex):', GMK);
  console.log('FHF:', FREQS);
  console.log('interval:', INTERVAL, 'ms');
  await mongoose.connect(process.env.MONGODB_URI);
  const pki = forge.pki;
  const { certPem: caCertPem, keyPem: caKeyPem } = await interCaLoader();
  const soldierDocs = await Promise.all(
    soldiers.map(async (id) =>
      ensureFreshCert(missionId, id, await stubName(id), false)
    )
  );
  const commanderDocs = await Promise.all(
    commanders.map(async (id) =>
      ensureFreshCert(missionId, id, await stubName(id), true)
    )
  );
  const soldierPEMs   = toPemList(soldierDocs);
  const commanderPEMs = toPemList(commanderDocs);
  const queueIds    = [...commanders, ...soldiers].map(String);
  let index         = 0;
  const resendQueue = [];
  const sockets = new Set();
  const pickNext = () => {
    if (resendQueue.length) return resendQueue.shift();
    if (index < queueIds.length) return queueIds[index++];
    return null;
  };
  const server = tls.createServer(
    { key: caKeyPem, cert: caCertPem },
    async (socket) => {
      attachSocketGuards(socket, sockets);
      const subjectId = pickNext();
      if (!subjectId) { try { socket.end(); } catch {}; return; }
      const doc = await Certificate.findOne({ subjectId, missionId });
      if (!doc) { try { socket.destroy(); } catch {}; return; }
      const basePayload = {
        certificate   : doc.certPem + doc.keyPem,
        caCertificate : caCertPem,
        Mission       : missionId,
        gmk           : GMK,
        frequencies   : FREQS,
        intervalMs    : INTERVAL,
      };
      const payload = doc.isCommander
        ? { ...basePayload, soldiers: soldierPEMs, commanders: commanderPEMs }
        : { ...basePayload, commanders: commanderPEMs };
      safeWriteAndEnd(socket, payload);
      const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      try {
        await fetch(`${BASE}/api/provision/ping`, {
          method : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-provision': '1',
          },
          body   : JSON.stringify({ missionId, subjectId }),
        });
      } catch (e) {
        console.warn('[provision] ping failed:', e?.message);
      }
      console.log(`bundle sent to ${doc.fullName}`);
      if (index === queueIds.length && resendQueue.length === 0) {
        console.log('All devices provisioned — shutting TLS server');
        setTimeout(() => { stopActiveServer().catch(() => {}); }, 50);
      }
    }
  );
  server.on('error', (err) => {
    if (err?.code === 'ECONNRESET') return;
    console.warn('[provision] TLS server error:', err?.message || err);
  });
  server.on('clientError',  (_err, socket) => { try { socket?.destroy(); } catch {} });
  server.on('tlsClientError',(_err, socket) => { try { socket?.destroy(); } catch {} });
  setState({ server, missionId, queueIds, indexRef: () => index, setIndex: v => (index = v), resendQueue, sockets, closing: false });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, () => {
      console.log(`TLS provision server listening on :${PORT}`);
      resolve();
    });
  });
  return { ok: true, message: `TLS provision server listening on :${PORT}`, port: PORT };
}

export function queueResend({ missionId, subjectId }) {
  const st = getState();
  if (!st?.server) throw new Error('No active provision server');
  if (String(st.missionId) !== String(missionId))
    throw new Error('Resend requested for a different mission than the active one');
  const s = String(subjectId);
  const q = st.resendQueue;
  const i = q.indexOf(s);
  if (i !== -1) q.splice(i, 1);
  q.unshift(s);
  console.log('[provision] queued resend to head for', subjectId);
  return { ok: true };
}

export async function stopProvision() {
  await stopActiveServer();
  return { ok: true };
}

export async function restartProvision({ missionId, soldiers, commanders }) {
  await stopActiveServer();
  return startMissionProvision({ missionId, soldiers, commanders });
}
