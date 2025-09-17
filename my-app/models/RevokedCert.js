import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const revokedSchema = new Schema(
  { serial: { type: String, required: true, unique: true }, revokedAt: Date },
  { collection: 'revoked', timestamps: true }
);

export default models.RevokedCert || model('RevokedCert', revokedSchema);
