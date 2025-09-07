// app/api/cert/verify/route.js 
import { MongoClient } from 'mongodb';
import forge from 'node-forge';
import { NextResponse } from 'next/server';
import { interCaLoader } from '@/lib/interCaLoader'; 

const client = new MongoClient(process.env.MONGODB_URI);
const dbName = process.env.DB_NAME; 

export async function POST(req) {
  try {
    const { certPem } = await req.json();
    if (!certPem) {
      return NextResponse.json({ error: 'Missing certPem' }, { status: 400 });
    }


    const pki  = forge.pki;
    const cert = pki.certificateFromPem(certPem);


    const { certPem: issuerPem } = await interCaLoader(); 
    const issuerCert = pki.certificateFromPem(issuerPem);


    await client.connect();
    const db = client.db(dbName);


    const revoked = await db.collection('revoked').findOne({ serial: cert.serialNumber });
    if (revoked) {
      return NextResponse.json(
        { valid: false, reason: 'Certificate is revoked' },
        { status: 400 }
      );
    }


    const now = new Date();
    if (now < cert.validity.notBefore || now > cert.validity.notAfter) {
      return NextResponse.json(
        { valid: false, reason: 'Certificate is expired or not yet valid' },
        { status: 400 }
      );
    }

    const verified = cert.verify(issuerCert); 
    if (!verified) {
      return NextResponse.json(
        { valid: false, reason: 'Signature is invalid' },
        { status: 400 }
      );
    }

 
    if (now < issuerCert.validity.notBefore || now > issuerCert.validity.notAfter) {
      return NextResponse.json(
        { valid: false, reason: 'Issuer (intermediate) is expired or not yet valid' },
        { status: 400 }
      );
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
    return NextResponse.json(
      { valid: false, reason: 'Verification failed', error: err.message },
      { status: 400 }
    );
  }
}
