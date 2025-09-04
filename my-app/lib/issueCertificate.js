// lib/issueCertificate.js (or wherever this lives)
import forge from 'node-forge';
import { interCaLoader } from '@/lib/interCaLoader'; // ⬅️ load the Intermediate CA (decrypted key)

export async function issueCertificate({ fullName, subjectId, isCommander }) {
  const pki = forge.pki;

  // 1) Generate keypair + CSR (unchanged shape)
  const keys = pki.rsa.generateKeyPair(2048);

  const csr = pki.createCertificationRequest();
  csr.publicKey = keys.publicKey;
  csr.setSubject([
    { name: 'commonName', value: `${fullName} ${Math.floor(Math.random() * 255) + 1}` },
    { name: 'organizationalUnitName', value: isCommander ? 'Commander' : 'Soldier' },
    ...(subjectId ? [{ name: 'serialNumber', value: String(subjectId) }] : []),
  ]);
  csr.sign(keys.privateKey);
  if (!csr.verify()) throw new Error('CSR verify failed');

  // 2) Load INTERMEDIATE CA (issuer) from your lib (already decrypted)
  const { certPem: issuerPem, keyPem: issuerKeyPem } = await interCaLoader(); // defaults to your configured intermediate
  const issuerCert = pki.certificateFromPem(issuerPem);
  const issuerKey  = pki.privateKeyFromPem(issuerKeyPem);

  // 3) Create and sign the LEAF cert with the INTERMEDIATE
  const cert = pki.createCertificate();
  cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(9)); // ~72-bit
  const now = new Date();
  cert.validity.notBefore = now;
  cert.validity.notAfter  = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  cert.setSubject(csr.subject.attributes);
  cert.setIssuer(issuerCert.subject.attributes);
  cert.publicKey = csr.publicKey;

  // Leaf-appropriate extensions (kept minimal; tweak if you need serverAuth, SANs, etc.)
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', clientAuth: true }, // add serverAuth: true if needed
    { name: 'subjectKeyIdentifier' },
    { name: 'authorityKeyIdentifier', authorityCertIssuer: true, serialNumber: issuerCert.serialNumber },
  ]);

  cert.sign(issuerKey, forge.md.sha256.create());

  // 4) Return same shape you used before
  return {
    certPem:      pki.certificateToPem(cert),
    keyPem:       pki.privateKeyToPem(keys.privateKey),
    serialNumber: cert.serialNumber,
    validFrom:    cert.validity.notBefore,
    validTo:      cert.validity.notAfter,
  };
}
