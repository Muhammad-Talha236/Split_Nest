const Expense = require('../models/Expense');
const User = require('../models/User');
const Group = require('../models/Group');

const roundCurrency = (value) => parseFloat(Number(value || 0).toFixed(2));
const toCents = (value) => Math.round(Number(value || 0) * 100);
const fromCents = (value) => roundCurrency(value / 100);
const toIdString = (value) => (value && typeof value.toString === 'function' ? value.toString() : String(value));

// Helper: update balance in user's groups array for a specific group
const updateGroupBalance = async (userId, groupId, increment) => {
  await User.updateOne(
    { _id: userId, 'groups.groupId': groupId },
    { $inc: { 'groups.$.balance': increment } }
  );
};

const updateAdminShare = async (userId, groupId, owedIncrement, paidIncrement = 0) => {
  const update = {};
  if (owedIncrement !== 0) update['groups.$.adminShareOwed'] = owedIncrement;
  if (paidIncrement !== 0) update['groups.$.adminSharePaid'] = paidIncrement;

  if (Object.keys(update).length > 0) {
    await User.updateOne(
      { _id: userId, 'groups.groupId': groupId },
      { $inc: update }
    );
  }
};

const allocateByWeights = (totalCents, weightedItems) => {
  const totalWeight = weightedItems.reduce((sum, item) => sum + item.weight, 0);
  if (!weightedItems.length || totalWeight <= 0) {
    throw new Error('Invalid split weights');
  }

  const baseAllocations = weightedItems.map((item, index) => {
    const rawCents = (totalCents * item.weight) / totalWeight;
    const cents = Math.floor(rawCents);
    return {
      ...item,
      cents,
      remainder: rawCents - cents,
      index,
    };
  });

  let remaining = totalCents - baseAllocations.reduce((sum, item) => sum + item.cents, 0);

  baseAllocations
    .slice()
    .sort((first, second) => {
      if (second.remainder !== first.remainder) return second.remainder - first.remainder;
      return first.index - second.index;
    })
    .forEach((item) => {
      if (remaining <= 0) return;
      baseAllocations[item.index].cents += 1;
      remaining -= 1;
    });

  return baseAllocations.map(({ cents, ...item }) => ({
    ...item,
    amount: fromCents(cents),
    cents,
  }));
};

const buildEqualSplit = (amount, memberIds) => {
  const totalCents = toCents(amount);
  const allocations = allocateByWeights(
    totalCents,
    memberIds.map((memberId) => ({ member: memberId, weight: 1 }))
  );

  return {
    splitMode: 'equal',
    splitAmount: roundCurrency(amount / memberIds.length),
    splitDetails: allocations.map((allocation) => ({
      member: allocation.member,
      amount: allocation.amount,
      percentage: roundCurrency((allocation.cents / totalCents) * 100),
    })),
  };
};

const buildPercentageSplit = (amount, memberIds, splitDetailsInput) => {
  const percentages = memberIds.map((memberId) => {
    const match = (splitDetailsInput || []).find((detail) => toIdString(detail.member) === memberId);
    if (!match) {
      throw new Error('Each selected member needs a percentage');
    }

    const percentage = Number(match.percentage);
    if (!Number.isFinite(percentage) || percentage <= 0) {
      throw new Error('Each selected member needs a percentage greater than 0');
    }

    return { member: memberId, weight: percentage };
  });

  const percentageTotal = percentages.reduce((sum, item) => sum + item.weight, 0);
  if (Math.abs(percentageTotal - 100) > 0.05) {
    throw new Error('Percentages must add up to 100');
  }

  const allocations = allocateByWeights(toCents(amount), percentages);

  return {
    splitMode: 'percentage',
    splitAmount: null,
    splitDetails: allocations.map((allocation) => ({
      member: allocation.member,
      amount: allocation.amount,
      percentage: roundCurrency(allocation.weight),
    })),
  };
};

const buildSplitPayload = ({ amount, splitMode = 'equal', dividedAmong = [], splitDetails = [] }) => {
  const uniqueMemberIds = [...new Set((dividedAmong || []).map(toIdString).filter(Boolean))];
  if (uniqueMemberIds.length === 0) {
    throw new Error('Select at least one member');
  }

  if (splitMode === 'percentage') {
    const built = buildPercentageSplit(amount, uniqueMemberIds, splitDetails);
    return { ...built, dividedAmong: uniqueMemberIds };
  }

  const built = buildEqualSplit(amount, uniqueMemberIds);
  return { ...built, dividedAmong: uniqueMemberIds };
};

const normalizeStoredSplit = (expense) => {
  if (expense.splitDetails && expense.splitDetails.length > 0) {
    return expense.splitDetails.map((detail) => ({
      member: detail.member?._id || detail.member,
      amount: roundCurrency(detail.amount),
      percentage: detail.percentage ?? null,
    }));
  }

  const legacySplitAmount = expense.splitAmount || roundCurrency(expense.amount / expense.dividedAmong.length);
  return (expense.dividedAmong || []).map((memberId) => ({
    member: memberId,
    amount: legacySplitAmount,
    percentage: null,
  }));
};

const applyExpenseImpact = async ({ groupId, payerId, splitDetails, direction = 1 }) => {
  const payerIdString = toIdString(payerId);
  const nonPayerDetails = splitDetails.filter((detail) => toIdString(detail.member) !== payerIdString);
  const payerOwnShare = splitDetails.find((detail) => toIdString(detail.member) === payerIdString)?.amount || 0;

  for (const detail of nonPayerDetails) {
    await updateGroupBalance(detail.member, groupId, roundCurrency(-direction * detail.amount));
  }

  const payerReceivable = roundCurrency(nonPayerDetails.reduce((sum, detail) => sum + detail.amount, 0));
  await updateGroupBalance(payerId, groupId, roundCurrency(direction * payerReceivable));

  if (payerOwnShare > 0) {
    await updateAdminShare(payerId, groupId, roundCurrency(direction * payerOwnShare));
  }
};

const populateExpense = (expenseId) =>
  Expense.findById(expenseId)
    .populate('paidBy', 'name')
    .populate('dividedAmong', 'name')
    .populate('splitDetails.member', 'name');

const validateGroupMembers = async (groupId, memberIds) => {
  const group = await Group.findById(groupId);
  if (!group) {
    return { error: { status: 404, message: 'Group not found' } };
  }

  const members = await User.find({
    _id: { $in: memberIds },
    'groups.groupId': groupId,
  }).select('_id');

  if (members.length !== memberIds.length) {
    return { error: { status: 400, message: 'One or more selected members do not belong to this group' } };
  }

  return { group };
};

// @route GET /api/groups/:groupId/expenses
const getExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, startDate, endDate } = req.query;
    const groupId = req.params.groupId;

    const query = { groupId };
    if (search) query.title = { $regex: search, $options: 'i' };
    if (category && category !== 'all') query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .populate('paidBy', 'name')
      .populate('dividedAmong', 'name')
      .populate('splitDetails.member', 'name')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      success: true,
      expenses,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit), limit: parseInt(limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route POST /api/groups/:groupId/expenses
const addExpense = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { title, description, dividedAmong, date, category, splitMode = 'equal', splitDetails = [] } = req.body;
    const amount = parseFloat(req.body.amount);

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }
    if (!dividedAmong || dividedAmong.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one member' });
    }

    const builtSplit = buildSplitPayload({ amount, splitMode, dividedAmong, splitDetails });
    const validation = await validateGroupMembers(groupId, builtSplit.dividedAmong);
    if (validation.error) {
      return res.status(validation.error.status).json({ success: false, message: validation.error.message });
    }

    const expense = await Expense.create({
      title,
      description: description || '',
      amount,
      paidBy: req.user._id,
      dividedAmong: builtSplit.dividedAmong,
      groupId,
      date: date || Date.now(),
      category: category || 'other',
      splitMode: builtSplit.splitMode,
      splitAmount: builtSplit.splitAmount,
      splitDetails: builtSplit.splitDetails,
    });

    await applyExpenseImpact({
      groupId,
      payerId: req.user._id,
      splitDetails: builtSplit.splitDetails,
      direction: 1,
    });

    await Group.findByIdAndUpdate(groupId, { $inc: { totalExpenses: amount } });

    const populated = await populateExpense(expense._id);
    res.status(201).json({ success: true, message: 'Expense added and balances updated', expense: populated });
  } catch (error) {
    const status = error.message?.includes('Select at least one member') || error.message?.includes('Percentages') || error.message?.includes('Each selected member')
      ? 400
      : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @route PUT /api/groups/:groupId/expenses/:id
const updateExpense = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const expense = await Expense.findById(req.params.id);

    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    if (expense.groupId.toString() !== groupId) return res.status(403).json({ success: false, message: 'Not authorized' });

    const previousSplitDetails = normalizeStoredSplit(expense);

    await applyExpenseImpact({
      groupId,
      payerId: expense.paidBy,
      splitDetails: previousSplitDetails,
      direction: -1,
    });
    await Group.findByIdAndUpdate(groupId, { $inc: { totalExpenses: -expense.amount } });

    const newAmount = req.body.amount ? parseFloat(req.body.amount) : expense.amount;
    const nextDividedAmong = req.body.dividedAmong || expense.dividedAmong.map((memberId) => toIdString(memberId));
    const nextSplitMode = req.body.splitMode || expense.splitMode || 'equal';
    const nextSplitDetails = req.body.splitDetails || expense.splitDetails;

    const builtSplit = buildSplitPayload({
      amount: newAmount,
      splitMode: nextSplitMode,
      dividedAmong: nextDividedAmong,
      splitDetails: nextSplitDetails,
    });

    const validation = await validateGroupMembers(groupId, builtSplit.dividedAmong);
    if (validation.error) {
      return res.status(validation.error.status).json({ success: false, message: validation.error.message });
    }

    expense.title = req.body.title || expense.title;
    expense.description = req.body.description !== undefined ? req.body.description : expense.description;
    expense.amount = newAmount;
    expense.dividedAmong = builtSplit.dividedAmong;
    expense.date = req.body.date || expense.date;
    expense.category = req.body.category || expense.category;
    expense.splitMode = builtSplit.splitMode;
    expense.splitAmount = builtSplit.splitAmount;
    expense.splitDetails = builtSplit.splitDetails;
    await expense.save();

    await applyExpenseImpact({
      groupId,
      payerId: expense.paidBy,
      splitDetails: builtSplit.splitDetails,
      direction: 1,
    });
    await Group.findByIdAndUpdate(groupId, { $inc: { totalExpenses: expense.amount } });

    const populated = await populateExpense(expense._id);
    res.json({ success: true, message: 'Expense updated', expense: populated });
  } catch (error) {
    const status = error.message?.includes('Select at least one member') || error.message?.includes('Percentages') || error.message?.includes('Each selected member')
      ? 400
      : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @route DELETE /api/groups/:groupId/expenses/:id
const deleteExpense = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const expense = await Expense.findById(req.params.id);

    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    if (expense.groupId.toString() !== groupId) return res.status(403).json({ success: false, message: 'Not authorized' });

    const storedSplitDetails = normalizeStoredSplit(expense);

    await applyExpenseImpact({
      groupId,
      payerId: expense.paidBy,
      splitDetails: storedSplitDetails,
      direction: -1,
    });

    await Group.findByIdAndUpdate(groupId, { $inc: { totalExpenses: -expense.amount } });
    await expense.deleteOne();

    res.json({ success: true, message: 'Expense deleted and balances reversed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/groups/:groupId/expenses/stats
const getStats = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 6);

    const monthlyExpenses = await Expense.aggregate([
      { $match: { groupId: group._id, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const weeklyData = await Expense.aggregate([
      { $match: { groupId: group._id, date: { $gte: last7Days } } },
      { $group: { _id: { $dayOfWeek: '$date' }, total: { $sum: '$amount' }, day: { $first: '$date' } } },
      { $sort: { _id: 1 } },
    ]);

    const categoryData = await Expense.aggregate([
      { $match: { groupId: group._id, date: { $gte: startOfMonth } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);

    const members = await User.find({ 'groups.groupId': group._id }).select('name groups');

    const membersWithBalance = members.map((member) => {
      const membership = member.getMembership(group._id);
      return {
        _id: member._id,
        name: member.name,
        role: membership?.role || 'member',
        balance: membership?.balance || 0,
        adminShareOwed: membership?.adminShareOwed || 0,
        adminSharePaid: membership?.adminSharePaid || 0,
      };
    });

    const adminMember = membersWithBalance.find((member) => member.role === 'admin');
    const totalReceivable = membersWithBalance
      .filter((member) => member.role !== 'admin' && member.balance < 0)
      .reduce((sum, member) => sum + Math.abs(member.balance), 0);

    const adminShareStats = adminMember ? {
      totalOwed: adminMember.adminShareOwed || 0,
      totalPaid: adminMember.adminSharePaid || 0,
      remaining: Math.max(0, (adminMember.adminShareOwed || 0) - (adminMember.adminSharePaid || 0)),
    } : null;

    const isAdmin = req.user.getRoleInGroup
      ? req.user.getRoleInGroup(groupId) === 'admin'
      : false;

    if (!isAdmin) {
      const myData = membersWithBalance.find((member) => member._id.toString() === req.user._id.toString());
      return res.json({
        success: true,
        stats: { weeklyData, memberBalances: myData ? [myData] : [] },
      });
    }

    res.json({
      success: true,
      stats: {
        monthlyTotal: monthlyExpenses[0]?.total || 0,
        totalMembers: members.length,
        totalReceivable,
        adminShareStats,
        weeklyData,
        categoryData,
        memberBalances: membersWithBalance,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getExpenses, addExpense, updateExpense, deleteExpense, getStats };
