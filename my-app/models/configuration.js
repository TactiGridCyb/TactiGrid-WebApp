// File: models/Configuration.js

import mongoose from 'mongoose';

const ConfigurationSchema = new mongoose.Schema({
  gmkFunction:  { type: String, required: true },
  fhfFunction:  { type: String, required: true },
  fhfInterval:  { type: Number, required: true },           
  parameters:   { type: mongoose.Schema.Types.Mixed,        
                  default: {} },
  createdAt:    { type: Date,   default: Date.now }
}, {
  collection: 'configurations'
});

// unique on GMK + FHF to prevent duplicates
ConfigurationSchema.index(
  { gmkFunction: 1, fhfFunction: 1 },
  { unique: true }
);

const Configuration = mongoose.models.Configuration ||
  mongoose.model('Configuration', ConfigurationSchema);

export default Configuration;
