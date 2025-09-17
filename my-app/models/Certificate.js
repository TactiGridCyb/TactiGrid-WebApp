// /models/Certificate.js
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const certificateSchema = new Schema(
  {
    /* who owns the cert */
    subjectId:   { type: Schema.Types.ObjectId, ref: 'Soldier', required: true, index: true },
    fullName:    { type: String, required: true, trim: true },

    /* commander or regular soldier */
    isCommander: { type: Boolean, required: true, index: true },

    /* which mission this cert belongs to */
    missionId:   { type: Schema.Types.ObjectId, ref: 'Mission', required: true, index: true },

    /* PEM blobs */
    certPem:     { type: String, required: true },
    keyPem:      { type: String, required: true }, // keep selectable; you send this to devices

    /* metadata */
    serialNumber:{ type: String, required: true, unique: true },
    validFrom:   { type: Date,   required: true, index: true },
    validTo:     { type: Date,   required: true, index: true },
  },
  { timestamps: true, collection: 'certificates' }
);

/* ── Indexes ────────────────────────────────────────────────────── */
/* Exactly one active cert per (subject, mission) */
certificateSchema.index(
  { subjectId: 1, missionId: 1 },
  { unique: true, name: 'uniq_subject_mission' }
);

/* Explicit uniqueness on serial (belt-and-suspenders if autoIndex off) */
certificateSchema.index({ serialNumber: 1 }, { unique: true, name: 'uniq_serial' });

/* Helpful read patterns */
certificateSchema.index({ missionId: 1, subjectId: 1 }, { name: 'idx_mission_subject' });

export default models.Certificate || model('Certificate', certificateSchema);
