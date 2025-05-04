import { MongoClient } from 'mongodb';
import forge from 'node-forge';

const client = new MongoClient(process.env.MONGODB_URI);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { certPem } = req.body;
  if (!certPem) return res.status(400).json({ error: 'Missing certPem' });

  await client.connect();
  const db = client.db(process.env.DB_NAME);
  const revoked = db.collection('revoked');

  try {
    const cert = forge.pki.certificateFromPem(certPem);
    const serial = cert.serialNumber;

    const alreadyRevoked = await revoked.findOne({ serial });
    if (alreadyRevoked) {
      return res.status(409).json({ message: 'Certificate already revoked' });
    }

    await revoked.insertOne({
      serial,
      subject: cert.subject.attributes,
      revokedAt: new Date(),
    });

    res.status(200).json({ message: 'Certificate revoked', serial });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Revocation failed' });
  }
}
