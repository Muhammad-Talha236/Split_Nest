// models/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// Per-group membership subdocument
const groupMembershipSchema = new mongoose.Schema({
  groupId: {
    type    : mongoose.Schema.Types.ObjectId,
    ref     : 'Group',
    required: true,
  },
  role: {
    type   : String,
    enum   : ['admin', 'member'],
    default: 'member',
  },
  // For MEMBERS: negative = owes admin, positive = admin owes member, 0 = settled
  // For ADMIN:   positive = total receivable from members
  balance: {
    type   : Number,
    default: 0,
  },
  // ADMIN ONLY: Total of admin's OWN share across all expenses
  adminShareOwed: {
    type   : Number,
    default: 0,
  },
  // ADMIN ONLY: Total amount admin has paid for his own share
  adminSharePaid: {
    type   : Number,
    default: 0,
  },
  joinedAt: {
    type   : Date,
    default: Date.now,
  },
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    name: {
      type     : String,
      required : [true, 'Name is required'],
      trim     : true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type     : String,
      required : [true, 'Email is required'],
      unique   : true,
      lowercase: true,
      trim     : true,
      match    : [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type     : String,
      required : [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select   : false,
    },
    // All groups this user belongs to (with per-group balance & role)
    groups: {
      type   : [groupMembershipSchema],
      default: [],
    },
    // Currently active group (for UI switching)
    activeGroupId: {
      type   : mongoose.Schema.Types.ObjectId,
      ref    : 'Group',
      default: null,
    },
    isActive: {
      type   : Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Helper: get membership object for a specific group
userSchema.methods.getMembership = function (groupId) {
  return this.groups.find(g => g.groupId.toString() === groupId.toString());
};

// Helper: get role in a specific group
userSchema.methods.getRoleInGroup = function (groupId) {
  const membership = this.getMembership(groupId);
  return membership ? membership.role : null;
};

// Helper: get balance in a specific group
userSchema.methods.getBalanceInGroup = function (groupId) {
  const membership = this.getMembership(groupId);
  return membership ? membership.balance : 0;
};

// email already has unique:true in schema definition — no duplicate index needed
userSchema.index({ 'groups.groupId': 1 });
userSchema.index({ activeGroupId: 1 });

module.exports = mongoose.model('User', userSchema);