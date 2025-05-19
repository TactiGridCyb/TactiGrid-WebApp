// models/Configuration.js
import mongoose from 'mongoose';

const ConfigurationSchema = new mongoose.Schema({
  gmkFunction: { type: String, required: true },
  fhfFunction: { type: String, required: true },
  createdAt:   { type: Date,   default: Date.now }
}, {
  collection: 'configurations'
});

// אינדקס ייחודי על שני השדות
ConfigurationSchema.index(
  { gmkFunction: 1, fhfFunction: 1 },
  { unique: true }
);

const Configuration = mongoose.models.Configuration ||
  mongoose.model('Configuration', ConfigurationSchema);

export default Configuration;
