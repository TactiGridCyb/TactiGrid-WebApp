import forge from 'node-forge';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

const PASS = '12345';
const uri  = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

let cachedClient = null;
async function getClient() {
  if (!cachedClient) {
    cachedClient = new MongoClient(uri);
    await cachedClient.connect();
  }
  return cachedClient;
}

/* ------------------------------------------------------------- *
 * issueCertificate({ fullName, subjectId, isCommander }) -> {certPem,keyPem,...}
 * ------------------------------------------------------------- */
export async function issueCertificate({ fullName, subjectId, isCommander }) {
  const client = await getClient();
  const db     = client.db(dbName);
  const ca     = await db.collection('CA').findOne({ _id: 'root-ca' });
  if (!ca) throw new Error('Root-CA doc not found');

  const pki = forge.pki;

  /* key-pair + CSR */
  const keys = pki.rsa.generateKeyPair(2048);

  const csr = pki.createCertificationRequest();
  csr.publicKey = keys.publicKey;
  csr.setSubject([
    { name: 'commonName', value: `${fullName} ${Math.floor(Math.random() * 255) + 1}` },
    
    { name: 'organizationalUnitName', value: isCommander ? 'Commander' : 'Soldier' },
  ]);
  csr.sign(keys.privateKey);
  if (!csr.verify()) throw new Error('CSR verify failed');

  /* sign with CA */
  const caCert = pki.certificateFromPem(ca.cert);
  const caKey  = pki.decryptRsaPrivateKey(ca.privateKey, PASS);
  if (!caKey) throw new Error('CA key decrypt failed');

  const cert = pki.createCertificate();
  cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(9)); // ~72-bit
  const now = new Date();
  cert.validity.notBefore = now;
  cert.validity.notAfter  = new Date(now.getTime() + 365*24*60*60*1000);

  cert.setSubject(csr.subject.attributes);
  cert.setIssuer(caCert.subject.attributes);
  cert.publicKey = csr.publicKey;
  cert.sign(caKey, forge.md.sha256.create());

  return {
    certPem:      pki.certificateToPem(cert),
    keyPem:       pki.privateKeyToPem(keys.privateKey),
    serialNumber: cert.serialNumber,
    validFrom:    cert.validity.notBefore,
    validTo:      cert.validity.notAfter,
  };
}
