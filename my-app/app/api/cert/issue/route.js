import { NextResponse } from 'next/server';
import mongoose         from 'mongoose';
import Certificate      from '@/models/Certificate';
import { issueCertificate } from '@/lib/issueCertificate';

export async function POST(req) {
  try {
    const { subjectId, fullName, isCommander, missionId } = await req.json();
    if (!subjectId || !fullName || isCommander === undefined || !missionId) {
      return NextResponse.json({ error: 'Missing field(s)' }, { status: 400 });
    }

    /* 1 ── sign cert */
    const signed = await issueCertificate({ fullName, subjectId, isCommander });

    /* 2 ── persist in Mongo */
    await mongoose.connect(process.env.MONGODB_URI);
    const doc = await Certificate.create({
      subjectId,
      fullName,
      isCommander,
      missionId,
      ...signed,
    });

    /* 3 ── return PEMs so caller can download / push to device */
    return NextResponse.json(
      {
        _id:          doc._id,
        certificate:  signed.certPem,
        privateKey:   signed.keyPem,
        serialNumber: signed.serialNumber,
        validFrom:    signed.validFrom,
        validTo:      signed.validTo,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Cert issue error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
