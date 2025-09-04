// lib/interCaLoader.js
import forge    from 'node-forge';
import mongoose from 'mongoose';

const INT_PASS = process.env.CA_INT_PASS || process.env.CA_ROOT_PASS || '12345';
const DEFAULT_INTER_ID = process.env.INTER_CA_DEFAULT_ID || 'intermediate-ca-2025A';

const cache = new Map();

/**
 * Load an Intermediate CA and return { certPem, keyPem }.
 * - If `id` is provided, loads that document (_id).
 * - If omitted, uses DEFAULT_INTER_ID and, if not found, falls back to newest {type:'intermediate'}.
 */
export async function interCaLoader(id = DEFAULT_INTER_ID) {
  const cacheKey = id || ':latest';
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  await mongoose.connect(process.env.MONGODB_URI);
  const CA = mongoose.connection.db.collection('CA');

  let doc = null;
  if (id) doc = await CA.findOne({ _id: id });
  if (!doc) {
    doc = await CA.find({ type: 'intermediate' })
      .sort({ createdAt: -1, _id: -1 })
      .limit(1)
      .next();
  }
  if (!doc) {
    throw new Error(
      id
        ? `Intermediate CA "${id}" not found and no other intermediate exists`
        : 'No intermediate CA found'
    );
  }

  const pki = forge.pki;
  const certPem = doc.cert;
  const privPem = doc.privateKey || '';

  let privateKey; // forge key object

  if (privPem.includes('BEGIN ENCRYPTED PRIVATE KEY')) {
    // PKCS#8 (encrypted). Decrypt → convert to PEM → parse key.
    let encInfo, keyInfo;
    try {
      encInfo = pki.encryptedPrivateKeyFromPem(privPem);
      keyInfo = pki.decryptPrivateKeyInfo(encInfo, INT_PASS); // ASN.1 PrivateKeyInfo
    } catch (e) {
      throw new Error('Failed to decrypt intermediate private key (check CA_INT_PASS)');
    }
    const plainPkcs8Pem = pki.privateKeyInfoToPem(keyInfo);   // PEM for unencrypted PKCS#8
    privateKey = pki.privateKeyFromPem(plainPkcs8Pem);
  } else if (privPem.includes('BEGIN PRIVATE KEY')) {
    // PKCS#8 (unencrypted)
    privateKey = pki.privateKeyFromPem(privPem);
  } else if (privPem.includes('BEGIN RSA PRIVATE KEY')) {
    // PKCS#1 (legacy). Try encrypted, fall back to unencrypted.
    privateKey = pki.decryptRsaPrivateKey(privPem, INT_PASS) || pki.privateKeyFromPem(privPem);
  } else {
    throw new Error('Unsupported intermediate private key PEM format');
  }

  if (!privateKey) {
    throw new Error('Failed to parse intermediate private key');
  }

  const keyPem = pki.privateKeyToPem(privateKey);
  const result = { certPem, keyPem };

  cache.set(cacheKey, result);
  return result;
}

export function clearInterCaCache(id = null) {
  if (id) cache.delete(id);
  else cache.clear();
}
