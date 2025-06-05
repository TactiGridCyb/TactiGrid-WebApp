import { NextResponse } from 'next/server';
import forge             from 'node-forge';
import dbConnect         from '@/lib/mongoose';
import RevokedCert       from '@/models/RevokedCert';

export async function POST(req) {
  try {
    const { certPem } = await req.json();
    if (!certPem) return NextResponse.json({ error: 'Missing certPem' }, { status: 400 });

    /* extract serial */
    let serial;
    try { serial = forge.pki.certificateFromPem(certPem).serialNumber; }
    catch { return NextResponse.json({ error: 'Invalid PEM' }, { status: 400 }); }

    await dbConnect();
    await RevokedCert.collection.createIndex({ serial: 1 }, { unique: true });

    const doc = await RevokedCert.findOneAndUpdate(
      { serial },
      { serial, revokedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const already = doc.createdAt ? false : true;
    return NextResponse.json(
      { message: already ? 'Certificate already revoked' : 'Certificate revoked', serial },
      { status: already ? 409 : 200 }
    );

  } catch (err) {
    return NextResponse.json({ error: 'Revocation failed' }, { status: 500 });
  }
}
