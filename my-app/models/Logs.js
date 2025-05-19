// models/NewLog.js
import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

/* ── 1. telemetry row ─────────────────────────────────────────────── */
const DataRow = new Schema(
  {
    soldierId: { type: String, required: true },
    latitude:  { type: Number, required: true },
    longitude: { type: Number, required: true },
    heartRate: { type: Number, required: true },
    time_sent: { type: Date,   required: true }
  },
  { _id: false }
);

/* ── 2. inner mission-log (all the fields that used to be top-level) –── */
const MissionLog = new Schema(
  {
    /* ownership / headline */
    _id:       Schema.Types.ObjectId,          // the “old” ObjectId you imported
    userId:    { type: String, required: true },
    sessionId: { type: String, required: true },

    operation: { type: String, required: true },
    missionId: { type: String, required: true },

    /* timing */
    StartTime: { type: Date,   required: true },
    EndTime:   { type: Date,   required: true },
    Duration:  { type: Number, required: true }, // seconds

    /* meta */
    GMK:      String,
    Location: { name: String, bbox: [Number] },
    Soldiers: [{ id: String, callsign: String, _id: Schema.Types.ObjectId }],
    ConfigID: String,

    /* config & codec */
    intervalMs: { type: Number, required: true },
    codec:      { path: String, hr: String, compression: String },

    /* telemetry */
    data:  { type: [DataRow], default: [] },

    /* optional replay blob */
    blob:  Buffer
  },
  {
    _id : false,              // ← keeps the imported _id as a normal field
    timestamps: true          // createdAt / updatedAt INSIDE `log`
  }
);

/* ── 3. outer wrapper ──────────────────────────────────────────────── */
const WrappedLogSchema = new Schema(
  {
    userId:    { type: String, required: true, index: true }, // e.g. "unknown_commander"
    sessionId: { type: String, required: true },

    log:       { type: MissionLog, required: true }           // ← the big sub-document
  },
  {
    collection: 'logs',        // keeps you on the same collection
    timestamps: true           // createdAt / updatedAt OUTER wrapper
  }
);

/* helpful indexes */
WrappedLogSchema.index({ userId: 1, sessionId: 1 }, { unique: true });
WrappedLogSchema.index({ userId: 1, 'log.StartTime': -1 });

export default models.WrappedLog || model('WrappedLog', WrappedLogSchema);
