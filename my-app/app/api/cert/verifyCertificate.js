import { MongoClient } from 'mongodb';
import forge from 'node-forge';

const client = new MongoClient(process.env.MONGO_URI);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { certPem } = req.body;
  if (!certPem) return res.status(400).json({ error: 'Missing certPem' });

  await client.connect();
  const db = client.db(process.env.DB_NAME);

  try {
    const pki = forge.pki;
    const cert = pki.certificateFromPem(certPem);

    const caDoc = await db.collection('ca').findOne({ _id: 'root-ca' });
    const caCert = pki.certificateFromPem(caDoc.cert);

    const revoked = await db.collection('revoked').findOne({ serial: cert.serialNumber });
    if (revoked) {
      return res.status(400).json({ valid: false, reason: 'Revoked' });
    }

    caCert.publicKey.verify(
      cert.md.digest().bytes(),
      cert.signature
    );

    res.status(200).json({ valid: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ valid: false, reason: 'Verification failed', error: err.message });
  }
}
