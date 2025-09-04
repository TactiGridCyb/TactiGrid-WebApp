// app/api/ca/intermediate/route.js
import { NextResponse } from 'next/server';
import forge    from 'node-forge';
import mongoose from 'mongoose';
import { interCaLoader as getCA } from '@/lib/interCaLoader';

// simple header gate; set CA_ADMIN_TOKEN in .env.local
const ADMIN_HDR = 'x-ca-admin';

function randomSerialHex(bytes = 16) {
  const b = forge.random.getBytesSync(bytes);
  const arr = Array.from(b, ch => ch.charCodeAt(0));
  arr[0] &= 0x7f; // positive ASN.1 INTEGER
  return arr.map(x => x.toString(16).padStart(2, '0')).join('');
}

export async function POST(req) {
  try {
    // ---- auth (optional but recommended)
    const token = req.headers.get(ADMIN_HDR);
    if (process.env.CA_ADMIN_TOKEN && token !== process.env.CA_ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      id = `intermediate-ca-${Date.now()}`,
      years = 5,
      pathLen = 0, // 0 => can sign leaf certs only
      overwrite = false,
      subject = [
        { name: 'commonName', value: 'Intermediate CA' },
        { name: 'organizationName', value: 'TactiGrid' },
        { shortName: 'OU', value: 'Certification Authority' },
        { shortName: 'C', value: 'IL' },
      ],
    } = body;

    // ---- load root CA
    const { certPem: rootCertPem, keyPem: rootKeyPem } = await getCA();
    const pki      = forge.pki;
    const rootCert = pki.certificateFromPem(rootCertPem);
    const rootKey  = pki.privateKeyFromPem(rootKeyPem);

    // ---- generate intermediate keypair
    const intKeys = pki.rsa.generateKeyPair(3072);

    // ---- create intermediate certificate
    const intCert = pki.createCertificate();
    intCert.publicKey        = intKeys.publicKey;
    intCert.serialNumber     = randomSerialHex(16);
    intCert.validity.notBefore = new Date();
    intCert.validity.notAfter  = new Date();
    intCert.validity.notAfter.setFullYear(
      intCert.validity.notBefore.getFullYear() + years
    );

    intCert.setSubject(subject);
    intCert.setIssuer(rootCert.subject.attributes);

    // Keep AKI simple (issuer+serial) to avoid URIError on some runtimes
    intCert.setExtensions([
      { name: 'basicConstraints', cA: true, pathLenConstraint: pathLen },
      { name: 'keyUsage', keyCertSign: true, cRLSign: true, digitalSignature: true },
      { name: 'subjectKeyIdentifier' },
      { name: 'authorityKeyIdentifier', authorityCertIssuer: true, serialNumber: rootCert.serialNumber },
    ]);

    intCert.sign(rootKey, forge.md.sha256.create());

    const intermediatePem = pki.certificateToPem(intCert);

    // ---- encrypt intermediate private key as PKCS#8 "BEGIN ENCRYPTED PRIVATE KEY"
    const pass     = process.env.CA_INT_PASS || '12345';
    const asn1     = pki.privateKeyToAsn1(intKeys.privateKey);
    const pkcs8    = pki.wrapRsaPrivateKey(asn1);
    const encInfo  = pki.encryptPrivateKeyInfo(pkcs8, pass, { algorithm: 'aes256' });
    const encPem   = pki.encryptedPrivateKeyToPem(encInfo);

    // ---- store in Mongo (same CA collection)
    await mongoose.connect(process.env.MONGODB_URI);
    const CA = mongoose.connection.db.collection('CA');

    const doc = {
      _id: id,
      type: 'intermediate',
      parent: 'root-ca',
      serial: intCert.serialNumber,
      subject: intCert.subject.attributes,
      cert: intermediatePem,
      privateKey: encPem,                 // PKCS#8 encrypted
      keyEncryptionMethod: 'aes256',
      chain: intermediatePem + rootCertPem,
      createdAt: new Date(),
      years,
      pathLen,
    };

    if (overwrite) {
      await CA.updateOne({ _id: id }, { $set: doc }, { upsert: true });
    } else {
      const exists = await CA.findOne({ _id: id });
      if (exists) {
        return NextResponse.json({ error: 'ID already exists', id }, { status: 409 });
      }
      await CA.insertOne(doc);
    }

    return NextResponse.json({
      ok: true,
      id,
      serial: doc.serial,
      subject: doc.subject,
      cert: doc.cert, // public only
      stored: {
        _id: doc._id,
        type: doc.type,
        parent: doc.parent,
        keyEncryptionMethod: doc.keyEncryptionMethod,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error('Create intermediate error:', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
