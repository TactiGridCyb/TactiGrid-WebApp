// app/api/config/route.js
export const runtime = 'nodejs';

import dbConnect     from '../../../lib/mongoose';
import Configuration from '../../../models/Configuration';

export async function POST(request) {
  await dbConnect();

  // 1) Extract payload
  const {
    gmkFunction,
    gmkParams = {},
    fhfFunction,
    fhfParams = {},
    fhfInterval
  } = await request.json();

  // 2) Basic validation
  if (!gmkFunction || !fhfFunction || typeof fhfInterval !== 'number') {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required fields' }),
      { status: 400 }
    );
  }

  // 3) “No-duplicates” check:
  //    We look for any existing document where:
  //      • gmkFunction   is identical
  //      • fhfFunction   is identical
  //      • parameters.gmk   object is identical (deep match)
  //      • parameters.fhf   object is identical (deep match)
  //      • fhfInterval   is identical
  //
  //    Only if all five match exactly (same keys & values), do we return 409 Conflict.
  //    If any one of these is different, findOne returns null → we proceed to create.
  const existing = await Configuration.findOne({
    gmkFunction,
    fhfFunction,
    'parameters.gmk': gmkParams,
    'parameters.fhf': fhfParams,
    fhfInterval
  });

  if (existing) {
    return new Response(
      JSON.stringify({
        success:  false,
        error:    'Exact same configuration already exists',
        configId: existing._id.toString()
      }),
      { status: 409 }
    );
  }

  // 4) Since at least one field differs, we create a brand‐new document
  let config;
  try {
    config = await Configuration.create({
      gmkFunction,
      fhfFunction,
      fhfInterval,
      parameters: {
        gmk: gmkParams,
        fhf: fhfParams
      }
    });
  } catch (err) {
    // If Mongoose validation fails (schema mismatch), we log and return a 500.
    console.error('[/api/config] creation error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error:   'Database error creating configuration'
      }),
      { status: 500 }
    );
  }

  // 5) Return success
  return new Response(
    JSON.stringify({
      success:     true,
      configId:    config._id.toString(),
      gmkFunction: config.gmkFunction,
      gmkParams:   config.parameters.gmk,
      fhfFunction: config.fhfFunction,
      fhfParams:   config.parameters.fhf,
      fhfInterval: config.fhfInterval,
      createdAt:   config.createdAt
    }),
    { status: 200 }
  );
}
