// app/api/provision/stream/route.js
export const runtime = 'nodejs';

import { subscribe, unsubscribe } from '@/lib/sseBus';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const missionId = searchParams.get('missionId');
  if (!missionId) return new Response('missionId required', { status: 400 });

  let controller;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
      c.enqueue(`: connected\n\n`);
      subscribe(missionId, c);
      const t = setInterval(() => {
        try { c.enqueue(`: ping\n\n`); } catch {}
      }, 25_000);
      controller.__hb = t;
    },
    cancel() {
      try { clearInterval(controller?.__hb); } catch {}
      unsubscribe(missionId, controller);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Transfer-Encoding': 'chunked'
    }
  });
}
