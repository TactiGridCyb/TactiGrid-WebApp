/* eslint-disable no-console */
// lib/logs/httpServer.js
import http from 'http';
import { handleEncryptedUpload } from '@/lib/handleUpload';

const g = globalThis;
g.__log_http ??= null; // { server, host, port, sockets }
const getState = () => g.__log_http;
const setState = (s) => (g.__log_http = s);

const DEFAULT_HOST = process.env.LOGS_HTTP_HOST || '0.0.0.0';
const DEFAULT_PORT = Number(process.env.LOGS_HTTP_PORT || 9002);

function json(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': body.length });
  res.end(body);
}

function notFound(res) { json(res, 404, { error: 'not-found' }); }
function methodNotAllowed(res) { json(res, 405, { error: 'method-not-allowed' }); }

function parsePath(url) {
  try {
    const u = new URL(url, 'http://x');
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] === 'upload' && parts[1]) return { route: 'upload', missionId: parts[1] };
  } catch {}
  return { route: 'unknown' };
}

function readJsonBody(req, maxBytes = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > maxBytes) { reject(new Error('payload-too-large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(new Error('bad-json')); }
    });
    req.on('error', reject);
  });
}

export async function startLogHttpServer({ host = DEFAULT_HOST, port = DEFAULT_PORT } = {}) {
  const st = getState();
  if (st?.server) {
    if (st.host === host && st.port === port) {
      return { ok: true, host, port, endpoint: `/upload/:missionId`, alreadyRunning: true };
    }
    await stopLogHttpServer().catch(() => {});
  }

  const sockets = new Set();
  const server = http.createServer(async (req, res) => {
    const { route, missionId } = parsePath(req.url || '/');

    // CORS (optional for testing)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (route === 'upload') {
      if (req.method !== 'POST') return methodNotAllowed(res);
      try {
        const body = await readJsonBody(req);
        const out = await handleEncryptedUpload({
          missionId,
          certificatePem: body.certificatePem || body.certificate || body.certPem,
          gmk: body.gmk || body.gmkEncB64,
          log: body.log || body.logEncB64,
        });
        return json(res, out.status, out.body);
      } catch (e) {
        const msg = e?.message || 'internal';
        return json(res, msg === 'payload-too-large' ? 413 : 400, { error: msg });
      }
    }

    notFound(res);
  });

  server.on('connection', (sock) => {
    sockets.add(sock);
    sock.on('close', () => sockets.delete(sock));
    sock.on('error', () => sockets.delete(sock));
  });

  server.on('clientError', (_err, socket) => {
    try { socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); } catch {}
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });

  setState({ server, host, port, sockets });
  console.log(`[logs] HTTP server listening on http://${host}:${port}`);

  return { ok: true, host, port, endpoint: `/upload/:missionId` };
}

export async function stopLogHttpServer() {
  const st = getState();
  if (!st?.server) return { ok: true, alreadyStopped: true };

  for (const s of st.sockets) { try { s.destroy(); } catch {} }
  await new Promise((resolve) => { try { st.server.close(() => resolve()); } catch { resolve(); } });
  setState(null);
  console.log('[logs] HTTP server stopped');
  return { ok: true };
}

export async function restartLogHttpServer(opts) {
  await stopLogHttpServer().catch(() => {});
  return startLogHttpServer(opts);
}
