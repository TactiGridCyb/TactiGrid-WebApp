import forge     from 'node-forge';
import mongoose  from 'mongoose';

const PASS = '12345';

let cached;   

export async function getCA() {
  if (cached) return cached;

  await mongoose.connect(process.env.MONGODB_URI);
  const doc = await mongoose.connection.db
    .collection('CA')
    .findOne({ _id: 'root-ca' });
  if (!doc) throw new Error('Root-CA document not found');

  const pki       = forge.pki;
  const certPem   = doc.cert;                                
  const keyPem    = forge.pki.privateKeyToPem(               
                     pki.decryptRsaPrivateKey(doc.privateKey, PASS)
                   );

  cached = { certPem, keyPem };
  return cached;
}
