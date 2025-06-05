import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const certificateSchema = new Schema(
  {
    /* who owns the cert */
    subjectId:   { type: Schema.Types.ObjectId, ref: 'Soldier', required: true },
    fullName:    { type: String, required: true },

    /* commander or regular soldier */
    isCommander: { type: Boolean, required: true },

    /* which mission this cert belongs to */
    missionId:   { type: Schema.Types.ObjectId, ref: 'Mission', required: true },

    /* PEM blobs */
    certPem:     { type: String, required: true },
    keyPem:      { type: String, required: true },

    /* metadata */
    serialNumber:{ type: String, required: true, unique: true },
    validFrom:   { type: Date,   required: true },
    validTo:     { type: Date,   required: true },
  },
  { timestamps: true, collection: 'certificates' }
);

export default models.Certificate || model('Certificate', certificateSchema);
