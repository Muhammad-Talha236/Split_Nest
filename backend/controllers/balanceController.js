// controllers/balanceController.js
const User    = require('../models/User');
const Expense = require('../models/Expense');
const Payment = require('../models/Payment');

const getBalances = async (req, res) => {
  try {
    const members = await User.find({ groupId: req.user.groupId })
      .select('name email role balance adminShareOwed adminSharePaid');

    const adminMember  = members.find(m => m.role === 'admin');
    const adminBalance = adminMember ? adminMember.balance : 0;

    // Total still owed to admin by members (negative member balances)
    const totalReceivable = members
      .filter(m => m.role !== 'admin' && m.balance < 0)
      .reduce((sum, m) => sum + Math.abs(m.balance), 0);

    // Admin's own share summary
    const adminShareStats = adminMember ? {
      totalOwed : adminMember.adminShareOwed  || 0,
      totalPaid : adminMember.adminSharePaid  || 0,
      remaining : Math.max(0, (adminMember.adminShareOwed || 0) - (adminMember.adminSharePaid || 0)),
    } : null;

    // Settlement suggestions — each member who still owes admin
    const settlements = members
      .filter(m => m.role !== 'admin' && m.balance < 0)
      .map(m => ({
        from  : m.name,
        fromId: m._id,
        to    : adminMember?.name || 'Admin',
        toId  : adminMember?._id,
        amount: parseFloat(Math.abs(m.balance).toFixed(2)),
      }));

    // ✅ PRIVACY: Members only receive their OWN balance data.
    // They do NOT see other members' names, balances, or any admin financial info.
    if (req.user.role !== 'admin') {
      const myData = members.find(m => m._id.toString() === req.user._id.toString());
      return res.json({
        success : true,
        members : myData ? [myData] : [],
        summary : { totalReceivable: 0, adminBalance: 0, adminShareStats: null },
        settlements: [],
      });
    }

    // Admin gets full data
    res.json({
      success : true,
      members,
      summary : { totalReceivable, adminBalance, adminShareStats },
      settlements,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 15, type } = req.query;
    const groupId = req.user.groupId;

    const expenseQuery = req.user.role === 'member'
      ? { groupId, dividedAmong: req.user._id }
      : { groupId };

    const paymentQuery = req.user.role === 'member'
      ? { groupId, member: req.user._id }
      : { groupId };

    // Apply type filter for payments
    if (type === 'member') {
      paymentQuery.isAdminSelfPayment = { $ne: true };
    } else if (type === 'self') {
      paymentQuery.isAdminSelfPayment = true;
    }

    const expenses = await Expense.find(expenseQuery)
      .populate('paidBy',       'name')
      .populate('dividedAmong', 'name')
      .select('title description descriptionCleared amount splitAmount date category dividedAmong paidBy');

    const payments = await Payment.find(paymentQuery)
      .populate('member',     'name role')
      .populate('receivedBy', 'name');

    const combined = [
      ...expenses.map(e => ({
        type        : 'expense',
        _id         : e._id,
        title       : e.title,
        description : e.descriptionCleared
          ? '(Description cleared after 21 days)'
          : e.description,
        amount      : e.amount,
        splitAmount : e.splitAmount,
        date        : e.date,
        category    : e.category,
        paidBy      : e.paidBy,
        dividedAmong: e.dividedAmong,
      })),
      ...payments.map(p => {
        // ✅ FIXED: Only use isAdminSelfPayment flag — NOT member.role
        //    Previously, checking role caused ALL admin-recorded payments to look
        //    like self-payments even when recording a regular member's payment.
        const isAdminSelf = p.isAdminSelfPayment === true;
        const title = isAdminSelf
          ? `${p.member?.name} paid own share`
          : `Payment from ${p.member?.name}`;

        return {
          type              : 'payment',
          _id               : p._id,
          title,
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

    const total = combined.length;

    // Apply expense-type filter if needed
    let filtered = combined;
    if (type === 'expense') {
      filtered = combined.filter(t => t.type === 'expense');
    } else if (type === 'payment' || type === 'member') {
      filtered = combined.filter(t => t.type === 'payment' && !t.isAdminSelfPayment);
    } else if (type === 'self') {
      filtered = combined.filter(t => t.type === 'payment' && t.isAdminSelfPayment);
    }

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