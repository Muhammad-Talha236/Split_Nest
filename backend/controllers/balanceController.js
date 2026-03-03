// controllers/balanceController.js
const User = require('../models/User');
const Expense = require('../models/Expense');
const Payment = require('../models/Payment');

const getBalances = async (req, res) => {
  try {
    const members = await User.find({ groupId: req.user.groupId })
      .select('name email role balance');

    const adminMember = members.find(m => m.role === 'admin');
    const adminBalance = adminMember ? adminMember.balance : 0;

    // Total still owed to admin by members
    const totalReceivable = members
      .filter(m => m.role !== 'admin' && m.balance < 0)
      .reduce((sum, m) => sum + Math.abs(m.balance), 0);

    // ✅ FIXED: Show ALL negative balance members in settlement (not just up to admin's balance)
    const settlements = members
      .filter(m => m.role !== 'admin' && m.balance < 0)
      .map(m => ({
        from: m.name,
        fromId: m._id,
        to: adminMember?.name || 'Admin',
        toId: adminMember?._id,
        amount: parseFloat(Math.abs(m.balance).toFixed(2)),
      }));

    res.json({
      success: true,
      members,
      summary: { totalReceivable, adminBalance },
      settlements,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const groupId = req.user.groupId;

    const expenseQuery = req.user.role === 'member'
      ? { groupId, dividedAmong: req.user._id }
      : { groupId };

    const paymentQuery = req.user.role === 'member'
      ? { groupId, member: req.user._id }
      : { groupId };

    const expenses = await Expense.find(expenseQuery)
      .populate('paidBy', 'name')
      .populate('dividedAmong', 'name')
      .select('title description descriptionCleared amount splitAmount date category dividedAmong paidBy');

    const payments = await Payment.find(paymentQuery)
      .populate('member', 'name')
      .populate('receivedBy', 'name');

    const combined = [
      ...expenses.map(e => ({
        type: 'expense',
        _id: e._id,
        title: e.title,
        description: e.descriptionCleared ? '(Description cleared after 21 days)' : e.description,
        amount: e.amount,
        splitAmount: e.splitAmount,
        date: e.date,
        category: e.category,
        paidBy: e.paidBy,
        dividedAmong: e.dividedAmong,
      })),
      ...payments.map(p => ({
        type: 'payment',
        _id: p._id,
        title: `Payment from ${p.member?.name}`,
        description: p.note,
        amount: p.amount,
        date: p.date,
        member: p.member,
        receivedBy: p.receivedBy,
        paymentMethod: p.paymentMethod,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = combined.length;
    const paginated = combined.slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      history: paginated,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getBalances, getHistory };