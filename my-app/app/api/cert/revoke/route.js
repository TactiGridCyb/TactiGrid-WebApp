import { MongoClient } from 'mongodb';
import forge from 'node-forge';
import { NextResponse } from 'next/server';

const client = new MongoClient(process.env.MONGODB_URI);
const dbName = process.env.DB_NAME;

export async function POST(req) {
  try {
    const { certPem } = await req.json();
    if (!certPem) {
      return NextResponse.json({ error: 'Missing certPem' }, { status: 400 });
    }

    await client.connect();
    const db = client.db(dbName);
    const revoked = db.collection('revoked');

    const cert = forge.pki.certificateFromPem(certPem);
    const serial = cert.serialNumber;

    const alreadyRevoked = await revoked.findOne({ serial });
    if (alreadyRevoked) {
      return NextResponse.json({ message: 'Certificate already revoked' }, { status: 409 });
    }

    await revoked.insertOne({
      serial,
      subject: cert.subject.attributes,
      revokedAt: new Date(),
    });

    return NextResponse.json({ message: 'Certificate revoked', serial });
  } catch (err) {
    console.error('Revocation error:', err);
    return NextResponse.json({ error: 'Revocation failed' }, { status: 500 });
  }
}
