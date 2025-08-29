// lib/caLoader.js
import forge from 'node-forge';
import dbConnect from '@/lib/mongoose';
import RootCA from '@/models/RootCA';

const PASS = process.env.CA_KEY_PASS || '12345';

// Cache across hot reloads
let caCache = globalThis.__ca_cache;
if (!caCache) caCache = (globalThis.__ca_cache = { certPem: null, keyPem: null, ok: false });

/** Returns { certPem, keyPem } by reading the CA doc via Mongoose. */
export async function getCA() {
  if (caCache.ok && caCache.certPem && caCache.keyPem) {
    return { certPem: caCache.certPem, keyPem: caCache.keyPem };
  }

  await dbConnect();

  // Pull the document using a Mongoose model (avoids native driver handle timing)
  const doc = await RootCA.findById('root-ca').lean();
  if (!doc) throw new Error('Root-CA document not found in collection "CA"');

  // Decrypt the private key with the passphrase
  const pki = forge.pki;
  const certPem = doc.cert;
  const priv = pki.decryptRsaPrivateKey(doc.privateKey, PASS);
  if (!priv) throw new Error('Failed to decrypt CA private key: wrong passphrase or format');
  const keyPem = forge.pki.privateKeyToPem(priv);

  caCache = Object.assign(caCache, { certPem, keyPem, ok: true });
  return { certPem, keyPem };
}
