/* eslint-disable no-console */
// lib/logs/handleUpload.js
import crypto from 'crypto';
import forge from 'node-forge';
import sodium from 'libsodium-wrappers';

import dbConnect from '@/lib/mongoose';
import Log from '@/models/LogsModel';
import Mission from '@/models/MissionModel';
import RevokedCert from '@/models/RevokedCert';
import { getCA } from '@/lib/caLoader';

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

  console.log("1")
  // 3) Decrypt GMK
  let gmkBuf;
  try {
    gmkBuf = decryptGMK(gmk, caKeyPem);
  } catch (err) {
    return { status: 400, body: { error: err.message } };
  }

 console.log("2")
  // 4) Decrypt log
  let plainLog;
  try {
    plainLog = await decryptLogChacha(log, gmkBuf);
  } catch (e) {
    return { status: 400, body: { error: e.message } };
  }
 console.log("3")
  // 5) Integrity check
  if (String(plainLog.Mission) !== String(missionId)) {
    return { status: 400, body: { error: 'mission-id-mismatch' } };
  }

  // 6) Store & mark finished
  try {
    const { _id: logId } = await Log.create(plainLog);
    await Mission.findByIdAndUpdate(missionId, { IsFinished: true, Log: logId });
    return { status: 200, body: { ok: true, logId: String(logId) } };
  } catch (err) {
    console.error('DB-INSERT-FAIL', err);
    return { status: 400, body: { error: err.message } };
  }
}
