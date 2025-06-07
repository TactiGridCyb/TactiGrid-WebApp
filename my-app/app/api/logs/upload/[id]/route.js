
import { NextResponse } from 'next/server';
import crypto            from 'crypto';
import forge             from 'node-forge';

import dbConnect         from '@/lib/mongoose';
import Log               from '@/models/LogsModel';
import Mission           from '@/models/MissionModel';
import { consumeUploadGate } from '@/lib/uploadGate';
import RevokedCert       from '@/models/RevokedCert';
import { getCA }         from '@/lib/caLoader';      // still loads CA cert + key

/* ────────── decrypt helpers ────────── */

function decryptGMK(b64, caKeyPem) {
  return crypto.privateDecrypt(
    { key: caKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING ,  oaepHash: 'sha256'  },
    Buffer.from(b64, 'base64')
  );                                    // Buffer(32)
}

function decryptLog(b64, gmkBuf) {
  const buf = Buffer.from(b64, 'base64');
  const iv  = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const ct  = buf.subarray(12, buf.length - 16);

  const dec = crypto.createDecipheriv('aes-256-gcm', gmkBuf, iv);
  dec.setAuthTag(tag);
  const plain = Buffer.concat([dec.update(ct), dec.final()]).toString('utf8');
  return JSON.parse(plain);
}

/* ────────── route handler ────────── */

export async function POST(req, { params }) {

    if (!consumeUploadGate())          // shuts gate on first hit
    return NextResponse.json({ error: 'uploads-disabled' }, { status: 403 });






  const { id } = await params;   // missionId in the URL

  const { certificatePem, gmk, log } = await req.json() || {};
  if (!certificatePem || !gmk || !log) {
    return NextResponse.json({ error: 'missing-fields' }, { status: 400 });
  }

  await dbConnect();

  /* 1 ── load Root-CA public + private key */
  const { certPem: caPem, keyPem: caKeyPem } = await getCA();

  

  /* 2 ── validate commander certificate (forge, inline) */
  try {
    const pki        = forge.pki;
    const commander  = pki.certificateFromPem(certificatePem);
    const caCert     = pki.certificateFromPem(caPem);

    /* 2a  revoked? */
    const revoked = await RevokedCert.exists({ serial: commander.serialNumber });
    if (revoked) {
      return NextResponse.json({ error: 'certificate-revoked' }, { status: 401 });
    }

    /* 2b  signature chain */
    const ok = caCert.verify(commander);
    if (!ok) {
      return NextResponse.json({ error: 'invalid-certificate' }, { status: 401 });
    }
  } catch (err) {
    console.error('CERT-VERIFY-FAIL', err);
    return NextResponse.json({ error: 'certificate-parse-fail' }, { status: 400 });
  }

  /* 3 ── decrypt GMK */
  let gmkBuf;
  try { gmkBuf = decryptGMK(gmk, caKeyPem); }
  catch { return NextResponse.json({ error: 'gmk-decrypt-fail' }, { status: 400 }); }

  /* 4 ── decrypt log */
  let plainLog;
  try { plainLog = decryptLog(log, gmkBuf); }
  catch { return NextResponse.json({ error: 'log-decrypt-fail' }, { status: 400 }); }

  /* 5 ── mission ID integrity */
  if (String(plainLog.Mission) !== String(id)) {
    return NextResponse.json({ error: 'mission-id-mismatch' }, { status: 400 });
  }

  /* 6 ── store log & mark mission finished */
  try {
    const logDoc = await Log.create(plainLog);
    const logId  = logDoc._id; 
    
    await Mission.findByIdAndUpdate(id, { IsFinished: true });
    await Mission.findByIdAndUpdate(id, { Log: logId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DB-INSERT-FAIL', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
