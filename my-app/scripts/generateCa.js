// my-app/scripts/generateCa.js
console.log('▶️ generateCa.js is executing');

const fs = require('fs');
const path = require('path');
const forge = require('node-forge');

// מיקום הקבצים בשורש my-app
const ROOT_KEY   = path.join(__dirname, '../root-ca-key.pem');
const ROOT_CERT  = path.join(__dirname, '../root-ca-cert.pem');
const INT_KEY    = path.join(__dirname, '../intermediate-ca-key.pem');
const INT_CERT   = path.join(__dirname, '../intermediate-ca-cert.pem');
const CRL_JSON   = path.join(__dirname, '../crl.json');

function savePem(filepath, pem) {
  fs.writeFileSync(filepath, pem, 'utf8');
  console.log(`✅  Saved ${path.basename(filepath)}`);
}

function generateRootCA() {
  const keys = forge.pki.rsa.generateKeyPair(4096);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '1000';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter  = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

  const attrs = [{ name: 'commonName', value: 'TactiGrid Root CA' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  savePem(ROOT_KEY, forge.pki.privateKeyToPem(keys.privateKey));
  savePem(ROOT_CERT, forge.pki.certificateToPem(cert));
  return { rootKey: keys.privateKey, rootCert: cert };
}

function generateIntermediateCA(rootKey, rootCert) {
  const keys = forge.pki.rsa.generateKeyPair(4096);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '1001';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter  = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 5);

  const attrs = [{ name: 'commonName', value: 'TactiGrid Intermediate CA' }];
  cert.setSubject(attrs);
  cert.setIssuer(rootCert.subject.attributes);
  cert.sign(rootKey, forge.md.sha256.create());

  savePem(INT_KEY, forge.pki.privateKeyToPem(keys.privateKey));
  savePem(INT_CERT, forge.pki.certificateToPem(cert));
  return { intKey: keys.privateKey, intCert: cert };
}

function initCRL() {
  if (!fs.existsSync(CRL_JSON)) {
    fs.writeFileSync(CRL_JSON, '[]', 'utf8');
    console.log(`✅  Initialized empty crl.json`);
  }
}

function main() {
  console.log('🔐 Generating Root CA...');
  const { rootKey, rootCert } = generateRootCA();

  console.log('🔐 Generating Intermediate CA...');
  generateIntermediateCA(rootKey, rootCert);

  console.log('📋 Initializing CRL...');
  initCRL();

  console.log('🎉 Done. All CA files created in my-app/');
}

main();
