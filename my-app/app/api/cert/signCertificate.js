import { MongoClient } from 'mongodb';
import forge from 'node-forge';

const client = new MongoClient(process.env.MONGODB_URI);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { csrPem, passphrase } = req.body;

  if (!csrPem || !passphrase) return res.status(400).json({ error: 'Missing csrPem or passphrase' });

  await client.connect();
  const db = client.db(process.env.DB_NAME);
  const ca = await db.collection('ca').findOne({ _id: 'root-ca' });

  try {
    const pki = forge.pki;
    const caCert = pki.certificateFromPem(ca.cert);
    const caKey = pki.decryptRsaPrivateKey(ca.privateKey, passphrase);
    const csr = pki.certificationRequestFromPem(csrPem);

    if (!csr.verify()) throw new Error('Invalid CSR');

    const cert = pki.createCertificate();
    cert.serialNumber = (Math.floor(Math.random() * 1e16)).toString(16);
    const now = new Date();
    cert.validity.notBefore = now;
    cert.validity.notAfter = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

    cert.setSubject(csr.subject.attributes);
    cert.setIssuer(caCert.subject.attributes);
    cert.publicKey = csr.publicKey;
    cert.sign(caKey, forge.md.sha256.create());

    const pem = pki.certificateToPem(cert);
    res.status(200).json({ cert: pem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Certificate signing failed' });
  }
}
