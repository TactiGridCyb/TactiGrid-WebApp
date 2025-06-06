import forge      from 'node-forge';
import mongoose   from 'mongoose';
import Certificate from '@/models/Certificate';
import Log        from '@/models/Log';
import Revoked    from '@/models/RevokedCert';

const PASS = '12345';               // decrypt CA key
const pki  = forge.pki;

export async function processEncryptedLog({ missionId, certPem, gmkEncB64, logEncB64 }) {
  /* 0) connect once */
  await mongoose.connect(process.env.MONGODB_URI);

  /* 1) Load CA creds */
  const caDoc   = await mongoose.connection.db.collection('CA').findOne({ _id:'root-ca' });
  const caCert  = pki.certificateFromPem(caDoc.cert);
  const caKey   = pki.decryptRsaPrivateKey(caDoc.privateKey, PASS);

  /* 2) Commander cert validation + revoke */
  const commanderCert = pki.certificateFromPem(certPem);
  if (!caCert.verify(commanderCert))
    throw new Error('certificate not signed by our CA');

  const serial = commanderCert.serialNumber;
  if (await Revoked.exists({ serial }))
    throw new Error('certificate already revoked');
  await Revoked.create({ serial });

  /* 3) Decrypt GMK (RSA-OAEP) */
  const gmk = caKey.decrypt(Buffer.from(gmkEncB64, 'base64').toString('binary'), 'RSA-OAEP');
  if (gmk.length !== 32) throw new Error('GMK bad length');

  /* 4) Decrypt log (AES-256-GCM) */
  const raw = Buffer.from(logEncB64, 'base64');
  const iv  = raw.slice(0, 12);
  const tag = raw.slice(raw.length - 16);
  const enc = raw.slice(12, raw.length - 16);

  const dec = forge.cipher.createDecipher('AES-GCM', gmk);
  dec.start({ iv: iv.toString('binary'), tag: tag.toString('binary') });
  dec.update(forge.util.createBuffer(enc.toString('binary')));
  if (!dec.finish()) throw new Error('bad GMK or auth-tag');

  const logJson = JSON.parse(dec.output.toString());

  /* 5) Store in DB */
  await Log.create({
    Mission:  missionId,
    Interval: logJson.interval ?? 2000,
    Data:     logJson.rows    ?? [],
  });
}
