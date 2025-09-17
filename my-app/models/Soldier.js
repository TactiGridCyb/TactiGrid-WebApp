import mongoose from 'mongoose';

const SoldierSchema = new mongoose.Schema(
  {
    /* 7051634 */
    IDF_ID: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    /* Israeli teudat-zehut, e.g. "023587619" */
    CITIZEN_ID: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    /* "Amit Rosen" */
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    /* "Soldier", "Commander", … */
    role: {
      type: String,
      enum: ['Soldier', 'Commander'],
      default: 'Soldier',
    },
  },
  { collection: 'soldiers', timestamps: true }
);

export default mongoose.models.Soldier ||
       mongoose.model('Soldier', SoldierSchema);
