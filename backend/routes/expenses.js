// routes/expenses.js
const express  = require('express');
const router   = express.Router({ mergeParams: true }); // mergeParams for :groupId
const { body } = require('express-validator');
const { getExpenses, addExpense, updateExpense, deleteExpense, getStats } = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');
const { isGroupMember, isGroupAdmin } = require('../middleware/groupAuth');
const validate = require('../middleware/validate');

router.use(protect, isGroupMember);

router.get('/stats', getStats);
router.get('/',      getExpenses);
router.post('/',     isGroupAdmin,
  [
    body('title').trim().notEmpty().withMessage('Title required'),
    body('amount').isFloat({ min: 1 }).withMessage('Valid amount required'),
    body('dividedAmong').isArray({ min: 1 }).withMessage('Select at least one member'),
    body('splitMode').optional().isIn(['equal', 'percentage']).withMessage('Invalid split mode'),
    body('splitDetails').optional().isArray().withMessage('Split details must be an array'),
  ],
  validate, addExpense,
);
router.put   ('/:id', isGroupAdmin, updateExpense);
router.delete('/:id', isGroupAdmin, deleteExpense);

module.exports = router;
