// lib/logs/uploadLog.js
import { cookies }       from 'next/headers';
import jwt               from 'jsonwebtoken';
import dbConnect         from '@/lib/mongoose';
import User              from '@/models/User';
import TelemetryTrack    from '@/models/Logs';
import { validateTrack } from '@/lib/validateLogs';

/** Read auth cookie → verify JWT → return {_id,email} or null */
async function getCurrentUser() {
  const token = cookies().get('authToken')?.value;
  if (!token) return null;

  try {
    const { sub } = jwt.verify(token, process.env.JWT_SECRET);
    await dbConnect();
    const user = await User.findById(sub).lean();
    return user ? { _id: user._id, email: user.email } : null;
  } catch {
    cookies().set('authToken', '', { maxAge: 0, path: '/' });
    return null;
  }
}

/**
 * Reads the request body (JSON), validates, and stores it
 * so it belongs ONLY to the current user.
 * Returns the inserted Mongo document.
 */
export async function uploadLog(req) {
  const me = await getCurrentUser();
  if (!me) throw new Error('not-signed-in');

  /* 1. parse body */
  const track = await req.json();

  /* 2. restore Buffer if client sent base-64 */
  if (typeof track.blob === 'string') {
    track.blob = Buffer.from(track.blob, 'base64');
  }

  /* 3. schema validation */
  if (!validateTrack(track)) {
    throw new Error('invalid-log');
  }

  /* 4. insert with userId injected */
  await dbConnect();
  return await TelemetryTrack.create({ ...track, userId: me._id });
}
