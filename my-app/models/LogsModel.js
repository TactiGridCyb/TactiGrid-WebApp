import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

/* ──────── telemetry row ──────── */
const dataRowSchema = new Schema(
  {
    soldierId: { type: String, required: true, trim: true },
    latitude:  { type: Number, required: true, min: -90,  max: 90  },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    heartRate: { type: Number, required: true, min: 0 },
    time_sent: { type: Date,   required: true },
  },
  { _id: false }
);

/* ──────── event row ──────── */
const eventSchema = new Schema(
  {
    name:      { type: String, required: true },
    time_sent: { type: Date, required: true },
    data:      { type: Schema.Types.Mixed, default: {} },  // flexible JSON
  },
  { _id: false }
);

/* ──────── main log schema ──────── */
const logSchema = new Schema(
  {
    Interval:  { type: Number, required: true, min: 1 },
    Mission:   { type: Schema.Types.ObjectId, ref: 'Mission', required: true },
    
    Data:      { type: [dataRowSchema], default: [] },   // telemetry
    Events:    { type: [eventSchema], default: [] },     // new event log
  },
  {
    collection: 'logs',
    timestamps: true,
  }
);

logSchema.index({ Mission: 1 });

export default models.Log || model('Log', logSchema);
