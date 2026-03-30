// middleware/groupAuth.js
// Checks that the logged-in user is a member/admin of the requested group
const mongoose = require('mongoose');

const isGroupMember = (req, res, next) => {
  const groupId = req.params.groupId || req.body.groupId;
  if (!groupId) {
    return res.status(400).json({ success: false, message: 'Group ID is required' });
  }

  if (!mongoose.isValidObjectId(groupId)) {
    return res.status(400).json({ success: false, message: 'Invalid group ID' });
  }

  const membership = req.user.groups?.find(
    g => g.groupId.toString() === groupId.toString()
  );

  if (!membership) {
    return res.status(403).json({ success: false, message: 'You are not a member of this group' });
  }

  // Attach membership info to request for use in controllers
  req.groupId    = groupId;
  req.membership = membership;
  req.groupRole  = membership.role;

  next();
};

const isGroupAdmin = (req, res, next) => {
  if (req.groupRole !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only group admin can perform this action' });
  }
  next();
};

module.exports = { isGroupMember, isGroupAdmin };
