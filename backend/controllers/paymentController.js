// controllers/paymentController.js
const mongoose = require('mongoose');
const Payment  = require('../models/Payment');
const User     = require('../models/User');

// Helper: update balance in user's groups array
const updateGroupBalance = async (userId, groupId, increment) => {
  await User.updateOne(
    { _id: userId, 'groups.groupId': groupId },
    { $inc: { 'groups.$.balance': increment } }
  );
};

const getPaymentSummary = async (groupId, adminUserId = null) => {
  const groupObjectId = new mongoose.Types.ObjectId(groupId.toString());
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthlyTotalResult = await Payment.aggregate([
    {
      $match: {
        groupId: groupObjectId,
        date: { $gte: startOfMonth },
        isAdminSelfPayment: { $ne: true },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  let adminShareSummary = null;
  if (adminUserId) {
    const adminUser = await User.findById(adminUserId);
    const membership = adminUser?.getMembership(groupId);

    adminShareSummary = {
      totalOwed: membership?.adminShareOwed || 0,
      totalPaid: membership?.adminSharePaid || 0,
      remaining: Math.max(0, (membership?.adminShareOwed || 0) - (membership?.adminSharePaid || 0)),
    };
  }

  return {
    monthlyTotal: monthlyTotalResult[0]?.total || 0,
    adminShareSummary,
  };
};

// @route POST /api/groups/:groupId/payments
const recordPayment = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { memberId, amount, note, paymentMethod, date } = req.body;
    const numericAmount = Number(amount);
    const paymentDate = date ? new Date(date) : new Date();

    const adminId            = req.user._id.toString();
    const isAdminSelfPayment = memberId === adminId;

    const payer = await User.findOne({ _id: memberId, 'groups.groupId': groupId });
    if (!payer) {
      return res.status(404).json({ success: false, message: 'Person not found in this group' });
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }

    if (Number.isNaN(paymentDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid payment date' });
    }

    const payment = await Payment.create({
      member            : memberId,
      receivedBy        : req.user._id,
      amount            : numericAmount,
      note              : note || '',
      paymentMethod     : paymentMethod || 'cash',
      groupId,
      date              : paymentDate,
      isAdminSelfPayment,
    });

    if (isAdminSelfPayment) {
      // Admin paying own share — update adminSharePaid in group
      await User.updateOne(
        { _id: adminId, 'groups.groupId': groupId },
        { $inc: { 'groups.$.adminSharePaid': numericAmount } }
      );
    } else {
      // Member paying admin — update both balances
      await updateGroupBalance(memberId,        groupId,  numericAmount);
      await updateGroupBalance(req.user._id,    groupId, -numericAmount);
    }

    const populatedPayment = await Payment
      .findById(payment._id)
      .populate('member',     'name email')
      .populate('receivedBy', 'name');

    const updatedPayer = await User.findById(memberId);
    const membership   = updatedPayer.getMembership(groupId);
    const summary      = await getPaymentSummary(groupId, req.user._id);

    res.status(201).json({
      success        : true,
      message        : isAdminSelfPayment
        ? `Your share payment of Rs. ${numericAmount} recorded`
        : `Payment of Rs. ${numericAmount} recorded from ${payer.name}`,
      payment        : populatedPayment,
      newPayerBalance: membership?.balance || 0,
      summary,
      adminShareInfo : isAdminSelfPayment ? {
        paid: membership?.adminSharePaid || 0,
        owed: membership?.adminShareOwed || 0,
      } : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/groups/:groupId/payments
const getPayments = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { page = 1, limit = 10, memberId, type } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    const query = { groupId };

    if (req.groupRole === 'member') {
      query.member = req.user._id;
    } else if (memberId) {
      query.member = memberId;
    }

    if (type === 'member') query.isAdminSelfPayment = { $ne: true };
    if (type === 'self')   query.isAdminSelfPayment = true;

    const total    = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('member',     'name email')
      .populate('receivedBy', 'name')
      .sort({ date: -1 })
      .limit(limitNumber)
      .skip((pageNumber - 1) * limitNumber);

    const summary = await getPaymentSummary(
      groupId,
      req.groupRole === 'admin' ? req.user._id : null
    );

    res.json({
      success          : true,
      payments,
      monthlyTotal     : summary.monthlyTotal,
      adminShareSummary: summary.adminShareSummary,
      pagination       : { total, page: pageNumber, pages: Math.ceil(total / limitNumber) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route DELETE /api/groups/:groupId/payments/:id
const deletePayment = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const payment = await Payment.findById(req.params.id);

    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.groupId.toString() !== groupId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (payment.isAdminSelfPayment) {
      await User.updateOne(
        { _id: payment.receivedBy, 'groups.groupId': groupId },
        { $inc: { 'groups.$.adminSharePaid': -payment.amount } }
      );
    } else {
      await updateGroupBalance(payment.member,     groupId, -payment.amount);
      await updateGroupBalance(payment.receivedBy, groupId,  payment.amount);
    }

    await payment.deleteOne();
    const summary = await getPaymentSummary(groupId, req.user._id);

    res.json({
      success: true,
      message: 'Payment reversed and deleted',
      deletedPaymentId: req.params.id,
      summary,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { recordPayment, getPayments, deletePayment };
