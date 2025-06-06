// models/Configuration.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

// We define a “sub‐schema” for the `parameters` field. Each half (`gmk` and `fhf`) 
// can be any valid JSON object/array/primitive (Mixed), so that passing 
// `{ gmk: {...}, fhf: {...} }` comes through without validation errors.

const ParameterSchema = new Schema({
  gmk: { type: Schema.Types.Mixed, required: true },
  fhf: { type: Schema.Types.Mixed, required: true }
}, { _id: false });

// Now define the top‐level Configuration schema.  We require these exact keys:
const ConfigurationSchema = new Schema({
  gmkFunction:   { type: String, required: true },
  fhfFunction:   { type: String, required: true },
  fhfInterval:   { type: Number, required: true },
  parameters:    { type: ParameterSchema, required: true },
  createdAt:     { type: Date, default: Date.now }
});

// Export the model (use existing cached model if it exists)
export default mongoose.models.Configuration
  || mongoose.model('Configuration', ConfigurationSchema);
