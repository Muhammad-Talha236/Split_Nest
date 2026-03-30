// routes/payments.js
const express  = require('express');
const router   = express.Router({ mergeParams: true });
const { body } = require('express-validator');
const { recordPayment, getPayments, deletePayment } = require('../controllers/paymentController');
const { protect }                  = require('../middleware/auth');
const { isGroupMember, isGroupAdmin } = require('../middleware/groupAuth');
const validate = require('../middleware/validate');

router.use(protect, isGroupMember);

router.get('/',    getPayments);
router.post('/',   isGroupAdmin,
  [
    body('memberId').notEmpty().withMessage('Member required'),
    body('amount').isFloat({ min: 1 }).withMessage('Valid amount required'),
  ],
  validate, recordPayment,
);
router.delete('/:id', isGroupAdmin, deletePayment);

module.exports = router;