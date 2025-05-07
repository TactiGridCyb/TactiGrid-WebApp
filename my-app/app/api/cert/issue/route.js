import { MongoClient } from 'mongodb';
import forge from 'node-forge';
import { NextResponse } from 'next/server';

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;
const PASS = '123456';

let cachedClient = null;
async function getClient() {
  if (!cachedClient) {
    cachedClient = new MongoClient(uri);
    await cachedClient.connect();
  }
  return cachedClient;
}

export async function POST(req) {
  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

    const client = await getClient();
    const db = client.db(dbName);
    const ca = await db.collection('CA').findOne({ _id: 'root-ca' });
    if (!ca) return NextResponse.json({ error: 'CA not found' }, { status: 500 });

    const pki = forge.pki;

    const keys = pki.rsa.generateKeyPair(2048);
    const csr = pki.createCertificationRequest();
    csr.publicKey = keys.publicKey;
    csr.setSubject([{ name: 'commonName', value: name }]);
    csr.sign(keys.privateKey);

    if (!csr.verify()) return NextResponse.json({ error: 'CSR verification failed' }, { status: 400 });

    const caCert = pki.certificateFromPem(ca.cert);
    const caKey = pki.decryptRsaPrivateKey(ca.privateKey, PASS);
    if (!caKey) return NextResponse.json({ error: 'CA private key decryption failed' }, { status: 401 });

    const cert = pki.createCertificate();
    cert.serialNumber = Math.floor(Math.random() * 1e16).toString(16);
    const now = new Date();
    cert.validity.notBefore = now;
    cert.validity.notAfter = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    cert.setSubject(csr.subject.attributes);
    cert.setIssuer(caCert.subject.attributes);
    cert.publicKey = csr.publicKey;
    cert.sign(caKey, forge.md.sha256.create());

    const certificate = pki.certificateToPem(cert);
    const privateKey = pki.privateKeyToPem(keys.privateKey);

    return NextResponse.json({
      name,
      certificate,
      privateKey,
      serialNumber: cert.serialNumber,
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter
    });
  } catch (err) {
    console.error('Sign error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
