// File: scripts/seedFunctions.js
// This script upserts our Frequency Hopping (FHF) and GMK functions
// into the "configuration-functions" collection, storing both metadata
// and the full JS implementation. Run this whenever you add or update
// a function, then let your app load the docs at runtime.

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import mongoose from 'mongoose';
import Func     from '../models/Function.js';

async function seed() {
  // 1) Connect to MongoDB using the URI from .env.local
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Missing MONGODB_URI in .env.local');
  }
  await mongoose.connect(uri, { bufferCommands: false });
  console.log('🗄️  Connected to MongoDB');

  // 2) Define all functions to upsert
  //    Each entry includes:
  //      - name:        unique key
  //      - type:        'FHF' or 'GMK'
  //      - description: human-readable summary
  //      - parameters:  list of { name, type }
  //      - implementation: full JS source as string
  const functions = [
    // ——— FHF FUNCTIONS ———

    {
      name:        'linearHop',
      type:        'FHF',
      description: 'Linear sequential hopping by fixed step',
      parameters:  [
        { name:'baseFreq', type:'number' },
        { name:'stepSize', type:'number' },
        { name:'index',    type:'number' }
      ],
      implementation: `
/**
 * Linear Hop:
 *   nextFreq = baseFreq + (stepSize * index)
 * Advantages:
 *   - Simple to compute & synchronize.
 *   - No seed or storage needed.
 * Disadvantages:
 *   - Fully predictable if parameters are known.
 */
function linearHop(baseFreq, stepSize, index) {
  return baseFreq + (stepSize * index);
}`.trim()
    },

    {
      name:        'prngHop',
      type:        'FHF',
      description: 'Pseudo-random hop using a seeded PRNG (e.g. Mersenne Twister)',
      parameters:  [
        { name:'seed',          type:'string' },
        { name:'legalChannels', type:'array<number>' },
        { name:'index',         type:'number' }
      ],
      implementation: `
/**
 * PRNG Hop:
 *   - Uses a deterministic PRNG with shared seed to shuffle channels.
 *   - Both sides regenerate the same shuffled list and pick by index.
 * Advantages:
 *   - Unpredictable without knowing seed.
 *   - No need to transmit entire sequence.
 * Disadvantages:
 *   - Must regenerate/shuffle full list each time.
 */
function prngHop(seed, legalChannels, index) {
  const prng = new MersenneTwister(seed);
  const channels = shuffle(legalChannels, prng);
  return channels[index % channels.length];
}`.trim()
    },

    {
      name:        'lfsrHop',
      type:        'FHF',
      description: 'Linear Feedback Shift Register (LFSR) based hopping',
      parameters:  [
        { name:'register',      type:'number' },
        { name:'taps',          type:'array<number>' },
        { name:'legalChannels', type:'array<number>' }
      ],
      implementation: `
/**
 * LFSR Hop:
 *   - Uses an 8-bit shift register and tap positions.
 *   - Generates a pseudo-random sequence by feedback bit.
 * Advantages:
 *   - Very fast & low resource.
 * Disadvantages:
 *   - Sequence recoverable if taps are known.
 */
function lfsrHop(register, taps, legalChannels) {
  let bit = taps.reduce((acc, t) =>
    acc ^ ((register >> (t - 1)) & 1), 0
  );
  register = ((register << 1) | bit) & 0xFF;
  const idx = register % legalChannels.length;
  return { freq: legalChannels[idx], register };
}`.trim()
    },

    {
      name:        'aesCtrHop',
      type:        'FHF',
      description: 'AES-CTR keystream based hopping',
      parameters:  [
        { name:'key',           type:'buffer' },
        { name:'counter',       type:'buffer' },
        { name:'legalChannels', type:'array<number>' }
      ],
      implementation: `
/**
 * AES-CTR Hop:
 *   - Encrypts a counter block with AES key.
 *   - Uses the first 4 bytes of output to pick index.
 * Advantages:
 *   - Cryptographically strong unpredictability.
 * Disadvantages:
 *   - Requires hardware/software AES support.
 */
function aesCtrHop(key, counter, legalChannels) {
  const block = AES_encrypt(counter, key);
  const idx   = block.readUInt32BE(0) % legalChannels.length;
  return legalChannels[idx];
}`.trim()
    },

    {
      name:        'primeModHop',
      type:        'FHF',
      description: 'Prime-modulo arithmetic based hop',
      parameters:  [
        { name:'a',             type:'number' },
        { name:'b',             type:'number' },
        { name:'p',             type:'number' },
        { name:'index',         type:'number' },
        { name:'legalChannels', type:'array<number>' }
      ],
      implementation: `
/**
 * Prime-Modulo Hop:
 *   x = (a*index + b) mod p
 *   pick channels[x mod channels.length]
 * Advantages:
 *   - Strong arithmetic properties.
 * Disadvantages:
 *   - BigInt math overhead.
 */
function primeModHop(a, b, p, index, legalChannels) {
  const x   = (BigInt(a) * BigInt(index) + BigInt(b)) % BigInt(p);
  const idx = Number(x % BigInt(legalChannels.length));
  return legalChannels[idx];
}`.trim()
    },

    // ——— GMK FUNCTIONS ———

    {
      name:        'gmkSecureRandom',
      type:        'GMK',
      description: '32-byte secure random from OS CSPRNG',
      parameters:  [],
      implementation: `
/**
 * GMK Secure Random:
 *   - Simply request 32 cryptographically strong bytes.
 * Advantages:
 *   - Very simple & secure.
 * Disadvantages:
 *   - Not reproducible without storage.
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
 *   - Derive 32 bytes via PBKDF2 from passphrase & salt.
 * Advantages:
 *   - Reproducible if you know both inputs.
 *   - Salt + iterations defend brute-force.
 * Disadvantages:
 *   - Must manage/passphrase & salt.
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
 *   - Perform Elliptic Curve Diffie-Hellman handshake.
 *   - Hash the shared secret & take first 32 bytes.
 * Advantages:
 *   - Key-agreement without transmitting GMK.
 * Disadvantages:
 *   - Requires ECDH key pairs & crypto support.
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
 *   - Hash deviceId to 32 bytes, then mix with random  
 * Advantages:
 *   - Ties GMK to device identity + randomness.
 * Disadvantages:
 *   - Semi-deterministic; portion is random.
 */
function gmkFingerprint(deviceId) {
  const hash = crypto.createHash('sha256').update(deviceId).digest();
  const rand = crypto.randomBytes(16);
  return Buffer.concat([hash.slice(0,16), rand]);
}`.trim()
    }
  ];

  // 3) Upsert into MongoDB
  for (const fn of functions) {
    await Func.findOneAndUpdate(
      { name: fn.name },
      { $set: fn },
      { upsert: true, new: true }
    );
    console.log('Upserted:', fn.name);
  }

  console.log('✅ Seeding complete.');
  process.exit(0);
}

// Run the seeder
seed().catch(err => {
  console.error(err);
  process.exit(1);
});
