// lib/provisionMission.js
/* eslint-disable no-console */
import forge                from 'node-forge';
import tls                  from 'tls';
import mongoose             from 'mongoose';

import Certificate          from '@/models/Certificate';
import Soldier              from '@/models/Soldier';
import { issueCertificate } from '@/lib/issueCertificate';

import { runMissionConfiguration } from '@/scripts/runConfig.js';  // <-- fixed

/* ── tweakables filled after we inspect the mission ── */
let GMK;                         // 32-char hex
let FREQS;                       // whatever FHF returns
let INTERVAL = 2000;             // ms  (default, overwritten later)

const PASS = '12345';            // decrypt CA private key
const PORT = 8743;               // TLS port

/* util helpers */
const toPemList = (docs) => docs.map((d) => d.certPem);

const stubName = async (id) => {
  const soldier = await Soldier.findById(id).lean();
  return soldier?.fullName?.toString() || `P#${id.toString().slice(-4)}`;
};

/* ------------------------------------------------------------------ *
 *  startMissionProvision({ missionId, soldiers, commanders })        *
 * ------------------------------------------------------------------ */
export async function startMissionProvision({ missionId, soldiers, commanders }) {
  /* 0️⃣  pull GMK / FHF / interval from the linked Configuration */
  try {
    const cfgOut = await runMissionConfiguration(missionId);
    GMK      = cfgOut.gmk;
    FREQS    = cfgOut.fhf;
    INTERVAL = cfgOut.interval;

    console.log('✅ GMK (32-hex):', GMK);
    console.log('✅ FHF:', FREQS);
    console.log('⏱️  interval:', INTERVAL, 'ms');
  } catch (err) {
    console.error('❌ runMissionConfiguration failed:', err.message);
    throw err;
  }

  /* 1️⃣  connect to Mongo once for the rest of the work */
  await mongoose.connect(process.env.MONGODB_URI);

  /* 2️⃣  pull Root-CA from DB */
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
  async function upsert(id, fullName, isCommander) {
    let doc = await Certificate.findOne({ subjectId: id, missionId });
    if (doc) return doc;

    const signed = await issueCertificate({ fullName, subjectId: id, isCommander });
    doc = await Certificate.create({ subjectId: id, fullName, isCommander, missionId, ...signed });
    return doc;
  }

  const soldierDocs = await Promise.all(
    soldiers.map(async (id) => upsert(id, await stubName(id), false))
  );
  const commanderDocs = await Promise.all(
    commanders.map(async (id) => upsert(id, await stubName(id), true))
  );

  const soldierPEMs   = toPemList(soldierDocs);
  const commanderPEMs = toPemList(commanderDocs);

  /* 4️⃣  prepare the ordered queue (commanders first) */
  const queueIds = [...commanders, ...soldiers];
  let index = 0;

  /* 5️⃣  spin up TLS server */
  const server = tls.createServer(
    { key: caKeyPem, cert: caCertPem },
    async (socket) => {
      if (index >= queueIds.length) return socket.destroy(); // ignore extras

      const subjectId = queueIds[index++];
      const doc = await Certificate.findOne({ subjectId, missionId });
      if (!doc) { socket.destroy(); return; }

      const basePayload = {
        certificate  : doc.certPem + doc.keyPem,
        caCertificate: caCertPem,
        mission: missionId,
        gmk          : GMK,
        frequencies  : FREQS,
        intervalMs   : INTERVAL,
      };

      /* commanders get the soldiers too */
      const payload = doc.isCommander
        ? { ...basePayload, soldiers: soldierPEMs, commanders: commanderPEMs }
        : { ...basePayload, commanders: commanderPEMs };

      socket.write(JSON.stringify(payload));
      socket.end();

      /* ping backend so UI knows this subject is done */
      const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      await fetch(`${BASE}/api/provision/ping`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ missionId, subjectId }),
      });

      console.log(`✓ bundle sent to ${doc.fullName}`);

      /* once last device served → close TLS */
      if (index === queueIds.length) {
        console.log('All devices provisioned — shutting TLS server');
        server.close();
      }
    }
  );

  /* let caller continue immediately; resolve when server is listening */
  return new Promise((resolve) =>
    server.listen(PORT, () => {
      console.log(`TLS provision server listening on :${PORT}`);
      resolve();
    })
  );
}
