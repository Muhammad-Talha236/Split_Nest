// controllers/authController.js - Authentication logic
const jwt                = require('jsonwebtoken');
const User               = require('../models/User');
const Group              = require('../models/Group');
const InviteToken        = require('../models/InviteToken');
const PasswordResetToken = require('../models/PasswordResetToken');
const sendEmail          = require('../utils/sendEmail');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @desc    Register admin & create group
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, groupName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, role: 'admin' });

    const group = await Group.create({
      name   : groupName || `${name}'s Hostel`,
      admin  : user._id,
      members: [user._id],
    });

    user.groupId = group._id;
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        _id    : user._id,
        name   : user.name,
        email  : user.email,
        role   : user.role,
        balance: user.balance,
        groupId: user.groupId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
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
      user: {
        _id    : user._id,
        name   : user.name,
        email  : user.email,
        role   : user.role,
        balance: user.balance,
        groupId: user.groupId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('groupId', 'name');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// INVITE LINK SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Admin generates a new invite link
// @route   POST /api/auth/invite
// @access  Private (Admin)
const generateInvite = async (req, res) => {
  try {
    await InviteToken.deleteMany({ groupId: req.user.groupId, used: false });

    const invite = await InviteToken.create({
      groupId  : req.user.groupId,
      createdBy: req.user._id,
    });

    const clientUrl = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:3000';
    const link      = `${clientUrl}/join/${invite.token}`;

    res.status(201).json({
      success  : true,
      message  : 'Invite link generated (valid for 7 days)',
      token    : invite.token,
      link,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Validate invite token
// @route   GET /api/auth/join/:token
// @access  Public
const validateInvite = async (req, res) => {
  try {
    const invite = await InviteToken.findOne({ token: req.params.token })
      .populate('groupId', 'name')
      .populate('createdBy', 'name');

    if (!invite || !invite.isValid()) {
      return res.status(400).json({
        success: false,
        message: invite?.used
          ? 'This invite link has already been used.'
          : 'This invite link is invalid or has expired.',
      });
    }

    res.json({
      success  : true,
      groupName: invite.groupId?.name,
      invitedBy: invite.createdBy?.name,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Member self-registers via invite link
// @route   POST /api/auth/join/:token
// @access  Public
const joinViaInvite = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const invite = await InviteToken.findOne({ token: req.params.token }).populate('groupId');

    if (!invite || !invite.isValid()) {
      return res.status(400).json({
        success: false,
        message: invite?.used
          ? 'This invite link has already been used.'
          : 'This invite link is invalid or has expired.',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered. Please login instead.' });
    }

    const member = await User.create({
      name,
      email,
      password,
      role   : 'member',
      groupId: invite.groupId._id,
    });

    await Group.findByIdAndUpdate(invite.groupId._id, {
      $addToSet: { members: member._id },
    });

    invite.used   = true;
    invite.usedBy = member._id;
    await invite.save();

    const token = generateToken(member._id);

    res.status(201).json({
      success: true,
      message: `Welcome to ${invite.groupId.name}! Account created.`,
      token,
      user: {
        _id    : member._id,
        name   : member.name,
        email  : member.email,
        role   : member.role,
        balance: member.balance,
        groupId: member.groupId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD RESET (Email-based — fully implemented)
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Request password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always respond success even if user not found (security: don't reveal email existence)
    if (!user) {
      return res.json({
        success: true,
        message: 'If this email is registered, you will receive a reset link shortly.',
      });
    }

    // Delete any existing unused reset tokens for this user
    await PasswordResetToken.deleteMany({ userId: user._id, used: false });

    // Create new reset token
    const resetToken = await PasswordResetToken.create({ userId: user._id });

    const clientUrl = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:3000';
    const resetLink = `${clientUrl}/reset-password/${resetToken.token}`;

    // Build HTML email
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#0A0C10;font-family:'Segoe UI',Arial,sans-serif;">
        <div style="max-width:520px;margin:40px auto;background:#111318;border:1px solid #1E2229;border-radius:16px;overflow:hidden;">
          
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#2ECC9A,#1A7A5C);padding:32px 40px;text-align:center;">
            <div style="width:56px;height:56px;background:rgba(0,0,0,0.25);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#fff;margin-bottom:12px;">K</div>
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">KhataNest</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Hostel Expense Manager</p>
          </div>

          <!-- Body -->
          <div style="padding:36px 40px;">
            <h2 style="margin:0 0 8px;color:#E8EAF0;font-size:20px;font-weight:700;">Reset Your Password</h2>
            <p style="margin:0 0 6px;color:#6B7280;font-size:14px;line-height:1.6;">Hi <strong style="color:#E8EAF0;">${user.name}</strong>,</p>
            <p style="margin:0 0 28px;color:#6B7280;font-size:14px;line-height:1.6;">
              We received a request to reset your KhataNest password. Click the button below to choose a new password.
            </p>

            <!-- CTA Button -->
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#2ECC9A,#1A7A5C);color:#000;font-size:15px;font-weight:800;padding:14px 36px;border-radius:12px;text-decoration:none;letter-spacing:0.2px;">
                Reset My Password →
              </a>
            </div>

            <!-- Expiry notice -->
            <div style="background:#16191F;border:1px solid #1E2229;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
              <p style="margin:0;color:#9CA3AF;font-size:13px;line-height:1.6;">
                ⏰ <strong style="color:#FFB547;">This link expires in 1 hour.</strong> If you don't reset within that time, you'll need to request a new link.
              </p>
            </div>

            <!-- Fallback link -->
            <p style="margin:0 0 6px;color:#6B7280;font-size:12px;">If the button doesn't work, copy and paste this link:</p>
            <p style="margin:0 0 24px;word-break:break-all;">
              <a href="${resetLink}" style="color:#2ECC9A;font-size:12px;text-decoration:none;">${resetLink}</a>
            </p>

            <!-- Security notice -->
            <p style="margin:0;color:#4A5568;font-size:12px;line-height:1.6;border-top:1px solid #1E2229;padding-top:20px;">
              🔒 If you didn't request a password reset, you can safely ignore this email. Your password will not change.
            </p>
          </div>

          <!-- Footer -->
          <div style="padding:20px 40px;background:#0A0C10;text-align:center;border-top:1px solid #1E2229;">
            <p style="margin:0;color:#4A5568;font-size:12px;">KhataNest · Hostel Expense Manager</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to     : user.email,
      subject: '🔑 Reset Your KhataNest Password',
      html,
    });

    res.json({
      success: true,
      message: 'Password reset link sent to your email. Check your inbox (and spam folder).',
    });

  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send reset email. Please try again later.' });
  }
};

// @desc    Validate reset token (GET — check before showing form)
// @route   GET /api/auth/reset-password/:token
// @access  Public
const validateResetToken = async (req, res) => {
  try {
    const resetToken = await PasswordResetToken.findOne({ token: req.params.token })
      .populate('userId', 'name email');

    if (!resetToken || !resetToken.isValid()) {
      return res.status(400).json({
        success: false,
        message: resetToken?.used
          ? 'This reset link has already been used.'
          : 'This reset link is invalid or has expired.',
      });
    }

    res.json({
      success  : true,
      name     : resetToken.userId?.name,
      email    : resetToken.userId?.email,
      expiresAt: resetToken.expiresAt,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset password via token
// @route   POST /api/auth/reset-password/:token
// @access  Public
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
        message: resetToken?.used
          ? 'This reset link has already been used.'
          : 'This reset link is invalid or has expired.',
      });
    }

    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update password (pre-save hook in User model will hash it)
    user.password = password;
    await user.save();

    // Mark token as used
    resetToken.used = true;
    await resetToken.save();

    // Auto-login: generate new JWT
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password reset successfully! You are now logged in.',
      token,
      user: {
        _id    : user._id,
        name   : user.name,
        email  : user.email,
        role   : user.role,
        balance: user.balance,
        groupId: user.groupId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  generateInvite,
  validateInvite,
  joinViaInvite,
  forgotPassword,
  validateResetToken,
  resetPassword,
};