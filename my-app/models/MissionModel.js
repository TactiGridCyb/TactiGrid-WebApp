// models/Mission.js
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

/* ── embedded sub-document for geographic data ── */
const locationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    lat:  { type: Number, required: true, min: -90,  max: 90  },
    lon:  { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false }           // don’t create a separate _id for this sub-doc
);

/* ── main Mission schema ── */
const missionSchema = new Schema(
  {
    missionName:  { type: String, required: true, trim: true },

    createdAt:    { type: Date,   default: Date.now },   // set when doc is first saved
    StartTime:    { type: Date,   required: true },
    EndTime:      { type: Date,   default: null },

    // store raw seconds; you can calculate it (or expose as virtual) if preferred
    Duration:     { type: Number, required: true, min: 0 },

    Location:     { type: locationSchema, required: true },

    /* store references to other collections so you can populate() later */
    Soldiers:     [{ type: Schema.Types.ObjectId, ref: 'Soldier' }],

    /* the array order is kept, so index 0 is “most important” commander */
    Commanders:   [{ type: Schema.Types.ObjectId, ref: 'Commander' }],

    Configuration:{ type: Schema.Types.ObjectId, ref: 'Configuration', required: true },
    Log:          { type: Schema.Types.ObjectId, ref: 'Log' , default: null  },

    IsFinished:   { type: Boolean, default: false },
  },
  {
    collection: 'missions',   // keeps collection name singular/plural consistent
    timestamps: false,        // you already track createdAt manually
  }
);

/* optional helper: compute Duration automatically when EndTime is set */
missionSchema.pre('save', function (next) {
  if (this.EndTime && this.StartTime) {
    this.Duration = Math.round((this.EndTime - this.StartTime) / 1000);
  }
  next();
});

/* example index that speeds up queries for “open” vs “done” missions */
missionSchema.index({ IsFinished: 1 });

export default models.Mission || model('Mission', missionSchema);
