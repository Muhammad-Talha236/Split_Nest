// controllers/expenseController.js - Expense CRUD + balance management
const Expense = require('../models/Expense');
const User    = require('../models/User');
const Group   = require('../models/Group');

// @desc    Get all expenses for group
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, startDate, endDate } = req.query;

    const query = { groupId: req.user.groupId };

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate)   query.date.$lte = new Date(endDate);
    }

    const total    = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .populate('paidBy',       'name')
      .populate('dividedAmong', 'name')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      success: true,
      expenses,
      pagination: {
        total,
        page : parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add new expense
// @route   POST /api/expenses
// @access  Private (Admin)
const addExpense = async (req, res) => {
  try {
    const { title, description, dividedAmong, date, category } = req.body;

    // ✅ FIX 1: req.body values are strings — parse amount to float explicitly.
    // Without this, amount.toFixed() throws "amount.toFixed is not a function" → 500 error.
    const amount = parseFloat(req.body.amount);

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    if (!dividedAmong || dividedAmong.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one member to split between' });
    }

    // Validate members belong to same group
    const members = await User.find({
      _id     : { $in: dividedAmong },
      groupId : req.user.groupId,
    });

    if (members.length !== dividedAmong.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected members do not belong to this group',
      });
    }

    // splitAmount = amount ÷ how many people are selected (admin + selected members)
    const splitAmount = parseFloat((amount / dividedAmong.length).toFixed(2));

    // Create expense
    const expense = await Expense.create({
      title,
      description : description || '',
      amount,
      paidBy      : req.user._id,
      dividedAmong,
      groupId     : req.user.groupId,
      date        : date || Date.now(),
      category    : category || 'other',
      splitAmount,
    });

    // ─── BALANCE LOGIC ─────────────────────────────────────────────────────────
    //
    // Admin paid the FULL amount from his pocket. The split tells us how much
    // each selected person owes.
    //
    // CASE A — Admin IS selected (e.g. 4 people, Rs.1000 → Rs.250 each):
    //   • salman  balance -= 250   (owes admin)
    //   • shahzman balance -= 250  (owes admin)
    //   • ahmad   balance -= 250   (owes admin)
    //   • Admin receivable += 750  (sum of 3 non-admin shares = splitAmount × 3)
    //   • Admin adminShareOwed += 250  (his own personal share to track)
    //
    // CASE B — Admin NOT selected (e.g. 3 members, Rs.1000 → Rs.333 each):
    //   • salman  balance -= 333
    //   • shahzman balance -= 333
    //   • ahmad   balance -= 333
    //   • Admin receivable += 999  (splitAmount × 3 non-admin members)
    //   • Admin has no personal share here
    //
    // ✅ FIX 2: Old code used `amount.toFixed(2)` for admin receivable when admin
    // was NOT included — that caused the crash AND was logically wrong due to
    // floating-point rounding. Correct formula: splitAmount × nonAdminCount.
    // ───────────────────────────────────────────────────────────────────────────

    const adminId       = req.user._id.toString();
    const adminIncluded = dividedAmong.map(id => id.toString()).includes(adminId);
    const nonAdminIds   = dividedAmong.filter(id => id.toString() !== adminId);

    // Deduct each non-admin member's share
    for (const memberId of nonAdminIds) {
      await User.findByIdAndUpdate(memberId, {
        $inc: { balance: -splitAmount },
      });
    }

    // Admin's receivable = only what non-admin members owe him
    const adminReceivable = parseFloat((splitAmount * nonAdminIds.length).toFixed(2));

    const adminUpdate = { $inc: { balance: adminReceivable } };
    if (adminIncluded) {
      adminUpdate.$inc.adminShareOwed = splitAmount;
    }

    await User.findByIdAndUpdate(req.user._id, adminUpdate);

    // Update group total expenses
    await Group.findByIdAndUpdate(req.user.groupId, {
      $inc: { totalExpenses: amount },
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy',       'name')
      .populate('dividedAmong', 'name');

    res.status(201).json({
      success : true,
      message : 'Expense added and balances updated',
      expense : populatedExpense,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private (Admin)
const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    if (expense.groupId.toString() !== req.user.groupId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const adminId = expense.paidBy.toString();

    // ─── Reverse old balance changes ─────────────────────────────────────────
    const oldSplit         = parseFloat((expense.amount / expense.dividedAmong.length).toFixed(2));
    const oldAdminIncluded = expense.dividedAmong.map(id => id.toString()).includes(adminId);
    const oldNonAdmin      = expense.dividedAmong.filter(id => id.toString() !== adminId);

    for (const memberId of oldNonAdmin) {
      await User.findByIdAndUpdate(memberId, { $inc: { balance: oldSplit } });
    }

    // ✅ Use same formula as addExpense: splitAmount × nonAdminCount
    const oldAdminReceivable = parseFloat((oldSplit * oldNonAdmin.length).toFixed(2));
    const oldAdminReversal   = { $inc: { balance: -oldAdminReceivable } };
    if (oldAdminIncluded) {
      oldAdminReversal.$inc.adminShareOwed = -oldSplit;
    }
    await User.findByIdAndUpdate(expense.paidBy, oldAdminReversal);

    await Group.findByIdAndUpdate(req.user.groupId, {
      $inc: { totalExpenses: -expense.amount },
    });

    // ─── Update expense fields ────────────────────────────────────────────────
    const { title, description, dividedAmong, date, category } = req.body;
    // ✅ Always parse amount from string
    const newAmount = req.body.amount ? parseFloat(req.body.amount) : expense.amount;

    expense.title        = title        || expense.title;
    expense.description  = description !== undefined ? description : expense.description;
    expense.amount       = newAmount;
    expense.dividedAmong = dividedAmong || expense.dividedAmong;
    expense.date         = date         || expense.date;
    expense.category     = category     || expense.category;
    expense.splitAmount  = parseFloat((expense.amount / expense.dividedAmong.length).toFixed(2));
    await expense.save();

    // ─── Apply new balance changes ────────────────────────────────────────────
    const newAdminId       = req.user._id.toString();
    const newSplit         = expense.splitAmount;
    const newAdminIncluded = expense.dividedAmong.map(id => id.toString()).includes(newAdminId);
    const newNonAdmin      = expense.dividedAmong.filter(id => id.toString() !== newAdminId);

    for (const memberId of newNonAdmin) {
      await User.findByIdAndUpdate(memberId, { $inc: { balance: -newSplit } });
    }

    // ✅ Correct formula: splitAmount × nonAdminCount
    const newAdminReceivable = parseFloat((newSplit * newNonAdmin.length).toFixed(2));
    const newAdminUpdate     = { $inc: { balance: newAdminReceivable } };
    if (newAdminIncluded) {
      newAdminUpdate.$inc.adminShareOwed = newSplit;
    }
    await User.findByIdAndUpdate(req.user._id, newAdminUpdate);

    await Group.findByIdAndUpdate(req.user.groupId, {
      $inc: { totalExpenses: expense.amount },
    });

    res.json({ success: true, message: 'Expense updated', expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private (Admin)
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    if (expense.groupId.toString() !== req.user.groupId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const adminId      = expense.paidBy.toString();
    const splitAmount  = parseFloat((expense.amount / expense.dividedAmong.length).toFixed(2));
    const adminIncluded = expense.dividedAmong.map(id => id.toString()).includes(adminId);
    const nonAdmin     = expense.dividedAmong.filter(id => id.toString() !== adminId);

    // Reverse each non-admin member's balance
    for (const memberId of nonAdmin) {
      await User.findByIdAndUpdate(memberId, { $inc: { balance: splitAmount } });
    }

    // ✅ Use consistent formula: splitAmount × nonAdminCount
    const adminReceivable = parseFloat((splitAmount * nonAdmin.length).toFixed(2));
    const adminReversal   = { $inc: { balance: -adminReceivable } };
    if (adminIncluded) {
      adminReversal.$inc.adminShareOwed = -splitAmount;
    }
    await User.findByIdAndUpdate(expense.paidBy, adminReversal);

    await Group.findByIdAndUpdate(req.user.groupId, {
      $inc: { totalExpenses: -expense.amount },
    });

    await expense.deleteOne();

    res.json({ success: true, message: 'Expense deleted and balances reversed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get expense stats for dashboard
// @route   GET /api/expenses/stats
// @access  Private
const getStats = async (req, res) => {
  try {
    const groupId = req.user.groupId;

    const now           = new Date();
    const startOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyExpenses = await Expense.aggregate([
      { $match: { groupId, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 6);

    const weeklyData = await Expense.aggregate([
      { $match: { groupId, date: { $gte: last7Days } } },
      {
        $group: {
          _id  : { $dayOfWeek: '$date' },
          total: { $sum: '$amount' },
          day  : { $first: '$date' },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    const categoryData = await Expense.aggregate([
      { $match: { groupId, date: { $gte: startOfMonth } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);

    const members = await User.find({ groupId })
      .select('name balance role adminShareOwed adminSharePaid');

    // totalReceivable = sum of negative member balances (what members still owe admin)
    const totalReceivable = members
      .filter(m => m.role !== 'admin' && m.balance < 0)
      .reduce((sum, m) => sum + Math.abs(m.balance), 0);

    // Admin's own share stats
    const adminMember = members.find(m => m.role === 'admin');
    const adminShareStats = adminMember ? {
      totalOwed : adminMember.adminShareOwed  || 0,
      totalPaid : adminMember.adminSharePaid  || 0,
      remaining : Math.max(0, (adminMember.adminShareOwed || 0) - (adminMember.adminSharePaid || 0)),
    } : null;

    res.json({
      success: true,
      stats  : {
        monthlyTotal : monthlyExpenses[0]?.total || 0,
        totalMembers : members.length,
        totalReceivable,
        adminShareStats,
        weeklyData,
        categoryData,
        memberBalances: members,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getExpenses, addExpense, updateExpense, deleteExpense, getStats };