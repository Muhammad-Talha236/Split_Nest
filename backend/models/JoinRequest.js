// models/JoinRequest.js - Replaces InviteToken system
const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema(
  {
    user: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'User',
      required: true,
    },
    group: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'Group',
      required: true,
    },
    status: {
      type   : String,
      enum   : ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    // Optional message from member when requesting
    message: {
      type     : String,
      default  : '',
      maxlength: [200, 'Message cannot exceed 200 characters'],
    },
    // Reason if admin rejects
    rejectedReason: {
      type     : String,
      default  : '',
      maxlength: [200, 'Reason cannot exceed 200 characters'],
    },
    // Admin who handled the request
    handledBy: {
      type   : mongoose.Schema.Types.ObjectId,
      ref    : 'User',
      default: null,
    },
    handledAt: {
      type   : Date,
      default: null,
    },
  },
  { timestamps: true }
);

// One pending request per user per group at a time
joinRequestSchema.index({ user: 1, group: 1 }, { unique: true });
joinRequestSchema.index({ group: 1, status: 1 });
joinRequestSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('JoinRequest', joinRequestSchema);