// routes/auth.js
const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  generateInvite,
  validateInvite,
  joinViaInvite,
  forgotPassword,
  validateResetToken,
  resetPassword,
} = require('../controllers/authController');
const { protect, adminOnly, requireGroup } = require('../middleware/auth');
const validate = require('../middleware/validate');

// ── Standard auth ──────────────────────────────────────────────────────────
router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  ],
  validate, register,
);

router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate, login,
);

router.get('/me', protect, getMe);

// ── Invite link ────────────────────────────────────────────────────────────
router.post('/invite', protect, requireGroup, adminOnly, generateInvite);
router.get('/join/:token', validateInvite);
router.post('/join/:token',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  ],
  validate, joinViaInvite,
);

// ── Password reset ─────────────────────────────────────────────────────────
router.post('/forgot-password',
  [body('email').isEmail().withMessage('Valid email required')],
  validate,
  forgotPassword,
);

// GET: validate token before showing reset form
router.get('/reset-password/:token', validateResetToken);

// POST: actually reset the password
router.post('/reset-password/:token',
  [body('password').isLength({ min: 6 }).withMessage('Password min 6 chars')],
  validate,
  resetPassword,
);

module.exports = router;