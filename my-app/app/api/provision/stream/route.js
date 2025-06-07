import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const missionId = searchParams.get('missionId');
  if (!missionId) return new Response('Bad', { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      /* stash controller by missionId so /ping can write to it */
      globalThis.__provisionStreams ??= new Map();
      globalThis.__provisionStreams.set(missionId, controller);
    },
    cancel() {
      globalThis.__provisionStreams.delete(missionId);
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
