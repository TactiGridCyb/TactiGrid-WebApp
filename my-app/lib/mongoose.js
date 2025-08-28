// lib/mongoose.js
import mongoose from 'mongoose';

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in your environment');
}

// Cache across hot reloads
let cached = globalThis.__mongoose_cached;
if (!cached) {
  cached = globalThis.__mongoose_cached = { conn: null, promise: null };
}

/**
 * Connect once and reuse. Do NOT close here.
 */
export default async function dbConnect() {
  // reuse if connected
  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;

  // start a single connection promise
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
    }).then(m => {
      console.log('[mongoose] connected');
      return m;
    }).catch(err => {
      cached.promise = null;
      throw err;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
