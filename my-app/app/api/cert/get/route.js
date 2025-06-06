// app/api/cert/get/route.ts
import { NextResponse } from 'next/server';
import Certificate from '../models/Certificate';
export async function GET(req) {
  const id = new URL(req.url).searchParams.get('subjectId');
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
  const doc = await Certificate.findOne({ subjectId: id });
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ certificate: doc.certPem, privateKey: doc.keyPem });
}
