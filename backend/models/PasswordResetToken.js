// models/PasswordResetToken.js
const mongoose = require('mongoose');
const crypto   = require('crypto');

const passwordResetSchema = new mongoose.Schema({
  userId: {
    type    : mongoose.Schema.Types.ObjectId,
    ref     : 'User',
    required: true,
  },
  token: {
    type    : String,
    required: true,
    unique  : true,
    default : () => crypto.randomBytes(32).toString('hex'),
  },
  expiresAt: {
    type   : Date,
    default: () => new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  },
  used: {
    type   : Boolean,
    default: false,
  },
}, { timestamps: true });

// Auto-delete expired tokens
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

passwordResetSchema.methods.isValid = function () {
  return !this.used && this.expiresAt > new Date();
};

module.exports = mongoose.model('PasswordResetToken', passwordResetSchema);