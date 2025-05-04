// my-app/app/api/cert/issue/route.js
// Force Node.js runtime so we can use fs and node-forge
export const runtime = 'nodejs';

import fs from 'fs';
import path from 'path';
import forge from 'node-forge';

// Paths to CA files and lists
const INT_CERT   = path.resolve(process.cwd(), 'intermediate-ca-cert.pem');
const INT_KEY    = path.resolve(process.cwd(), 'intermediate-ca-key.pem');
const ROOT_KEY   = path.resolve(process.cwd(), 'root-ca-key.pem');
const WHITELIST  = path.resolve(process.cwd(), 'whitelist.json');
const SIG_PATH   = path.resolve(process.cwd(), 'whitelist.sig');
const CRL_PATH   = path.resolve(process.cwd(), 'crl.json');

// Sign the whitelist.json using Root CA private key
function signWhitelist() {
  const data       = fs.readFileSync(WHITELIST, 'utf8');
  const rootKeyPem = fs.readFileSync(ROOT_KEY, 'utf8');
  const rootKey    = forge.pki.privateKeyFromPem(rootKeyPem);
  const md         = forge.md.sha256.create();
  md.update(data, 'utf8');
  const signature  = rootKey.sign(md);
  fs.writeFileSync(SIG_PATH, forge.util.encode64(signature));
}

export async function POST(request) {
  try {
    const { name, missionId } = await request.json();

    // --- Clear all previously issued certificates ---
    // Reset whitelist and CRL to empty arrays
    fs.writeFileSync(WHITELIST, JSON.stringify([], null, 2));
    fs.writeFileSync(CRL_PATH, JSON.stringify([], null, 2));
    // Re-sign the now-empty whitelist
    signWhitelist();

    // Load Intermediate CA for signing new certificates
    const caCertPem = fs.readFileSync(INT_CERT, 'utf8');
    const caKeyPem  = fs.readFileSync(INT_KEY,  'utf8');
    const caCert    = forge.pki.certificateFromPem(caCertPem);
    const caKey     = forge.pki.privateKeyFromPem(caKeyPem);

    // Generate new RSA key pair and certificate for the soldier
    const keys      = forge.pki.rsa.generateKeyPair(2048);
    const cert      = forge.pki.createCertificate();
    cert.publicKey    = keys.publicKey;
    cert.serialNumber = Date.now().toString();
    cert.validity.notBefore = new Date();
    cert.validity.notAfter  = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    cert.setSubject([{ name: 'commonName', value: name }]);
    cert.setIssuer(caCert.subject.attributes);
    cert.sign(caKey, forge.md.sha256.create());

    // Convert to PEM format
    const pemCert = forge.pki.certificateToPem(cert);
    const pemKey  = forge.pki.privateKeyToPem(keys.privateKey);

    // Add new entry to whitelist
    const wl = JSON.parse(fs.readFileSync(WHITELIST, 'utf8'));
    wl.push({ serial: cert.serialNumber, name, missionId, expires: cert.validity.notAfter.toISOString() });
    fs.writeFileSync(WHITELIST, JSON.stringify(wl, null, 2));
    // Re-sign updated whitelist
    signWhitelist();

    // Return the new certificate data and the updated whitelist
    return new Response(JSON.stringify({ certificate: pemCert, privateKey: pemKey, whitelist: wl }), { status: 200 });

  } catch (e) {
    console.error('[/api/cert/issue] error:', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
