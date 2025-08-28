// lib/ca.js
import forge from 'node-forge';
import dbConnect from '@/lib/mongoose';

const PASS = process.env.CA_KEY_PASS || '12345';

// Cache across hot reloads
let caCache = globalThis.__ca_cache;
if (!caCache) {
  caCache = globalThis.__ca_cache = { certPem: null, keyPem: null, loaded: false };
}

/**
 * Returns { certPem, keyPem } for Root-CA, using the shared mongoose connection.
 */
export async function getCA() {
  if (caCache.loaded && caCache.certPem && caCache.keyPem) {
    return { certPem: caCache.certPem, keyPem: caCache.keyPem };
  }

  // Ensure the app connection exists
  const conn = await dbConnect();
  const db = conn.connection.db; // guaranteed after dbConnect()

  // Fetch CA doc
  const doc = await db.collection('CA').findOne({ _id: 'root-ca' });
  if (!doc) throw new Error('Root-CA document not found');

  // Decrypt private key & cache
  const pki = forge.pki;
  const certPem = doc.cert; // public cert
  const keyPem  = forge.pki.privateKeyToPem(
    pki.decryptRsaPrivateKey(doc.privateKey, PASS)
  );

  caCache.certPem = certPem;
  caCache.keyPem  = keyPem;
  caCache.loaded  = true;

  return { certPem, keyPem };
}
