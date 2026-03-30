// controllers/balanceController.js
const User    = require('../models/User');
const Expense = require('../models/Expense');
const Payment = require('../models/Payment');

// @route GET /api/groups/:groupId/balances
const getBalances = async (req, res) => {
  try {
    const groupId = req.params.groupId;

    // Get all members of this group with their membership data
    const allUsers = await User.find({ 'groups.groupId': groupId }).select('name email groups');

    const members = allUsers.map(u => {
      const membership = u.getMembership(groupId);
      return {
        _id           : u._id,
        name          : u.name,
        email         : u.email,
        role          : membership?.role           || 'member',
        balance       : membership?.balance        || 0,
        adminShareOwed: membership?.adminShareOwed || 0,
        adminSharePaid: membership?.adminSharePaid || 0,
      };
    });

    const adminMember  = members.find(m => m.role === 'admin');
    const adminBalance = adminMember?.balance || 0;

    const totalReceivable = members
      .filter(m => m.role !== 'admin' && m.balance < 0)
      .reduce((sum, m) => sum + Math.abs(m.balance), 0);

    const adminShareStats = adminMember ? {
      totalOwed: adminMember.adminShareOwed || 0,
      totalPaid: adminMember.adminSharePaid || 0,
      remaining: Math.max(0, (adminMember.adminShareOwed || 0) - (adminMember.adminSharePaid || 0)),
    } : null;

    const settlements = members
      .filter(m => m.role !== 'admin' && m.balance < 0)
      .map(m => ({
        from  : m.name,
        fromId: m._id,
        to    : adminMember?.name || 'Admin',
        toId  : adminMember?._id,
        amount: parseFloat(Math.abs(m.balance).toFixed(2)),
      }));

    // Privacy: members only see their own data
    if (req.groupRole !== 'admin') {
      const myData = members.find(m => m._id.toString() === req.user._id.toString());
      return res.json({
        success    : true,
        members    : myData ? [myData] : [],
        summary    : { totalReceivable: 0, adminBalance: 0, adminShareStats: null },
        settlements: [],
      });
    }

    res.json({
      success    : true,
      members,
      summary    : { totalReceivable, adminBalance, adminShareStats },
      settlements,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/groups/:groupId/balances/history
const getHistory = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { page = 1, limit = 15, type } = req.query;

    const isAdmin = req.groupRole === 'admin';

    const expenseQuery = isAdmin
      ? { groupId }
      : { groupId, dividedAmong: req.user._id };

    const paymentQuery = isAdmin
      ? { groupId }
      : { groupId, member: req.user._id };

    if (type === 'member') paymentQuery.isAdminSelfPayment = { $ne: true };
    if (type === 'self')   paymentQuery.isAdminSelfPayment = true;

    const expenses = await Expense.find(expenseQuery)
      .populate('paidBy',       'name')
      .populate('dividedAmong', 'name')
      .populate('splitDetails.member', 'name')
      .select('title description descriptionCleared amount splitAmount splitMode splitDetails date category dividedAmong paidBy');

    const payments = await Payment.find(paymentQuery)
      .populate('member',     'name')
      .populate('receivedBy', 'name');

    const combined = [
      ...expenses.map(e => ({
        type        : 'expense',
        _id         : e._id,
        title       : e.title,
        description : e.descriptionCleared ? '(Description cleared after 21 days)' : e.description,
        amount      : e.amount,
        splitAmount : e.splitAmount,
        splitMode   : e.splitMode || 'equal',
        splitDetails: e.splitDetails,
        date        : e.date,
        category    : e.category,
        paidBy      : e.paidBy,
        dividedAmong: e.dividedAmong,
      })),
      ...payments.map(p => {
        const isAdminSelf = p.isAdminSelfPayment === true;
        return {
          type              : 'payment',
          _id               : p._id,
          title             : isAdminSelf ? `${p.member?.name} paid own share` : `Payment from ${p.member?.name}`,
          description       : p.note,
          amount            : p.amount,
          date              : p.date,
          member            : p.member,
          receivedBy        : p.receivedBy,
          paymentMethod     : p.paymentMethod,
          isAdminSelfPayment: isAdminSelf,
        };
      }),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    let filtered = combined;
    if (type === 'expense') filtered = combined.filter(t => t.type === 'expense');
    if (type === 'payment' || type === 'member') filtered = combined.filter(t => t.type === 'payment' && !t.isAdminSelfPayment);
    if (type === 'self')    filtered = combined.filter(t => t.type === 'payment' && t.isAdminSelfPayment);

    const filteredTotal = filtered.length;
    const paginated     = filtered.slice((page - 1) * limit, page * limit);

    res.json({
      success   : true,
      history   : paginated,
      pagination: {
        total: filteredTotal,
        page : parseInt(page),
        pages: Math.ceil(filteredTotal / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getBalances, getHistory }; 
