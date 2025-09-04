// lib/interCaLoader.js
import forge    from 'node-forge';
import mongoose from 'mongoose';

// Use the intermediate pass by default; fall back to root pass or 12345
const INT_PASS = process.env.CA_INT_PASS || process.env.CA_ROOT_PASS || '12345';

// cache per id; ':latest' for the newest intermediate
const cache = new Map();

/**
 * Load an Intermediate CA from Mongo and return { certPem, keyPem }.
 * - If `id` is provided, loads that document (_id) from CA collection.
 * - If omitted, picks the most recent document with { type: 'intermediate' }.
 * 
 * Returns the SAME shape as your original getCA(): { certPem, keyPem }
 */
export async function interCaLoader(id = null) {
  const cacheKey = id || ':latest';
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  await mongoose.connect(process.env.MONGODB_URI);
  const CA = mongoose.connection.db.collection('CA');

  let doc;
  if (id) {
    doc = await CA.findOne({ _id: id });
    if (!doc) throw new Error(`Intermediate CA "${id}" not found`);
  } else {
    // newest intermediate (createdAt desc, fallback _id desc)
    doc = await CA.find({ type: 'intermediate' })
                  .sort({ createdAt: -1, _id: -1 })
                  .limit(1)
                  .next();
    if (!doc) throw new Error('No intermediate CA found');
  }

  const pki = forge.pki;
  const certPem = doc.cert;
  const privPem = doc.privateKey || '';

  let privateKey;

  if (privPem.includes('BEGIN ENCRYPTED PRIVATE KEY')) {
    // PKCS#8 encrypted
    const encInfo = pki.encryptedPrivateKeyFromPem(privPem);
    const pkcs8   = pki.decryptPrivateKeyInfo(encInfo, INT_PASS);
    privateKey    = pki.privateKeyFromAsn1(pkcs8.privateKey);
  } else if (privPem.includes('BEGIN RSA PRIVATE KEY')) {
    // PKCS#1 (legacy)
    privateKey = pki.decryptRsaPrivateKey(privPem, INT_PASS);
  } else if (privPem.includes('BEGIN PRIVATE KEY')) {
    // PKCS#8 unencrypted (rare, but handle)
    const pkcs8 = pki.privateKeyInfoFromPem(privPem);
    privateKey  = pki.privateKeyFromAsn1(pkcs8.privateKey);
  } else {
    throw new Error('Unsupported intermediate private key PEM format');
  }

  if (!privateKey)
    throw new Error('Failed to decrypt intermediate private key (check CA_INT_PASS)');

  const keyPem = pki.privateKeyToPem(privateKey);
  const result = { certPem, keyPem };

  cache.set(cacheKey, result);
  return result;
}

// Optional helpers if you ever need to invalidate cache:
export function clearInterCaCache(id = null) {
  if (id) cache.delete(id);
  else cache.clear();
}
