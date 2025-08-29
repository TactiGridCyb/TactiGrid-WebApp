/* eslint-disable no-console */
import forge    from 'node-forge';
import tls      from 'tls';
import mongoose from 'mongoose';

import Certificate          from '@/models/Certificate';
import Soldier              from '@/models/Soldier';
import { issueCertificate } from '@/lib/issueCertificate';
import { runMissionConfiguration } from '@/scripts/runConfig.js';

/* ── tweakables filled after we inspect the mission ── */
let GMK;                         // 32-char hex
let FREQS;                       // whatever FHF returns
let INTERVAL = 2000;             // ms  (default, overwritten later)

const PASS = '12345';            // decrypt CA private key
const PORT = 8743;               // TLS port

/* ── singleton state so only ONE server runs at a time ── */
const g = globalThis;
g.__provisionTLS ??= null;
/**
 * __provisionTLS shape:
 * { server, missionId, queueIds, index, resendQueue, sockets, closing }
 */
const getState = () => g.__provisionTLS;
const setState = (s) => (g.__provisionTLS = s);

/* util helpers */
const toPemList = (docs) => docs.map((d) => d.certPem);

const stubName = async (id) => {
  const soldier = await Soldier.findById(id).lean();
  return soldier?.fullName?.toString() || `P#${id.toString().slice(-4)}`;
};

async function ensureCert(missionId, subjectId, fullName, isCommander) {
  let doc = await Certificate.findOne({ subjectId, missionId });
  if (doc) return doc;
  const signed = await issueCertificate({ fullName, subjectId, isCommander });
  doc = await Certificate.create({ subjectId, fullName, isCommander, missionId, ...signed });
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
  // Swallow resets so they don't bubble to uncaughtException
  socket.on('error', (err) => {
    if (err?.code !== 'ECONNRESET') console.warn('[provision] socket error:', err?.message);
    cleanup();
  });
}

/* ------------------------------------------------------------------ *
 *  stopActiveServer() - closes any running TLS provision server       *
 * ------------------------------------------------------------------ */
async function stopActiveServer() {
  const st = getState();
  if (!st?.server) return;
  st.closing = true;

  // destroy any open sockets to unblock close
  for (const s of st.sockets) { try { s.destroy(); } catch {} }
  await new Promise((resolve) => {
    try { st.server.close(() => resolve()); }
    catch { resolve(); }
  });

  setState(null);
  console.log('[provision] previous TLS server closed');
}

/* ------------------------------------------------------------------ *
 *  startMissionProvision({ missionId, soldiers, commanders })        *
 *  - ensures singleton; returns when LISTENING                        *
 * ------------------------------------------------------------------ */
export async function startMissionProvision({ missionId, soldiers, commanders }) {
  // guarantee singleton
  await stopActiveServer();

  /* 0️⃣  pull GMK / FHF / interval from the linked Configuration */
  const cfgOut = await runMissionConfiguration(missionId);
  GMK      = cfgOut.gmk;
  FREQS    = cfgOut.fhf;
  INTERVAL = cfgOut.interval;

  console.log('✅ GMK (32-hex):', GMK);
  console.log('✅ FHF:', FREQS);
  console.log('⏱️  interval:', INTERVAL, 'ms');

  /* 1️⃣  connect to Mongo (keep your original behavior) */
  await mongoose.connect(process.env.MONGODB_URI);

  /* 2️⃣  pull Root-CA from DB (unchanged from your working code) */
  const caDoc = await mongoose.connection.db
    .collection('CA')
    .findOne({ _id: 'root-ca' });
  if (!caDoc) throw new Error('Root-CA doc missing');

  const pki        = forge.pki;
  const caCertPem  = caDoc.cert;
  const caKeyPem   = forge.pki.privateKeyToPem(
    pki.decryptRsaPrivateKey(caDoc.privateKey, PASS)
  );

  /* 3️⃣  ensure certificates for every subject in the queue */
  const soldierDocs = await Promise.all(
    soldiers.map(async (id) => ensureCert(missionId, id, await stubName(id), false))
  );
  const commanderDocs = await Promise.all(
    commanders.map(async (id) => ensureCert(missionId, id, await stubName(id), true))
  );

  const soldierPEMs   = toPemList(soldierDocs);
  const commanderPEMs = toPemList(commanderDocs);

  /* 4️⃣  prepare the ordered queue (commanders first) + resend queue */
  const queueIds    = [...commanders, ...soldiers].map(String);
  let index         = 0;
  const resendQueue = [];   // appended items are served AFTER the main queue

  /* 5️⃣  TLS server */
  const sockets = new Set();
  const pickNext = () => {
    if (index < queueIds.length) return queueIds[index++];  // main queue first
    if (resendQueue.length)    return resendQueue.shift();  // then resends (at end)
    return null;
  };

  const server = tls.createServer(
    { key: caKeyPem, cert: caCertPem },
    async (socket) => {
      attachSocketGuards(socket, sockets);

      const subjectId = pickNext();
      if (!subjectId) {
        // nothing to serve; just close this connection politely
        try { socket.end(); } catch {}
        return;
      }

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

      /* commanders get the soldiers too */
      const payload = doc.isCommander
        ? { ...basePayload, soldiers: soldierPEMs, commanders: commanderPEMs }
        : { ...basePayload, commanders: commanderPEMs };

      safeWriteAndEnd(socket, payload);

      /* ping backend so UI knows this subject is done */
      const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      try {
        await fetch(`${BASE}/api/provision/ping`, {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({ missionId, subjectId }),
        });
      } catch (e) {
        console.warn('[provision] ping failed:', e?.message);
      }

      console.log(`✓ bundle sent to ${doc.fullName}`);

      /* if served everyone and no more resends → close server */
      if (index === queueIds.length && resendQueue.length === 0) {
        console.log('All devices provisioned — shutting TLS server');
        // small delay to let final socket settle; swallow any late resets
        setTimeout(() => {
          stopActiveServer().catch(() => {});
        }, 50);
      }
    }
  );

  // swallow server-level errors (prevents uncaughtException on ECONNRESET)
  server.on('error', (err) => {
    if (err?.code === 'ECONNRESET') return;
    console.warn('[provision] TLS server error:', err?.message || err);
  });
  server.on('clientError', (err, socket) => { try { socket?.destroy(); } catch {} });
  server.on('tlsClientError', (err, socket) => { try { socket?.destroy(); } catch {} });

  // expose singleton so other routes (resend/stop/restart) can use it
  setState({ server, missionId, queueIds, indexRef: () => index, setIndex: v => (index = v), resendQueue, sockets, closing: false });

  // Resolve ONLY when listening, so UI can show "Ready to connect"
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, () => {
      console.log(`TLS provision server listening on :${PORT}`);
      resolve();
    });
  });

  // return a friendly payload for the UI
  return { ok: true, message: `TLS provision server listening on :${PORT}`, port: PORT };
}

/* ------------------------------------------------------------------ *
 *  queueResend({ missionId, subjectId })
 *  - ONLY works if that subject was already sent (operator intent)
 *  - removes the "done"/checkmark in UI (frontend handles) and appends
 *    the subject to the resendQueue for later delivery
 * ------------------------------------------------------------------ */
export function queueResend({ missionId, subjectId }) {
  const st = getState();
  if (!st?.server) throw new Error('No active provision server');
  if (String(st.missionId) !== String(missionId))
    throw new Error('Resend requested for a different mission than the active one');

  // Append to the resend queue (served after main queue)
  st.resendQueue.push(String(subjectId));
  console.log('[provision] queued resend for', subjectId);
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 *  stop / restart (for buttons)                                      *
 * ------------------------------------------------------------------ */
export async function stopProvision() {
  await stopActiveServer();
  return { ok: true };
}

export async function restartProvision({ missionId, soldiers, commanders }) {
  await stopActiveServer();
  return startMissionProvision({ missionId, soldiers, commanders });
}
