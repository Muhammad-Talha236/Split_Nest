// controllers/paymentController.js
const Payment = require('../models/Payment');
const User = require('../models/User');

// @desc    Record a payment
// @route   POST /api/payments
// @access  Private (Admin)
const recordPayment = async (req, res) => {
  try {
    const { memberId, amount, note, paymentMethod, date } = req.body;

    const adminId = req.user._id.toString();
    const isAdminPayingHimself = memberId === adminId;

    // Validate the person paying belongs to the group
    const payer = await User.findOne({ _id: memberId, groupId: req.user.groupId });
    if (!payer) {
      return res.status(404).json({ success: false, message: 'Person not found in your group' });
    }

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }

    // Create payment record
    const payment = await Payment.create({
      member: memberId,
      receivedBy: req.user._id,
      amount,
      note: note || '',
      paymentMethod: paymentMethod || 'cash',
      groupId: req.user.groupId,
      date: date || Date.now(),
    });

    if (isAdminPayingHimself) {
      // ✅ Admin settling own balance:
      // Admin's balance decreases (he collected his own share or is settling something)
      await User.findByIdAndUpdate(adminId, { $inc: { balance: -amount } });
    } else {
      // ✅ Member paying admin:
      // Member's debt reduces (balance goes toward 0 from negative)
      await User.findByIdAndUpdate(memberId, { $inc: { balance: amount } });
      // Admin's receivable reduces (he received this amount so less is owed to him)
      await User.findByIdAndUpdate(adminId, { $inc: { balance: -amount } });
    }

    const populatedPayment = await Payment.findById(payment._id)
      .populate('member', 'name email role')
      .populate('receivedBy', 'name');

    const updatedPayer = await User.findById(memberId).select('balance');

    res.status(201).json({
      success: true,
      message: `Payment of Rs. ${amount} recorded from ${payer.name}`,
      payment: populatedPayment,
      newMemberBalance: updatedPayer.balance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all payments for group
// @route   GET /api/payments
// @access  Private
const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, memberId } = req.query;

    const query = { groupId: req.user.groupId };

    if (req.user.role === 'member') {
      query.member = req.user._id;
    } else if (memberId) {
      query.member = memberId;
    }

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('member', 'name email role')
      .populate('receivedBy', 'name')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyTotal = await Payment.aggregate([
      { $match: { groupId: req.user.groupId, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      success: true,
      payments,
      monthlyTotal: monthlyTotal[0]?.total || 0,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete/reverse a payment
// @route   DELETE /api/payments/:id
// @access  Private (Admin)
const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.groupId.toString() !== req.user.groupId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const adminId = req.user._id.toString();
    const isAdminSelfPayment = payment.member.toString() === adminId;

    if (isAdminSelfPayment) {
      // Reverse admin's own payment
      await User.findByIdAndUpdate(adminId, { $inc: { balance: payment.amount } });
    } else {
      // Reverse member payment: restore member's debt, restore admin's receivable
      await User.findByIdAndUpdate(payment.member, { $inc: { balance: -payment.amount } });
      await User.findByIdAndUpdate(payment.receivedBy, { $inc: { balance: payment.amount } });
    }

    await payment.deleteOne();

    res.json({ success: true, message: 'Payment reversed and deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { recordPayment, getPayments, deletePayment };