// scripts/runConfig.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import vm from 'vm';
import { createRequire } from 'module';

import crypto from 'crypto';
import MersenneTwister from 'mersenne-twister';
import shuffle from 'lodash.shuffle';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in .env.local');
  process.exit(1);
}

// 1) סקמת Configuration
const ConfigurationSchema = new mongoose.Schema({
  gmkFunction:   { type: String, required: true },
  fhfFunction:   { type: String, required: true },
  fhfInterval:   { type: Number, required: true },
  parameters:    {
    gmk: { type: mongoose.Schema.Types.Mixed, required: true },
    fhf: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  createdAt:     { type: Date, default: Date.now }
});
const ConfigurationModel =
  mongoose.models.Configuration ||
  mongoose.model('Configuration', ConfigurationSchema);

// 2) סקמת Function (collection: "configuration-functions")
const FunctionSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  type:           { type: String, required: true }, // "GMK" או "FHF"
  description:    { type: String, default: '' },
  parameters:     { type: Array,  default: [] },
  implementation: { type: String, required: true },
  createdAt:      { type: Date,   default: Date.now }
}, { collection: 'configuration-functions' });
const FunctionModel =
  mongoose.models.Function ||
  mongoose.model('Function', FunctionSchema);

/**
 * compileAndRun:
 *   • עוטף implStr ב־`(...)` כדי לקבל פונקציה
 *   • יוצר sandbox עם require, module, exports, crypto, MersenneTwister, shuffle, Buffer
 *   • מריץ את הקוד ומחזיר את התוצאה של call(fn, ...Object.values(params))
 */
function compileAndRun(implStr, params, fnName) {
  try {
    const wrapped = `(${implStr})`;
    const sandboxRequire = createRequire(import.meta.url);

    const sandbox = {
      require:          sandboxRequire,
      module:           { exports: {} },
      exports:          {},
      crypto,           // Node’s crypto
      MersenneTwister,  // PRNG
      shuffle,          // lodash.shuffle
      Buffer            // Node’s Buffer
    };
    sandbox.globalThis = sandbox;

    const context = vm.createContext(sandbox);
    const script = new vm.Script(wrapped);
    const fn = script.runInContext(context);

    if (typeof fn !== 'function') {
      throw new Error('Compiled code did not return a function.');
    }

    const args = Object.values(params);
    return fn(...args);
  } catch (err) {
    throw new Error(`Error in ${fnName} implementation: ${err.message}`);
  }
}

async function main() {
  const args = process.argv;
  if (args.length < 3) {
    console.error('Usage: node scripts/runConfig.js <configurationId>');
    process.exit(1);
  }

  const configId = args[2];
  if (!mongoose.Types.ObjectId.isValid(configId)) {
    console.error(`❌ Invalid ObjectID: "${configId}"`);
    process.exit(1);
  }

  console.log('▶️ Connecting to MongoDB…');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  let config;
  try {
    config = await ConfigurationModel.findById(configId).lean();
    if (!config) {
      console.error(`❌ No configuration found with _id = ${configId}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error fetching configuration:', err.message);
    process.exit(1);
  }

  console.log('\n📋 Configuration details:');
  console.log(`  _id:         ${config._id}`);
  console.log(`  gmkFunction: ${config.gmkFunction}`);
  console.log(`  fhfFunction: ${config.fhfFunction}`);
  console.log(`  fhfInterval: ${config.fhfInterval} ms`);
  console.log(`  gmkParams:   ${JSON.stringify(config.parameters.gmk)}`);
  console.log(`  fhfParams:   ${JSON.stringify(config.parameters.fhf)}\n`);

  const [gmkDoc, fhfDoc] = await Promise.all([
    FunctionModel.findOne({ type: 'GMK', name: config.gmkFunction }).lean(),
    FunctionModel.findOne({ type: 'FHF', name: config.fhfFunction }).lean()
  ]);

  if (!gmkDoc) {
    console.error(`❌ GMK function "${config.gmkFunction}" לא נמצאה.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  if (!fhfDoc) {
    console.error(`❌ FHF function "${config.fhfFunction}" לא נמצאה.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // ==== הרצת GMK ====
  try {
    console.log('▶️ Running GMK function…');

    let gmkParamsPrepared = { ...config.parameters.gmk };
    if (config.gmkFunction === 'gmkEcdh') {
      const { privateKey, peerPublicKey } = config.parameters.gmk;
      gmkParamsPrepared = {
        privateKey:    Buffer.from(privateKey, 'hex'),
        peerPublicKey: Buffer.from(peerPublicKey, 'hex')
      };
    }
    // gmkHmac, gmkSecureRandom: לא דורשים המרה
    // gmkFingerprint: משתמש ב־Buffer פנימי

    const gmkOutput = compileAndRun(
      gmkDoc.implementation,
      gmkParamsPrepared,
      gmkDoc.name
    );

    // אם הפלט הוא Buffer: הפוך ל־hex (64 תווים), ואז קח 32 תווים ראשונים
    // אחרת: המר ל־string רגיל
    let gmkResult;
    if (Buffer.isBuffer(gmkOutput)) {
      const hex = gmkOutput.toString('hex'); // מחרוזת hex באורך 64
      gmkResult = hex.slice(0, 32);           // מקצרים ל־32 תווים
    } else {
      gmkResult = String(gmkOutput);
    }
    console.log('✅ GMK output (32 hex chars):', gmkResult);
  } catch (runErr) {
    console.error('❌', runErr.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  // ==== הרצת FHF ====
  try {
    console.log('\n▶️ Running FHF function…');

    let fhfParamsPrepared = { ...config.parameters.fhf };
    if (config.fhfFunction === 'aesCtrHop') {
      const { key, counter, legalChannels, count } = config.parameters.fhf;
      fhfParamsPrepared = {
        key:           Buffer.from(key, 'hex'),
        counter:       Buffer.from(counter, 'hex'),
        legalChannels,
        count
      };
    }
    // linearHop, prngHop, lfsrHop, primeModHop: לא דורשים המרה

    const fhfOutput = compileAndRun(
      fhfDoc.implementation,
      fhfParamsPrepared,
      fhfDoc.name
    );
    console.log('✅ FHF output:', fhfOutput);
  } catch (runErr) {
    console.error('❌', runErr.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`\n⏱️  FHF interval (ms): ${config.fhfInterval}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
