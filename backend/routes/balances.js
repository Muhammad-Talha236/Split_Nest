// routes/balances.js
const express = require('express');
const router  = express.Router({ mergeParams: true });
const { getBalances, getHistory } = require('../controllers/balanceController');
const { protect }        = require('../middleware/auth');
const { isGroupMember }  = require('../middleware/groupAuth');

router.use(protect, isGroupMember);

router.get('/',        getBalances);
router.get('/history', getHistory);

module.exports = router;