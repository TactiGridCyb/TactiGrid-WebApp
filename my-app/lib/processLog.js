import forge      from 'node-forge';
import mongoose   from 'mongoose';
import Certificate from '@/models/Certificate';
import Log        from '@/models/Log';
import Revoked    from '@/models/RevokedCert';
import { interCaLoader } from '@/lib/interCaLoader'; 

const PASS = '12345';               

export async function processEncryptedLog({ missionId, certPem, gmkEncB64, logEncB64 }) {
  await mongoose.connect(process.env.MONGODB_URI);


  const { certPem: caCertPem, keyPem: caKeyPem } = await interCaLoader(); 
  const caCert  = pki.certificateFromPem(caCertPem);                       
  const caKey   = pki.privateKeyFromPem(caKeyPem);                         

  const commanderCert = pki.certificateFromPem(certPem);
  if (!caCert.verify(commanderCert))
    throw new Error('certificate not signed by our CA');

  const serial = commanderCert.serialNumber;
  if (await Revoked.exists({ serial }))
    throw new Error('certificate already revoked');
  await Revoked.create({ serial });

  const gmk = caKey.decrypt(Buffer.from(gmkEncB64, 'base64').toString('binary'), 'RSA-OAEP');
  if (gmk.length !== 32) throw new Error('GMK bad length');

  const raw = Buffer.from(logEncB64, 'base64');
  const iv  = raw.slice(0, 12);
  const tag = raw.slice(raw.length - 16);
  const enc = raw.slice(12, raw.length - 16);

  const dec = forge.cipher.createDecipher('AES-GCM', gmk);
  dec.start({ iv: iv.toString('binary'), tag: tag.toString('binary') });
  dec.update(forge.util.createBuffer(enc.toString('binary')));
  if (!dec.finish()) throw new Error('bad GMK or auth-tag');

  const logJson = JSON.parse(dec.output.toString());

  await Log.create({
    Mission:  missionId,
    Interval: logJson.interval ?? 2000,
    Data:     logJson.rows    ?? [],
  });
}
