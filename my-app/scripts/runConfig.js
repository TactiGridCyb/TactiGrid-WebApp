// lib/runMissionConfiguration.js
/* eslint-disable no-console */
import vm                from 'node:vm';
import { createRequire } from 'node:module';
import crypto            from 'node:crypto';
import MersenneTwister   from 'mersenne-twister';
import shuffle           from 'lodash.shuffle';
import mongoose          from 'mongoose';

import dbConnect     from '../lib/mongoose.js';
import Mission       from '../models/MissionModel.js';
import Configuration from '../models/configuration.js';
import FuncModel     from '../models/function.js';

/* ───────────────────────────────── helpers ────────────────────────────── */

function compileAndRun(source, params, fnName) {
  const wrapped = `(${source})`;
  const sandbox = {
    require : createRequire(import.meta.url),
    module  : { exports: {} },
    exports : {},
    crypto,
    MersenneTwister,
    shuffle,
    Buffer,
  };
  sandbox.globalThis = sandbox;

  const fn = new vm.Script(wrapped).runInContext(vm.createContext(sandbox));
  if (typeof fn !== 'function') 
  {
    throw new Error(`"${fnName}" did not evaluate to a function`);
  }

  if(!params)
  {
    return fn();
  }
  
  return fn(...Object.values(params));
}

const adaptGmk = (name, p) =>
  name === 'gmkEcdh'
    ? { privateKey   : Buffer.from(p.privateKey,   'hex'),
        peerPublicKey: Buffer.from(p.peerPublicKey,'hex') }
    : p;

const adaptFhf = (name, p) =>
  name === 'aesCtrHop'
    ? { ...p,
        key    : Buffer.from(p.key,     'hex'),
        counter: Buffer.from(p.counter, 'hex') }
    : p;

/* ─────────────────────────────── core ───────────────────────────────── */

/**
 * runMissionConfiguration
 * @param  {string} missionId – MongoDB ObjectId of the Mission doc
 * @returns {Promise<{ gmk: string, fhf: any, interval: number }>}
 */
export async function runMissionConfiguration(missionId) {
  if (!mongoose.Types.ObjectId.isValid(missionId)) {
    throw new Error(`"${missionId}" is not a valid ObjectId`);
  }

  await dbConnect();                       // your pooled connector

  try {
    /* 1️⃣  load Mission + its Configuration in one go */
    const mission = await Mission.findById(missionId)
      .populate('Configuration')           // pulls the config doc in-place
      .lean();

    if (!mission)   throw new Error(`No mission with _id = ${missionId}`);
    if (!mission.Configuration)
      throw new Error(`Mission ${missionId} has no Configuration linked`);

    const cfg = mission.Configuration;     // convenience alias

    /* 2️⃣  fetch GMK & FHF implementation docs in parallel */
    const [gmkDoc, fhfDoc] = await Promise.all([
      FuncModel.findOne({ type: 'GMK', name: cfg.gmkFunction }).lean(),
      FuncModel.findOne({ type: 'FHF', name: cfg.fhfFunction }).lean(),
    ]);
    if (!gmkDoc) throw new Error(`GMK "${cfg.gmkFunction}" not found`);
    if (!fhfDoc) throw new Error(`FHF "${cfg.fhfFunction}" not found`);

    /* 3️⃣  run GMK */
    const gmkRaw = compileAndRun(
      gmkDoc.implementation,
      adaptGmk(gmkDoc.name, cfg.parameters.gmk),
      gmkDoc.name,
    );
    const gmk = Buffer.isBuffer(gmkRaw)
      ? gmkRaw.toString('hex').slice(0, 32)   // 128-bit hex
      : String(gmkRaw);

    /* 4️⃣  run FHF */
    const fhf = compileAndRun(
      fhfDoc.implementation,
      adaptFhf(fhfDoc.name, cfg.parameters.fhf),
      fhfDoc.name,
    );

    /* 5️⃣  return the trio */
    return { gmk, fhf, interval: cfg.fhfInterval };
  } finally {
    /* disconnect only if you don’t keep a global pool elsewhere */
    await mongoose.disconnect();
  }
}
