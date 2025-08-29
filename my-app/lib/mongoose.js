// lib/mongoose.js
import mongoose from 'mongoose';

const { MONGODB_URI, MONGODB_DB } = process.env;
if (!MONGODB_URI) throw new Error('Please define MONGODB_URI in your env');

let cached = globalThis.__mongoose_cached;
if (!cached) cached = (globalThis.__mongoose_cached = { conn: null, promise: null });

/** Connect once and reuse. Never close here. */
export default async function dbConnect() {
  // already connected
  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: MONGODB_DB || undefined,      // <-- pick DB explicitly if set
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10_000,
      })
      .then((m) => {
        console.log('[mongoose] connected to DB:', m.connection.name);
        return m;
      })
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
