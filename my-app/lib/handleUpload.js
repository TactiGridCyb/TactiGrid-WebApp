/* eslint-disable no-console */
// lib/logs/handleUpload.js
import crypto  from 'crypto';
import forge   from 'node-forge';
import sodium  from 'libsodium-wrappers';

import dbConnect   from '@/lib/mongoose';
import Log         from '@/models/LogsModel';
import Mission     from '@/models/MissionModel';
import RevokedCert from '@/models/RevokedCert';
import Certificate from '@/models/Certificate'; // ← NEW
import { interCaLoader as getCA } from '@/lib/interCaLoader';

/* ────────── decrypt helpers ────────── */
function decryptGMK(b64, caKeyPem) {
  return crypto.privateDecrypt(
    { key: caKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(b64, 'base64')
  );
}

async function decryptLogChacha(b64, gmkBuf) {
  await sodium.ready;

  const NONCE_LEN = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES; // 24
  const TAG_LEN   = sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES;    // 16
  if (gmkBuf.length !== sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES) {
    throw new Error('invalid-gmk-size');
  }

  const enc   = Buffer.from(b64, 'base64');
  const nonce = new Uint8Array(enc.subarray(0, NONCE_LEN));
  const ct    = new Uint8Array(enc.subarray(NONCE_LEN, enc.length - TAG_LEN));
  const tag   = new Uint8Array(enc.subarray(enc.length - TAG_LEN));

  const ctAndTag = new Uint8Array(ct.length + tag.length);
  ctAndTag.set(ct, 0);
  ctAndTag.set(tag, ct.length);

  const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null, ctAndTag, null, nonce, gmkBuf
  );

  return JSON.parse(Buffer.from(plaintext).toString('utf8'));
}

/* ────────── core handler ────────── */
export async function handleEncryptedUpload({ missionId, certificatePem, gmk, log }) {
  if (!certificatePem || !gmk || !log) {
    return { status: 400, body: { error: 'missing-fields' } };
  }

  await dbConnect();

  // 1) Root CA
  const { certPem: caPem, keyPem: caKeyPem } = await getCA();

  // 2) Validate certificate
  try {
    const pki       = forge.pki;
    const commander = pki.certificateFromPem(certificatePem);
    const caCert    = pki.certificateFromPem(caPem);

    if (await RevokedCert.exists({ serial: commander.serialNumber })) {
      return { status: 401, body: { error: 'certificate-revoked' } };
    }
    if (!caCert.verify(commander)) {
      return { status: 401, body: { error: 'invalid-certificate' } };
    }
  } catch (err) {
    console.error('CERT-VERIFY-FAIL', err);
    return { status: 400, body: { error: 'certificate-parse-fail' } };
  }

  // 3) Decrypt GMK
  let gmkBuf;
  try {
    gmkBuf = decryptGMK(gmk, caKeyPem);
  } catch (err) {
    return { status: 400, body: { error: err.message } };
  }

  // 4) Decrypt log
  let plainLog;
  try {
    plainLog = await decryptLogChacha(log, gmkBuf);
  } catch (e) {
    return { status: 400, body: { error: e.message } };
  }

  // 5) Integrity check
  if (String(plainLog.Mission) !== String(missionId)) {
    return { status: 400, body: { error: 'mission-id-mismatch' } };
  }

  // 6) Store & mark finished
  let logId;
  try {
    const created = await Log.create(plainLog);
    logId = created._id;
    await Mission.findByIdAndUpdate(missionId, { IsFinished: true, Log: logId });
  } catch (err) {
    console.error('DB-INSERT-FAIL', err);
    return { status: 400, body: { error: err.message } };
  }

  // 7) Revoke ALL soldiers' certificates for this mission (and delete the cert docs)
  let revokeStats = { revokedCount: 0, deletedCount: 0 };
  try {
    revokeStats = await revokeAllMissionSoldierCerts(missionId);
  } catch (err) {
    // Do not fail the upload if revocation hits an issue; report it back to caller
    console.error('REVOKE-FAIL', err);
    return { status: 200, body: { ok: true, logId: String(logId), revokeError: err.message } };
  }

  return {
    status: 200,
    body: { ok: true, logId: String(logId), ...revokeStats }
  };
}

/* ────────── helper: revoke every soldier cert for a mission ────────── */
async function revokeAllMissionSoldierCerts(missionId) {
  // Pull soldiers from Mission doc (supports both Soldiers/soldiers shapes)
  const mission = await Mission.findById(missionId).lean();
  if (!mission) throw new Error('mission-not-found');

  const soldiers =
    mission.Soldiers ?? mission.soldiers ?? [];
  if (!Array.isArray(soldiers) || soldiers.length === 0) {
    return { revokedCount: 0, deletedCount: 0 };
  }

  // Find all soldier certs for this mission
  const certs = await Certificate.find(
    { missionId, subjectId: { $in: soldiers } },
    { _id: 1, serialNumber: 1 }
  ).lean();

  if (!certs.length) return { revokedCount: 0, deletedCount: 0 };

  // Ensure unique index for revoked serials (idempotent + safe for concurrency)
  await RevokedCert.collection.createIndex({ serial: 1 }, { unique: true });

  // Upsert all serials into RevokedCert in bulk
  const now = new Date();
  const ops = certs.map(c => ({
    updateOne: {
      filter: { serial: c.serialNumber },
      update: { $setOnInsert: { serial: c.serialNumber }, $set: { revokedAt: now } },
      upsert: true,
    }
  }));
  await RevokedCert.bulkWrite(ops, { ordered: false });

  // Delete the actual cert docs so nothing remains retrievable post-mission
  const del = await Certificate.deleteMany({ _id: { $in: certs.map(c => c._id) } });

  return { revokedCount: certs.length, deletedCount: del?.deletedCount ?? 0 };
}
