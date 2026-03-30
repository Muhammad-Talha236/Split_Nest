// models/Group.js
const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: {
      type     : String,
      required : [true, 'Group name is required'],
      trim     : true,
      maxlength: [100, 'Group name cannot exceed 100 characters'],
    },
    // Hostel / building info for discovery
    hostelName: {
      type     : String,
      trim     : true,
      default  : '',
      maxlength: [100, 'Hostel name cannot exceed 100 characters'],
    },
    city: {
      type     : String,
      trim     : true,
      default  : '',
      maxlength: [60, 'City cannot exceed 60 characters'],
    },
    university: {
      type     : String,
      trim     : true,
      default  : '',
      maxlength: [100, 'University cannot exceed 100 characters'],
    },
    // Description shown on group discovery card
    description: {
      type     : String,
      trim     : true,
      default  : '',
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },
    admin: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'User',
      },
    ],
    totalExpenses: {
      type   : Number,
      default: 0,
    },
    // Public groups appear in discovery; private = invite/request only
    isPublic: {
      type   : Boolean,
      default: true,
    },
    isActive: {
      type   : Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Virtual: member count
groupSchema.virtual('memberCount').get(function () {
  return this.members.length;
});

groupSchema.index({ hostelName: 1 });
groupSchema.index({ city: 1 });
groupSchema.index({ isPublic: 1, isActive: 1 });
groupSchema.index({ name: 'text', hostelName: 'text', city: 'text', university: 'text' });

module.exports = mongoose.model('Group', groupSchema);