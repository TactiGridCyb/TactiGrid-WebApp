import { NextResponse } from 'next/server';

export async function POST(req) {
  const { missionId, subjectId } = await req.json();
  const ctrl = globalThis.__provisionStreams?.get(missionId);
  if (ctrl) {
    const msg = `data: ${JSON.stringify({ subjectId })}\n\n`;
    ctrl.enqueue(new TextEncoder().encode(msg));
  }
  return NextResponse.json({ ok: true });
}
