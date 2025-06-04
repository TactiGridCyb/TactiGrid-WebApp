// pages/api/logs/socket.js
import { Server } from 'socket.io';
import dbConnect      from '@/lib/mongoose';
import Log            from '@/models/LogsModel';
import Mission        from '@/models/MissionModel';
import RevokedCert    from '@/models/RevokedCert';
import { getCA }      from '@/lib/caLoader';

// In-memory “armed” missions map
const active = new Map();
const WINDOW_MS = 5 * 60_000; // 5 minutes

export default function handler(req, res) {
  // Only initialize once
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: '/api/logs/socket',
      transports: ['websocket']
    });
    res.socket.server.io = io;

    io.on('connection', socket => {
      // Dashboard “arm” button
      socket.on('listen', ({ missionId }) => {
        active.set(String(missionId), Date.now() + WINDOW_MS);
        console.log(`🔓 armed mission ${missionId} for 5 min`);
      });

      // Watch upload
      socket.on('logBundle', async bundle => {
        const { missionId, certificatePem, gmk, log } = bundle;

        // 1) gate check
        const expiry = active.get(String(missionId));
        if (!expiry || Date.now() > expiry) {
          return socket.emit('logProcessed', { ok: false, error: 'no-listener', missionId });
        }

        // 2) missing fields
        if (!certificatePem || !gmk || !log) {
          return socket.emit('logProcessed', { ok: false, error: 'missing-fields', missionId });
        }

        try {
          await dbConnect();

          // 3) validate cert
          const { certPem: caPem } = await getCA();
          const pki = require('node-forge').pki;
          const commander = pki.certificateFromPem(certificatePem);
          const caCert    = pki.certificateFromPem(caPem);
          const revoked   = await RevokedCert.exists({ serial: commander.serialNumber });
          if (!caCert.verify(commander) || revoked) {
            return socket.emit('logProcessed', { ok: false, error: 'invalid-cert', missionId });
          }

          // 4) decrypt bundle
          const crypto = require('crypto');
          const gmkBuf = crypto.privateDecrypt(
            {
              key: process.env.CA_KEY_PEM,
              passphrase: process.env.CA_KEY_PASS,
              padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
              oaepHash: 'sha256'
            },
            Buffer.from(gmk, 'base64')
          );

          const buf = Buffer.from(log, 'base64');
          const iv  = buf.subarray(0, 12);
          const tag = buf.subarray(buf.length - 16);
          const ct  = buf.subarray(12, buf.length - 16);
          const dec = crypto.createDecipheriv('aes-256-gcm', gmkBuf, iv);
          dec.setAuthTag(tag);
          const plainLog = JSON.parse(Buffer.concat([dec.update(ct), dec.final()]));

          // 5) integrity & save
          if (String(plainLog.Mission) !== String(missionId)) {
            return socket.emit('logProcessed', { ok: false, error: 'mission-id-mismatch', missionId });
          }
          const doc = await Log.create(plainLog);
          await Mission.findByIdAndUpdate(missionId, { IsFinished: true });

          io.emit('logProcessed', { ok: true, missionId });
          active.delete(String(missionId));
          console.log('✔️ stored mission', missionId);
        } catch (err) {
          console.error('UPLOAD-FAIL', err);
          socket.emit('logProcessed', { ok: false, error: err.message, missionId });
        }
      });
    });
  }

  res.end();
}
