// models/Expense.js
const mongoose = require('mongoose');

const splitDetailSchema = new mongoose.Schema(
  {
    member: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'User',
      required: true,
    },
    percentage: {
      type   : Number,
      default: null,
    },
    amount: {
      type    : Number,
      required: true,
    },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type     : String,
      required : [true, 'Expense title is required'],
      trim     : true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type     : String,
      default  : '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    descriptionCleared: {
      type   : Boolean,
      default: false,
    },
    amount: {
      type    : Number,
      required: [true, 'Amount is required'],
      min     : [1, 'Amount must be greater than 0'],
    },
    splitAmount: {
      type: Number,
    },
    splitMode: {
      type   : String,
      enum   : ['equal', 'percentage'],
      default: 'equal',
    },
    splitDetails: {
      type   : [splitDetailSchema],
      default: [],
    },
    paidBy: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'User',
      required: true,
    },
    dividedAmong: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'User',
      },
    ],
    groupId: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'Group',
      required: true,
    },
    date: {
      type   : Date,
      default: Date.now,
    },
    category: {
      type   : String,
      enum   : ['grocery', 'electricity', 'gas', 'internet', 'water', 'rent', 'other'],
      default: 'other',
    },
  },
  { timestamps: true }
);

expenseSchema.index({ groupId: 1, date: -1 });
expenseSchema.index({ groupId: 1, category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
