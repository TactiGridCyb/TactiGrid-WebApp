// File: app/api/config/route.js
export const runtime = 'nodejs';

import dbConnect     from '../../../lib/mongoose';
import Configuration from '../../../models/Configuration';

export async function POST(request) {
  await dbConnect();
  const {
    gmkFunction,
    gmkParams = {},
    fhfFunction,
    fhfParams = {},
    fhfInterval
  } = await request.json();

  // 1) Prevent duplicates
  const exists = await Configuration.findOne({ gmkFunction, fhfFunction });
  if (exists) {
    return new Response(JSON.stringify({
      success:   false,
      error:     'Configuration already exists',
      configId:  exists._id.toString()
    }), { status: 409 });
  }

  let config;
  try {
    // 2) Create new config
    config = await Configuration.create({
      gmkFunction,
      fhfFunction,
      fhfInterval,
      parameters: { gmk: gmkParams, fhf: fhfParams }
    });
  } catch (e) {
    console.error('[/api/config] create error', e);
    return new Response(JSON.stringify({
      success: false,
      error:   'Failed to create configuration'
    }), { status: 500 });
  }

  // 3) Safely extract back the params
  const storedParams     = config.parameters || {};
  const storedGmkParams = storedParams.gmk || {};
  const storedFhfParams = storedParams.fhf || {};

  // 4) Return a well-formed JSON response
  return new Response(JSON.stringify({
    success:     true,
    configId:    config._id.toString(),
    gmkFunction: config.gmkFunction,
    gmkParams:   storedGmkParams,
    fhfFunction: config.fhfFunction,
    fhfParams:   storedFhfParams,
    fhfInterval: config.fhfInterval,
    createdAt:   config.createdAt
  }), { status: 200 });
}
