// routes/auth.js
const express  = require('express');
const router   = express.Router();
const { body } = require('express-validator');
const {
  register, login, getMe, switchGroup,
  forgotPassword, validateResetToken, resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate    = require('../middleware/validate');

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

router.get('/me',           protect, getMe);
router.put('/switch-group', protect, switchGroup);

router.post('/forgot-password',
  [body('email').isEmail().withMessage('Valid email required')],
  validate, forgotPassword,
);
router.get('/reset-password/:token',  validateResetToken);
router.post('/reset-password/:token',
  [body('password').isLength({ min: 6 }).withMessage('Password min 6 chars')],
  validate, resetPassword,
);

module.exports = router;