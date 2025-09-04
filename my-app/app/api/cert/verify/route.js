// app/api/cert/verify/route.js (or wherever this lives)
import { MongoClient } from 'mongodb';
import forge from 'node-forge';
import { NextResponse } from 'next/server';
import { interCaLoader } from '@/lib/interCaLoader'; // <-- use your lib loader

const client = new MongoClient(process.env.MONGODB_URI);
const dbName = process.env.DB_NAME; // keep your current DB name env

export async function POST(req) {
  try {
    const { certPem } = await req.json();
    if (!certPem) {
      return NextResponse.json({ error: 'Missing certPem' }, { status: 400 });
    }

    // Parse the leaf cert the caller sent
    const pki  = forge.pki;
    const cert = pki.certificateFromPem(certPem);

    // Load your INTERMEDIATE CA from lib (defaults to intermediate-ca-2025A per your loader)
    const { certPem: issuerPem } = await interCaLoader(); // or interCaLoader('intermediate-ca-2025A')
    const issuerCert = pki.certificateFromPem(issuerPem);

    // Connect for revocation lookup
    await client.connect();
    const db = client.db(dbName);

    // Revocation check (by serial number)
    const revoked = await db.collection('revoked').findOne({ serial: cert.serialNumber });
    if (revoked) {
      return NextResponse.json(
        { valid: false, reason: 'Certificate is revoked' },
        { status: 400 }
      );
    }

    // Verify validity window of the leaf
    const now = new Date();
    if (now < cert.validity.notBefore || now > cert.validity.notAfter) {
      return NextResponse.json(
        { valid: false, reason: 'Certificate is expired or not yet valid' },
        { status: 400 }
      );
    }

    // Verify signature: LEAF verified by INTERMEDIATE
    const verified = cert.verify(issuerCert); // <-- correct direction
    if (!verified) {
      return NextResponse.json(
        { valid: false, reason: 'Signature is invalid' },
        { status: 400 }
      );
    }

    // (Optional but recommended) also check the intermediate is within its validity window
    if (now < issuerCert.validity.notBefore || now > issuerCert.validity.notAfter) {
      return NextResponse.json(
        { valid: false, reason: 'Issuer (intermediate) is expired or not yet valid' },
        { status: 400 }
      );
    }

    // If you later want full chain validation, also load root via your root loader and do:
    // const { certPem: rootPem } = await getCA(); // (only if getCA still points to root)
    // const rootCert = pki.certificateFromPem(rootPem);
    // if (!issuerCert.verify(rootCert)) { ... fail ... }

    return NextResponse.json({
      valid: true,
      serial: cert.serialNumber,
      subject: cert.subject.attributes,
      notBefore: cert.validity.notBefore,
      notAfter: cert.validity.notAfter
    });
  } catch (err) {
    console.error('Verification error:', err);
    return NextResponse.json(
      { valid: false, reason: 'Verification failed', error: err.message },
      { status: 400 }
    );
  }
}
