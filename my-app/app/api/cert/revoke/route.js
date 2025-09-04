// app/api/revoke/route.js (or similar)
import { NextResponse } from 'next/server';
import forge             from 'node-forge';
import dbConnect         from '@/lib/mongoose';
import RevokedCert       from '@/models/RevokedCert';
import Certificate       from '@/models/Certificate';

export async function POST(req) {
  try {
    const { certPem } = await req.json();
    if (!certPem) {
      return NextResponse.json({ error: 'Missing certPem' }, { status: 400 });
    }

    // Extract serial from PEM
    let serial;
    try {
      serial = forge.pki.certificateFromPem(certPem).serialNumber;
    } catch {
      return NextResponse.json({ error: 'Invalid PEM' }, { status: 400 });
    }

    await dbConnect();
    await RevokedCert.collection.createIndex({ serial: 1 }, { unique: true });

    // Upsert into RevokedCert (idempotent)
    const res = await RevokedCert.updateOne(
      { serial },
      { $setOnInsert: { serial }, $set: { revokedAt: new Date() } },
      { upsert: true }
    );

    const already = res.matchedCount > 0; // existed before this call

    // HARD DELETE the certificate document so it won't appear anywhere
    const del = await Certificate.deleteOne({ serialNumber: serial });

    return NextResponse.json(
      {
        message: already ? 'Certificate already revoked' : 'Certificate revoked',
        serial,
        deletedFromCertificates: del.deletedCount, // 1 if removed, 0 if not found
      },
      { status: already ? 409 : 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: 'Revocation failed' }, { status: 500 });
  }
}
