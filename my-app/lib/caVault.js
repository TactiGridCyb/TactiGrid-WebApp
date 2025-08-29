// lib/caVault.js
import forge from 'node-forge';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongoose';

const PASS = process.env.CA_KEY_PASS || '12345';
const CA_DB_NAME = process.env.CA_DB_NAME || null;

// Cache across hot reloads
let cache = globalThis.__ca_vault_cache;
if (!cache) cache = globalThis.__ca_vault_cache = { certPem: null, keyPem: null, ok: false };

function assertPemLooksRight(pem, header) {
  return typeof pem === 'string' && pem.includes(`-----BEGIN ${header}-----`);
}

/**
 * Load Root-CA from collection "CA" using the **native** Mongo driver obtained
 * from the already-connected Mongoose client. No Mongoose model is used here.
 */
export async function getCA() {
  if (cache.ok && cache.certPem && cache.keyPem) return cache;

  // Ensure the app-level connection is up
  await dbConnect();

  // Get the underlying connected MongoClient
  const client = mongoose.connection.getClient?.();
  if (!client) {
    throw new Error('Unable to access MongoClient from mongoose.connection');
  }

  // Choose DB: CA_DB_NAME override or the app connection's DB
  const dbName = CA_DB_NAME || mongoose.connection.name;
  const db = client.db(dbName);

  // Pull the document from the "CA" collection
  const doc = await db.collection('CA').findOne({ _id: 'root-ca' });
  if (!doc) {
    throw new Error(
      `Root-CA document not found in ${dbName}.CA. ` +
      `Set CA_DB_NAME if your CA is stored in another DB.`
    );
  }

  const certPem = doc.cert;
  const encKey  = doc.privateKey;

  if (!assertPemLooksRight(certPem, 'CERTIFICATE')) {
    throw new Error('CA cert in DB does not look like a PEM certificate');
  }
  if (!assertPemLooksRight(encKey, 'ENCRYPTED PRIVATE KEY')) {
    throw new Error('CA privateKey in DB is not an encrypted PEM');
  }

  // Decrypt the key → PEM
  const priv = forge.pki.decryptRsaPrivateKey(encKey, PASS);
  if (!priv) {
    throw new Error('Failed to decrypt CA private key; check CA_KEY_PASS');
  }
  const keyPem = forge.pki.privateKeyToPem(priv);

  cache = Object.assign(cache, { certPem, keyPem, ok: true });
  return cache;
}
