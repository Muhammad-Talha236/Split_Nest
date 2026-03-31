// controllers/authController.js
const jwt                = require('jsonwebtoken');
const User               = require('../models/User');
const Group              = require('../models/Group');
const PasswordResetToken = require('../models/PasswordResetToken');
const sendEmail          = require('../utils/sendEmail');
const normalizeId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (typeof value.toHexString === 'function') return value.toHexString();

    const nestedValue = value._id ?? value.id ?? value.groupId ?? null;
    if (nestedValue && nestedValue !== value) {
      return normalizeId(nestedValue);
    }

    if (typeof value.toString === 'function') {
      const stringValue = value.toString();
      if (stringValue && stringValue !== '[object Object]') return stringValue;
    }

    return null;
  }
  return value.toString();
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Format user response Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const formatUser = (user, activeGroupId = null) => {
  const activeGid  = normalizeId(activeGroupId || user.activeGroupId);
  const membership = activeGid
    ? user.groups.find((group) => normalizeId(group.groupId) === activeGid)
    : null;

  return {
    _id           : user._id,
    name          : user.name,
    email         : user.email,
    groups        : user.groups,
    activeGroupId : activeGid,
    role          : membership?.role           || null,
    balance       : membership?.balance        || 0,
    adminShareOwed: membership?.adminShareOwed || 0,
    adminSharePaid: membership?.adminSharePaid || 0,
  };
};

// @desc    Register user only Ã¢â‚¬â€ no automatic group creation
//          User creates or joins a group from the Groups page after registration
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create user with no group attached
    const user = await User.create({ name, email, password });

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Account created! Now create or join a group to get started.',
      token,
      user   : formatUser(user, null),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated' });
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user   : formatUser(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('groups.groupId', 'name hostelName city university isPublic')
      .populate('activeGroupId', 'name hostelName');

    res.json({ success: true, user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Switch active group
// @route   PUT /api/auth/switch-group
const switchGroup = async (req, res) => {
  try {
    const groupId = normalizeId(req.body.groupId);

    if (!groupId) {
      return res.status(400).json({ success: false, message: 'Group ID is required' });
    }

    const membership = req.user.groups.find(
      (group) => normalizeId(group.groupId) === groupId
    );

    if (!membership) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    await User.findByIdAndUpdate(req.user._id, { activeGroupId: groupId });
    res.json({ success: true, message: 'Active group switched', activeGroupId: groupId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ PASSWORD RESET Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.json({ success: true, message: 'If this email is registered, you will receive a reset link shortly.' });
    }

    await PasswordResetToken.deleteMany({ userId: user._id, used: false });
    const resetToken = await PasswordResetToken.create({ userId: user._id });

    const clientUrl = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:3000';
    const resetLink = `${clientUrl}/reset-password/${resetToken.token}`;

    const html = `
      <div style="max-width:520px;margin:40px auto;background:#111318;border:1px solid #1E2229;border-radius:16px;overflow:hidden;font-family:Arial,sans-serif;">
        <div style="background:linear-gradient(135deg,#2ECC9A,#1A7A5C);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">SplitNest</h1>
        </div>
        <div style="padding:36px 40px;">
          <h2 style="color:#E8EAF0;">Reset Your Password</h2>
          <p style="color:#6B7280;line-height:1.6;">Hi <strong style="color:#E8EAF0;">${user.name}</strong>, click below to reset your password.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetLink}" style="background:linear-gradient(135deg,#2ECC9A,#1A7A5C);color:#000;font-size:15px;font-weight:800;padding:14px 36px;border-radius:12px;text-decoration:none;">Reset My Password →</a>
          </div>
          <p style="color:#4A5568;font-size:12px;">Link expires in 1 hour.</p>
        </div>
      </div>
    `;

    await sendEmail({ to: user.email, subject: 'Reset Your SplitNest Password', html });
    res.json({ success: true, message: 'Password reset link sent to your email.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send reset email.' });
  }
};

const validateResetToken = async (req, res) => {
  try {
    const resetToken = await PasswordResetToken.findOne({ token: req.params.token })
      .populate('userId', 'name email');

    if (!resetToken || !resetToken.isValid()) {
      return res.status(400).json({
        success: false,
        message: resetToken?.used ? 'Link already used.' : 'Link invalid or expired.',
      });
    }
    res.json({ success: true, name: resetToken.userId?.name, email: resetToken.userId?.email });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const resetToken = await PasswordResetToken.findOne({ token: req.params.token });
    if (!resetToken || !resetToken.isValid()) {
      return res.status(400).json({
        success: false,
        message: resetToken?.used ? 'Link already used.' : 'Link invalid or expired.',
      });
    }

    const user = await User.findById(resetToken.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password   = password;
    await user.save();
    resetToken.used = true;
    await resetToken.save();

    const token = generateToken(user._id);
    res.json({ success: true, message: 'Password reset successfully!', token, user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  switchGroup,
  forgotPassword,
  validateResetToken,
  resetPassword,
};
