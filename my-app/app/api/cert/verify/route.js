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

    const pki = forge.pki;
    const cert = pki.certificateFromPem(certPem);

    const caDoc = await db.collection('CA').findOne({ _id: 'root-ca' });
    if (!caDoc) {
      return NextResponse.json({ valid: false, reason: 'CA not found' }, { status: 500 });
    }

    const caCert = pki.certificateFromPem(caDoc.cert);

    const revoked = await db.collection('revoked').findOne({ serial: cert.serialNumber });
    if (revoked) {
      return NextResponse.json({ valid: false, reason: 'Certificate is revoked' }, { status: 400 });
    }

    const verified = caCert.publicKey.verify(
      cert.md.digest().bytes(),
      cert.signature
    );

    if (!verified) {
      return NextResponse.json({ valid: false, reason: 'Signature is invalid' }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      serial: cert.serialNumber,
      subject: cert.subject.attributes,
      notBefore: cert.validity.notBefore,
      notAfter: cert.validity.notAfter
    });
  } catch (err) {
    console.error('Verification error:', err);
    return NextResponse.json({
      valid: false,
      reason: 'Verification failed',
      error: err.message
    }, { status: 400 });
  }
}
