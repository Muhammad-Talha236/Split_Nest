// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    member: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'User',
      required: true,
    },
    receivedBy: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'User',
      required: true,
    },
    amount: {
      type    : Number,
      required: [true, 'Amount is required'],
      min     : [1, 'Amount must be greater than 0'],
    },
    note: {
      type     : String,
      default  : '',
      maxlength: [200, 'Note cannot exceed 200 characters'],
    },
    paymentMethod: {
      type   : String,
      enum   : ['cash', 'bank_transfer', 'online', 'other'],
      default: 'cash',
    },
    groupId: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'Group',
      required: true,
    },
    date: {
      type   : Date,
      default: Date.now,
    },
    // True when admin records his own share payment
    isAdminSelfPayment: {
      type   : Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ groupId: 1, date: -1 });
paymentSchema.index({ groupId: 1, member: 1 });

module.exports = mongoose.model('Payment', paymentSchema);