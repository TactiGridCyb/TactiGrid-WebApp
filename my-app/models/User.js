// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcrypt'; // or argon2, etc.

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  hashedPassword: {
    type: String,
    required: true,
  },
  salt: {
    type: String,
  },
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  // If password hasn’t been modified, skip
  if (!this.isModified('hashedPassword')) {
    return next();
  }
  
  const saltRounds = 10;
  const salt = await bcrypt.genSalt(saltRounds);
  this.hashedPassword = await bcrypt.hash(this.hashedPassword, salt);
  this.salt = salt; // if you want to store salt separately (optional)
  
  next();
});



export default mongoose.models.User || mongoose.model('User', UserSchema);
