import { WebSocketServer } from 'ws';
import { processEncryptedLog } from './processLog.js';

export function startLogSocketServer(port = 9001) {
  const wss = new WebSocketServer({ port });
  console.log('🔌  Log-upload WS listening on ws://localhost:' + port);

  wss.on('connection', (ws) => {
    ws.on('message', async (msg) => {
      try {
        const payload = JSON.parse(msg.toString());

        /* expected JSON shape */
        await processEncryptedLog({
          missionId:  payload.missionId,
          certPem:    payload.certificate,
          gmkEncB64:  payload.gmk,
          logEncB64:  payload.log,
        });

        ws.send(JSON.stringify({ ok: true }));
      } catch (err) {
        console.error(err);
        ws.send(JSON.stringify({ error: err.message }));
      } finally {
        ws.close();
      }
    });
  });
}
