import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const DataRow = new Schema({
  soldierId: { type: String, required: true },
  latitude:  { type: Number, required: true },
  longitude: { type: Number, required: true },
  heartRate: { type: Number, required: true },
  time_sent: { type: Date,   required: true }
}, { _id: false });

const LogSchema = new Schema({
  /* 0. ownership */
  userId:    { type: String, required: true, index: true },
  sessionId: { type: String, required: true },

  /* 1. headline */
  operation: { type: String, required: true },   // e.g. "OPERATION REDHAWK"
  missionId: { type: String, required: true },   // e.g. "ABC123"

  /* 2. timing */
  StartTime: { type: Date,   required: true },
  EndTime:   { type: Date,   required: true },
  Duration:  { type: Number, required: true },   // seconds

  /* 3. misc meta */
  GMK:      String,
  Location: { name: String, bbox: [Number] },
  Soldiers: [{ id:String, callsign:String }],
  ConfigID: String,

  intervalMs: { type: Number, required: true },
  codec:      { path:String, hr:String, compression:String },

  /* 4. telemetry rows */
  data:      { type:[DataRow], default: [] },

  /* 5. optional replay blob */
  blob: Buffer
}, {
  collection: 'logs',
  timestamps: true
});

LogSchema.index({ userId:1, sessionId:1 }, { unique:true });
LogSchema.index({ userId:1, StartTime:-1 });

export default models.Log || model('Log', LogSchema);
