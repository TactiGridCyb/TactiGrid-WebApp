// models/Function.js
import mongoose from 'mongoose';

const FunctionSchema = new mongoose.Schema({
  name:           { type: String, required: true, unique: true },
  type:           { type: String, enum: ['FHF','GMK'], required: true },
  description:    { type: String, required: true },
  parameters:     { type: Array,  default: [] },
  implementation: { type: String, required: true },   
  createdAt:      { type: Date,   default: Date.now }
}, {
  collection: 'configuration-functions'
});

export default mongoose.models.Function ||
  mongoose.model('Function', FunctionSchema);
