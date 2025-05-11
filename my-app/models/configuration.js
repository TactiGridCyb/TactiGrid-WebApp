// models/Configuration.js
import mongoose from 'mongoose';

const ConfigurationSchema = new mongoose.Schema({
  gmkFunction: { type: String, required: true },
  fhfFunction: { type: String, required: true },
  createdAt:   { type: Date,   default: Date.now }
}, {
  collection: 'configurations'
});

const Configuration = 
  mongoose.models.Configuration ||
  mongoose.model('Configuration', ConfigurationSchema);

// ← this line makes it a default export
export default Configuration;
