// lib/models/mission.js
import mongoose, { Schema } from 'mongoose';

/* --- sub-documents --- */
const LocationSub = new Schema(
  {
    lat:     { type: Number, required: true },
    lng:     { type: Number, required: true },
    address: { type: String,  default: '' }
  },
  { _id: false }
);

const MissionSchema = new Schema(
  {
    /* template fields -------------------------------------- */
    missionId:       { type: String, required: true, unique: true , alias: 'id'  }, // “id”
    name:            { type: String, required: true },
    startTime:       { type: Date,   required: true },
    endTime:       { type: Date,   required: true },
    duration:        { type: String, required: true },               // "HH:MM"

    location:        { type: LocationSub, required: true },

    soldiers:        [{ type: Schema.Types.ObjectId, ref: 'Soldier' }],
    commanders:      [{ type: Schema.Types.ObjectId, ref: 'Soldier' }],

    configurationId: { type: String, default: '' }
  },
  { timestamps: true }
);

/* expose / reuse */
export default mongoose.models.Mission ||
       mongoose.model('Mission', MissionSchema);
