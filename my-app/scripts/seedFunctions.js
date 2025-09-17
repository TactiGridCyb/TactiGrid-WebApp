// scripts/seedFunctions.js

/**
 * scripts/seedFunctions.js
 *
 * Upserts a predefined list of FHF and GMK functions into the
 * "configuration-functions" collection. Each document includes:
 *  • name
 *  • type ("FHF" or "GMK")
 *  • description
 *  • parameters (array of { name, type })
 *  • implementation (full JS function code as string)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import mongoose from 'mongoose';
import Func from '../models/Function.js';

async function seed() {
  // 1) Connect to MongoDB
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Missing MONGODB_URI in .env.local');
  }
  await mongoose.connect(uri, { bufferCommands: false });
  console.log('🗄️  Connected to MongoDB');

  // 2) List of functions to insert/upsert
  const functions = [
    // —–––– FHF FUNCTIONS –––—

    {
      name:        'linearHop',
      type:        'FHF',
      description: 'Linear sequential hopping (list) by fixed step',
      parameters:  [
        { name:'baseFreq', type:'number' },
        { name:'stepSize', type:'number' },
        { name:'count',    type:'number' }
      ],
      implementation: `
/**
 * Linear Hop:
 *   • Returns an array of 'count' frequencies:
 *     [baseFreq + stepSize*0, baseFreq + stepSize*1, …]
 */
function linearHop(baseFreq, stepSize, count) {
  const freqs = [];
  for (let i = 0; i < count; i++) {
    freqs.push(baseFreq + (stepSize * i));
  }
  return freqs;
}`.trim()
    },

    {
      name:        'prngHop',
      type:        'FHF',
      description: 'Pseudo-random hop list using a seeded PRNG (Mersenne Twister)',
      parameters:  [
        { name:'seed',          type:'string' },
        { name:'legalChannels', type:'array<number>' },
        { name:'count',         type:'number' }
      ],
      implementation: `
/**
 * PRNG Hop:
 *   • Shuffles legalChannels using a seeded PRNG and returns first 'count' entries.
 */
function prngHop(seed, legalChannels, count) {
  const prng = new MersenneTwister(seed);
  const channels = shuffle(legalChannels, prng);
  return channels.slice(0, count);
}`.trim()
    },

    {
      name:        'lfsrHop',
      type:        'FHF',
      description: 'Linear Feedback Shift Register (LFSR) based hopping (list)',
      parameters:  [
        { name:'register',      type:'number' },
        { name:'taps',          type:'array<number>' },
        { name:'legalChannels', type:'array<number>' },
        { name:'count',         type:'number' }
      ],
      implementation: `
/**
 * LFSR Hop:
 *   • Generates a pseudo-random sequence using LFSR, returns 'count' frequencies.
 */
function lfsrHop(register, taps, legalChannels, count) {
  const freqs = [];
  let reg = register & 0xFF;
  for (let i = 0; i < count; i++) {
    let bit = taps.reduce((acc, t) =>
      acc ^ ((reg >> (t - 1)) & 1), 0
    );
    reg = ((reg << 1) | bit) & 0xFF;
    const idx = reg % legalChannels.length;
    freqs.push(legalChannels[idx]);
  }
  return freqs;
}`.trim()
    },

    {
      name:        'aesCtrHop',
      type:        'FHF',
      description: 'AES-CTR keystream based hopping (list)',
      parameters:  [
        { name:'key',           type:'buffer' },
        { name:'counter',       type:'buffer' },
        { name:'legalChannels', type:'array<number>' },
        { name:'count',         type:'number' }
      ],
      implementation: `
/**
 * AES-CTR Hop:
 *   • Uses AES-128-CTR (key is 16 bytes) to generate a keystream block,
 *     derives index, repeats 'count' times.
 *   • Converts 'key' and 'counter' (Buffers) to IV and key for createCipheriv.
 */
function aesCtrHop(key, counter, legalChannels, count) {
  const freqs = [];
  // key and counter are Node.js Buffers
  const keyBuf = Buffer.from(key);       // 16 bytes expected
  let counterBuf = Buffer.from(counter); // 16 bytes IV

  for (let i = 0; i < count; i++) {
    // Use AES-128-CTR (keyBuf length must be 16)
    const cipher = crypto.createCipheriv('aes-128-ctr', keyBuf, counterBuf);
    // Generate 16 bytes of keystream
    const keystream = cipher.update(Buffer.alloc(16));
    const idx = keystream.readUInt32BE(0) % legalChannels.length;
    freqs.push(legalChannels[idx]);

    // Increment counterBuf by 1 (little-endian carry)
    for (let j = counterBuf.length - 1; j >= 0; j--) {
      counterBuf[j] = (counterBuf[j] + 1) & 0xFF;
      if (counterBuf[j] !== 0) break;
    }
  }

  return freqs;
}`.trim()
    },

    {
      name:        'primeModHop',
      type:        'FHF',
      description: 'Prime-modulo arithmetic based hop (list)',
      parameters:  [
        { name:'a',             type:'number' },
        { name:'b',             type:'number' },
        { name:'p',             type:'number' },
        { name:'count',         type:'number' },
        { name:'legalChannels', type:'array<number>' }
      ],
      implementation: `
/**
 * Prime-Modulo Hop:
 *   • For i in [0..count-1]: x = (a*i + b) mod p, index = x mod legalChannels.length.
 *   • Returns an array of 'count' frequencies.
 */
function primeModHop(a, b, p, count, legalChannels) {
  const freqs = [];
  for (let i = 0; i < count; i++) {
    const x   = (BigInt(a) * BigInt(i) + BigInt(b)) % BigInt(p);
    const idx = Number(x % BigInt(legalChannels.length));
    freqs.push(legalChannels[idx]);
  }
  return freqs;
}`.trim()
    },

    // —–––– GMK FUNCTIONS –––—

    {
      name:        'gmkSecureRandom',
      type:        'GMK',
      description: '32-byte secure random from OS CSPRNG',
      parameters:  [],
      implementation: `
/**
 * GMK Secure Random:
 *   • Returns Buffer of 32 random bytes.
 */
function gmkSecureRandom() {
  return crypto.randomBytes(32);
}`.trim()
    },

    {
      name:        'gmkHmac',
      type:        'GMK',
      description: 'PBKDF2-HMAC-SHA256 from passphrase & salt',
      parameters:  [
        { name:'passphrase', type:'string' },
        { name:'salt',       type:'string' }
      ],
      implementation: `
/**
 * GMK HMAC:
 *   • Derive 32 bytes via PBKDF2 from passphrase & salt.
 */
function gmkHmac(passphrase, salt) {
  return crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
}`.trim()
    },

    {
      name:        'gmkEcdh',
      type:        'GMK',
      description: 'ECDH-derived secret hashed to 32 bytes',
      parameters:  [
        { name:'privateKey',    type:'buffer' },
        { name:'peerPublicKey', type:'buffer' }
      ],
      implementation: `
/**
 * GMK ECDH:
 *   • Perform Elliptic Curve Diffie-Hellman handshake & hash the secret.
 */
function gmkEcdh(privateKey, peerPublicKey) {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.setPrivateKey(privateKey);
  const secret = ecdh.computeSecret(peerPublicKey);
  return crypto.createHash('sha256').update(secret).digest().slice(0,32);
}`.trim()
    },

    {
      name:        'gmkFingerprint',
      type:        'GMK',
      description: 'Device ID fingerprint + random bytes',
      parameters:  [
        { name:'deviceId', type:'string' }
      ],
      implementation: `
/**
 * GMK Fingerprint:
 *   • Hash deviceId (SHA-256), take first 16 bytes, append 16 random bytes.
 */
function gmkFingerprint(deviceId) {
  const hash = crypto.createHash('sha256').update(deviceId).digest();
  const rand = crypto.randomBytes(16);
  return Buffer.concat([hash.slice(0,16), rand]);
}`.trim()
    }
  ];

  // 3) Upsert each function by "name"
  for (const fn of functions) {
    await Func.findOneAndUpdate(
      { name: fn.name },       // filter
      { $set: fn },            // update fields
      { upsert: true, new: true }
    );
    console.log('Upserted:', fn.name);
  }

  console.log('✅ Seeding complete.');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
