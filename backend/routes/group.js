// routes/groups.js
const express  = require('express');
const router   = express.Router();
const { body } = require('express-validator');
const {
  getAllGroups, getMyGroups, getGroup,
  createGroup, updateGroup, deleteGroup,
  sendJoinRequest, getJoinRequests, handleJoinRequest,
  getMyRequests, leaveGroup, transferAdmin,
  removeMember, monthlyReset,
} = require('../controllers/groupController');
const { protect } = require('../middleware/auth');
const validate    = require('../middleware/validate');

router.use(protect);

// Discovery & my groups
router.get('/',            getAllGroups);
router.get('/my',          getMyGroups);
router.get('/requests/my', getMyRequests);

// Create group
router.post('/',
  [body('name').trim().notEmpty().withMessage('Group name is required')],
  validate, createGroup,
);

// Single group
router.get   ('/:id', getGroup);
router.put   ('/:id', updateGroup);
router.delete('/:id', deleteGroup);

// Join requests
router.post('/:id/request',              sendJoinRequest);
router.get ('/:id/requests',             getJoinRequests);
router.put ('/:id/requests/:reqId',      handleJoinRequest);

// Group actions
router.post  ('/:id/leave',              leaveGroup);
router.put   ('/:id/transfer-admin',     transferAdmin);
router.delete('/:id/members/:memberId',  removeMember);
router.post  ('/:id/reset',              monthlyReset);

module.exports = router;
