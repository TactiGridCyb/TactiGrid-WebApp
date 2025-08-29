// models/RootCA.js
import mongoose from 'mongoose';

const RootCASchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // "root-ca"
    type: String,
    cert: { type: String, required: true },        // PEM
    privateKey: { type: String, required: true },  // encrypted PEM
    keyEncryptionMethod: String,
    createdAt: Date,
  },
  { _id: false, collection: 'CA' } // <-- binds to the "CA" collection (no pluralize)
);

// Reuse model on hot reloads
export default mongoose.models.RootCA || mongoose.model('RootCA', RootCASchema, 'CA');
