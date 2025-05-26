// app/api/config/route.js
export const runtime = 'nodejs';

import dbConnect     from '../../../lib/mongoose';
import Configuration from '../../../models/Configuration';

export async function POST(request) {
  await dbConnect();

  const { gmkFunction, fhfFunction } = await request.json();

  // 1) Check if this combination already exists
  const existing = await Configuration.findOne({ gmkFunction, fhfFunction });
  if (existing) {
    return new Response(JSON.stringify({
      success:   false,
      error:     'Configuration already exists',
      configId:  existing._id.toString()
    }), { status: 409 });
  }

  // 2) Otherwise create it
  const config = await Configuration.create({ gmkFunction, fhfFunction });

  // 3) Return the new document
  return new Response(JSON.stringify({
    success:    true,
    configId:   config._id.toString(),
    gmkFunction,
    fhfFunction,
    createdAt:  config.createdAt
  }), { status: 200 });
}
