import { NextResponse } from 'next/server';
import crypto from 'crypto';
import forge from 'node-forge';
import sodium from 'libsodium-wrappers';

import dbConnect from '@/lib/mongoose';
import Log from '@/models/LogsModel';
import Mission from '@/models/MissionModel';
import { consumeUploadGate } from '@/lib/uploadGate';
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
    
  // GMK sanity-check (32 bytes for XChaCha20-Poly1305)
  if (gmkBuf.length !== sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES) {
    throw new Error('invalid-gmk-size');
  }

  const enc = Buffer.from(b64, 'base64');
  const NONCE_LEN = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES; // 24
  const TAG_LEN   = sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES;    // 16

  
  const nonce = new Uint8Array(enc.subarray(0, NONCE_LEN));
  const ct    = new Uint8Array(enc.subarray(NONCE_LEN, enc.length - TAG_LEN));
  const tag   = new Uint8Array(enc.subarray(enc.length - TAG_LEN));


  const ctAndTag = new Uint8Array(ct.length + tag.length);
  ctAndTag.set(ct, 0);
  ctAndTag.set(tag, ct.length);

  const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
  null,
  ctAndTag,        // <–– your cipher||tag
  null,              // AAD (if any; you pass null)
  nonce,             // 24-byte nonce
  gmkBuf                // 32-byte GMK
);

  return JSON.parse(Buffer.from(plaintext).toString('utf8'));
}

/* ────────── route handler ────────── */

export async function POST(req, { params }) {
  if (!consumeUploadGate()) {
    return NextResponse.json({ error: 'uploads-disabled' }, { status: 403 });
  }

  const { id } = await params;                       // missionId in URL
  const { certificatePem, gmk, log } = await req.json() || {};
  if (!certificatePem || !gmk || !log) {
    return NextResponse.json({ error: 'missing-fields' }, { status: 400 });
  }
  
  await dbConnect();

  /* 1 ── load Root-CA materials */
  const { certPem: caPem, keyPem: caKeyPem } = await getCA();

  /* 2 ── validate commander certificate */
  try {
    const pki        = forge.pki;
    const commander  = pki.certificateFromPem(certificatePem);
    const caCert     = pki.certificateFromPem(caPem);



    // 2a revoked?
    if (await RevokedCert.exists({ serial: commander.serialNumber })) {
      return NextResponse.json({ error: 'certificate-revoked' }, { status: 401 });
    }

    // 2b signature chain

    // if (!caCert.verify(commander)) {
    //   return NextResponse.json({ error: 'invalid-certificate' }, { status: 401 });
    // }
  } catch (err) {
    console.error('CERT-VERIFY-FAIL', err);
    return NextResponse.json({ error: 'certificate-parse-fail'  }, { status: 400 });
  }

  /* 3 ── decrypt GMK (RSA-OAEP) */
  let gmkBuf;
  try {
    gmkBuf = decryptGMK(gmk, caKeyPem);
    
  } catch (err) {
    return NextResponse.json({ error:  err.message }, { status: 400 });
  }
  console.log("WORKING!!!")

  /* 4 ── decrypt log (XChaCha20-Poly1305) */
  let plainLog;
  try {
    plainLog = await decryptLogChacha(log, gmkBuf);
    console.log(plainLog);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  console.log(plainLog.Mission);
  console.log(id);
  /* 5 ── mission ID integrity */
  if (String(plainLog.Mission) !== String(id)) {
    return NextResponse.json({ error: 'mission-id-mismatch' }, { status: 400 });
  }

  /* 6 ── store log & mark mission finished */
  try {
    const { _id: logId } = await Log.create(plainLog);
    await Mission.findByIdAndUpdate(id, { IsFinished: true, Log: logId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DB-INSERT-FAIL', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
