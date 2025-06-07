// lib/provisionMission.js
import forge            from 'node-forge';
import tls              from 'tls';
import mongoose         from 'mongoose';
import Certificate      from '@/models/Certificate';
import { issueCertificate } from '@/lib/issueCertificate';
import Soldier from '@/models/Soldier';

/* ---------- tweakables ---------- */
const GMK      = 'A'.repeat(32);
const FREQS    = [433.5, 433.6, 433.7, 433.8];
const INTERVAL = 2000;          // ms
const PASS     = '12345';       // decrypt CA private key
const PORT     = 8743;          // TLS port

/* util */
const toPemList = (docs) => docs.map((d) => d.certPem);
const stubName = async (id) => {
  const soldier = await Soldier.findById(id).lean();
  console.log(soldier);
  return soldier?.fullName.toString() || `P#${id.toString().slice(-4)}`;
};

/* ------------------------------------------------------------------ *
 *  startMissionProvision({ missionId, soldiers, commanders })        *
 * ------------------------------------------------------------------ */
export async function startMissionProvision({ missionId, soldiers, commanders }) {
  await mongoose.connect(process.env.MONGODB_URI);

  /* 1 ── Root-CA from DB */
  const caDoc = await mongoose.connection.db
    .collection('CA')
    .findOne({ _id: 'root-ca' });
  if (!caDoc) throw new Error('Root-CA doc missing');

  const pki        = forge.pki;
  const caCertPem  = caDoc.cert;
  const caKeyPem   = forge.pki.privateKeyToPem(
    pki.decryptRsaPrivateKey(caDoc.privateKey, PASS)
  );

  /* 2 ── issue / upsert certs */
  async function upsert(id, fullName, isCommander) {
    let doc = await Certificate.findOne({ subjectId: id, missionId });
    if (doc) return doc;
    fullName = fullName + " " +id;
    const signed = await issueCertificate({ fullName, subjectId: id, isCommander });
    doc = await Certificate.create({ subjectId: id, fullName, isCommander, missionId, ...signed });
    return doc;
  }

const soldierDocs   = await Promise.all(soldiers.map(async (id) => {
  const name = await stubName(id);
  return upsert(id, name, false);
}));

const commanderDocs = await Promise.all(commanders.map(async (id) => {
  const name = await stubName(id);
  return upsert(id, name, true);
}));

  const soldierPEMs   = toPemList(soldierDocs);
  const commanderPEMs = toPemList(commanderDocs);

  /* 3 ── queue: commanders first, then soldiers */
  const queueIds = [...commanders, ...soldiers];        // ordered ObjectIds
  let index = 0;

  /* 4 ── spin up TLS server (no client cert required) */
  const server = tls.createServer(
    { key: caKeyPem, cert: caCertPem },
    async (socket) => {
      if (index >= queueIds.length) return socket.destroy();   // extra connections ignored

      /* pick the next person in queue */
      const subjectId = queueIds[index++];
      const doc = await Certificate.findOne({ subjectId, missionId });
      if (!doc) { socket.destroy(); return; }

      /* payload differs by role */
      const payload = doc.isCommander
        ? {
            certificate:  doc.certPem + doc.keyPem,
            caCertificate: caCertPem,
            gmk:            GMK,
            frequencies:    FREQS,
            soldiers:       soldierPEMs,
            commanders:     commanderPEMs,
            intervalMs:     INTERVAL,
          }
        : {
            certificate:  doc.certPem + doc.keyPem,
            caCertificate: caCertPem,
            gmk:            GMK,
            frequencies:    FREQS,
            commanders:     commanderPEMs,
            intervalMs:     INTERVAL,
          };

      socket.write(JSON.stringify(payload));
      socket.end();


      const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      await fetch(BASE + '/api/provision/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId, subjectId }),
      });

      console.log(`✓ Sent bundle to ${doc.fullName}`);

      /* auto-shutdown after last device */
      if (index === queueIds.length) {
        console.log('All devices provisioned — closing TLS server');
        server.close();
      }
    }
  );

  /* let the API respond immediately; server keeps running in background */
  return new Promise((resolve) =>
    server.listen(PORT, () => {
      console.log(`TLS provision server listening on :${PORT}`);
      resolve();
    })
  );
}
