// controllers/groupController.js
const Group       = require('../models/Group');
const User        = require('../models/User');
const JoinRequest = require('../models/JoinRequest');
const Expense     = require('../models/Expense');
const Payment     = require('../models/Payment');
const mongoose    = require('mongoose');

// ─── Get all public groups (discovery) ────────────────────────────────────
// @route GET /api/groups
const getAllGroups = async (req, res) => {
  try {
    const { search, city, university, hostelName } = req.query;

    const query = { isPublic: true, isActive: true };

    if (search) {
      query.$or = [
        { name       : { $regex: search, $options: 'i' } },
        { hostelName : { $regex: search, $options: 'i' } },
        { city       : { $regex: search, $options: 'i' } },
        { university : { $regex: search, $options: 'i' } },
      ];
    }
    if (city)        query.city        = { $regex: city,        $options: 'i' };
    if (university)  query.university  = { $regex: university,  $options: 'i' };
    if (hostelName)  query.hostelName  = { $regex: hostelName,  $options: 'i' };

    const groups = await Group.find(query)
      .populate('admin', 'name')
      .sort({ createdAt: -1 });

    // For each group, check current user's relationship
    const userId = req.user._id.toString();

    const groupsWithStatus = await Promise.all(groups.map(async (g) => {
      const isMember  = g.members.some(m => m.toString() === userId);
      let requestStatus = null;

      if (!isMember) {
        const req_ = await JoinRequest.findOne({ user: req.user._id, group: g._id });
        requestStatus = req_?.status || null;
      }

      return {
        _id          : g._id,
        name         : g.name,
        hostelName   : g.hostelName,
        city         : g.city,
        university   : g.university,
        description  : g.description,
        admin        : g.admin,
        memberCount  : g.members.length,
        isPublic     : g.isPublic,
        isMember,
        requestStatus, // null | 'pending' | 'accepted' | 'rejected'
        createdAt    : g.createdAt,
      };
    }));

    res.json({ success: true, groups: groupsWithStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get my groups ─────────────────────────────────────────────────────────
// @route GET /api/groups/my
const getMyGroups = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('groups.groupId', 'name hostelName city university admin memberCount members');

    const myGroups = user.groups.map(membership => ({
      groupId      : membership.groupId,
      role         : membership.role,
      balance      : membership.balance,
      adminShareOwed: membership.adminShareOwed,
      adminSharePaid: membership.adminSharePaid,
      joinedAt     : membership.joinedAt,
    }));

    res.json({ success: true, groups: myGroups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get single group details ──────────────────────────────────────────────
// @route GET /api/groups/:id
const getGroup = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID' });
    }

    const group = await Group.findById(req.params.id)
      .populate('admin', 'name email')
      .populate('members', 'name email');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const userId   = req.user._id.toString();
    const isMember = group.members.some(m => m._id.toString() === userId);
    const isAdmin  = group.admin._id.toString() === userId;

    // Privacy: members only see names + count, not emails or balances
    let membersData;
    if (isAdmin) {
      // Admin sees full data including per-group balances
      const membersWithBalance = await Promise.all(
        group.members.map(async (m) => {
          const memberUser   = await User.findById(m._id);
          const membership   = memberUser?.getMembership(group._id);
          return {
            _id    : m._id,
            name   : m.name,
            email  : m.email,
            role   : membership?.role           || 'member',
            balance: membership?.balance        || 0,
            adminShareOwed: membership?.adminShareOwed || 0,
            adminSharePaid: membership?.adminSharePaid || 0,
          };
        })
      );
      membersData = membersWithBalance;
    } else {
      // Member: only sees names, no balance/email
      membersData = group.members.map(m => ({
        _id : m._id,
        name: m.name,
      }));
    }

    res.json({
      success: true,
      group: {
        _id        : group._id,
        name       : group.name,
        hostelName : group.hostelName,
        city       : group.city,
        university : group.university,
        description: group.description,
        admin      : group.admin,
        members    : membersData,
        memberCount: group.members.length,
        isPublic   : group.isPublic,
        totalExpenses: group.totalExpenses,
        isMember,
        isAdmin,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Create group ──────────────────────────────────────────────────────────
// @route POST /api/groups
const createGroup = async (req, res) => {
  try {
    const { name, hostelName, city, university, description, isPublic } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    const group = await Group.create({
      name,
      hostelName : hostelName  || '',
      city       : city        || '',
      university : university  || '',
      description: description || '',
      isPublic   : isPublic !== undefined ? isPublic : true,
      admin      : req.user._id,
      members    : [req.user._id],
    });

    // Add group to user's groups array
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        groups: {
          groupId       : group._id,
          role          : 'admin',
          balance       : 0,
          adminShareOwed: 0,
          adminSharePaid: 0,
        },
      },
      // Set as active group if user has no active group
      $setOnInsert: { activeGroupId: group._id },
    });

    // If user has no active group, set this one
    const user = await User.findById(req.user._id);
    if (!user.activeGroupId) {
      await User.findByIdAndUpdate(req.user._id, { activeGroupId: group._id });
    }

    res.status(201).json({ success: true, message: 'Group created successfully', group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update group ──────────────────────────────────────────────────────────
// @route PUT /api/groups/:id
const updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only admin can update group' });
    }

    const { name, hostelName, city, university, description, isPublic } = req.body;
    if (name)        group.name        = name;
    if (hostelName !== undefined) group.hostelName  = hostelName;
    if (city       !== undefined) group.city        = city;
    if (university !== undefined) group.university  = university;
    if (description !== undefined) group.description = description;
    if (isPublic   !== undefined) group.isPublic    = isPublic;

    await group.save();
    res.json({ success: true, message: 'Group updated', group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Delete group ─────────────────────────────────────────────────────────
// @route DELETE /api/groups/:id
const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only admin can delete group' });
    }

    const membersWithPositiveBalance = await User.find({
      groups: { $elemMatch: { groupId: group._id, balance: { $gt: 0 } } },
    }).select('_id name');

    if (membersWithPositiveBalance.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete group while members have a positive balance. Clear all balances first.',
      });
    }

    const affectedUsers = await User.find({ 'groups.groupId': group._id })
      .select('_id groups activeGroupId');

    await Promise.all(affectedUsers.map(async (user) => {
      const remainingGroups = user.groups.filter(
        (membership) => membership.groupId.toString() !== group._id.toString()
      );

      const nextActiveGroupId = user.activeGroupId?.toString() === group._id.toString()
        ? (remainingGroups[0]?.groupId || null)
        : user.activeGroupId;

      await User.findByIdAndUpdate(user._id, {
        $pull: { groups: { groupId: group._id } },
        $set : { activeGroupId: nextActiveGroupId },
      });
    }));

    await Promise.all([
      Expense.deleteMany({ groupId: group._id }),
      Payment.deleteMany({ groupId: group._id }),
      JoinRequest.deleteMany({ group: group._id }),
      Group.findByIdAndDelete(group._id),
    ]);

    res.json({ success: true, message: `${group.name} deleted successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Send join request ─────────────────────────────────────────────────────
// @route POST /api/groups/:id/request
const sendJoinRequest = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.isActive) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check already a member
    if (group.members.some(m => m.toString() === req.user._id.toString())) {
      return res.status(400).json({ success: false, message: 'You are already a member of this group' });
    }

    // Check existing request
    const existing = await JoinRequest.findOne({ user: req.user._id, group: group._id });
    if (existing) {
      if (existing.status === 'pending') {
        return res.status(400).json({ success: false, message: 'You already have a pending request for this group' });
      }
      if (existing.status === 'accepted') {
        return res.status(400).json({ success: false, message: 'Your request was already accepted' });
      }
      // If rejected, allow re-request by deleting old one
      if (existing.status === 'rejected') {
        await existing.deleteOne();
      }
    }

    const joinRequest = await JoinRequest.create({
      user   : req.user._id,
      group  : group._id,
      message: req.body.message || '',
    });

    res.status(201).json({
      success    : true,
      message    : `Join request sent to ${group.name}. Waiting for admin approval.`,
      joinRequest,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get pending requests (admin) ─────────────────────────────────────────
// @route GET /api/groups/:id/requests
const getJoinRequests = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only admin can view requests' });
    }

    const { status = 'pending' } = req.query;

    const requests = await JoinRequest.find({ group: group._id, status })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Handle join request (accept/reject) ──────────────────────────────────
// @route PUT /api/groups/:id/requests/:reqId
const handleJoinRequest = async (req, res) => {
  try {
    const { action, rejectedReason } = req.body; // action: 'accept' | 'reject'

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only admin can handle requests' });
    }

    const joinRequest = await JoinRequest.findById(req.params.reqId).populate('user', 'name email');
    if (!joinRequest) return res.status(404).json({ success: false, message: 'Request not found' });

    if (joinRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already handled' });
    }

    if (action === 'accept') {
      // Add member to group
      await Group.findByIdAndUpdate(group._id, {
        $addToSet: { members: joinRequest.user._id },
      });

      // Add group to user's groups array
      await User.findByIdAndUpdate(joinRequest.user._id, {
        $push: {
          groups: {
            groupId: group._id,
            role   : 'member',
            balance: 0,
          },
        },
      });

      // Set as active group if user has no active group
      const memberUser = await User.findById(joinRequest.user._id);
      if (!memberUser.activeGroupId) {
        await User.findByIdAndUpdate(joinRequest.user._id, { activeGroupId: group._id });
      }

      joinRequest.status    = 'accepted';
      joinRequest.handledBy = req.user._id;
      joinRequest.handledAt = new Date();
      await joinRequest.save();

      res.json({
        success: true,
        message: `${joinRequest.user.name} has been added to ${group.name}`,
      });

    } else if (action === 'reject') {
      joinRequest.status         = 'rejected';
      joinRequest.rejectedReason = rejectedReason || '';
      joinRequest.handledBy      = req.user._id;
      joinRequest.handledAt      = new Date();
      await joinRequest.save();

      res.json({
        success: true,
        message: `Request from ${joinRequest.user.name} has been rejected`,
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid action. Use accept or reject' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get my join requests (member) ────────────────────────────────────────
// @route GET /api/groups/requests/my
const getMyRequests = async (req, res) => {
  try {
    const requests = await JoinRequest.find({ user: req.user._id })
      .populate('group', 'name hostelName city')
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Leave group ───────────────────────────────────────────────────────────
// @route POST /api/groups/:id/leave
const leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const userId     = req.user._id.toString();
    const isMember   = group.members.some(m => m.toString() === userId);
    if (!isMember) {
      return res.status(400).json({ success: false, message: 'You are not a member of this group' });
    }

    const user       = await User.findById(req.user._id);
    const membership = user.getMembership(group._id);

    if (membership && membership.balance !== 0) {
      const amount = Math.abs(membership.balance).toLocaleString();
      const message = membership.balance > 0
        ? `You cannot leave this group. You still have Rs. ${amount} to receive. Please settle before leaving.`
        : `You cannot leave this group. You still owe Rs. ${amount}. Please clear your dues first.`;
      return res.status(400).json({ success: false, message });
    }

    // Check if user is admin
    if (group.admin.toString() === userId) {
      // Admin cannot leave unless they transfer admin first
      if (group.members.length > 1) {
        return res.status(400).json({
          success: false,
          message: 'You are the admin. Transfer admin role to another member before leaving.',
        });
      }
      // If admin is last member, delete the group
      await Group.findByIdAndDelete(group._id);
      await User.findByIdAndUpdate(req.user._id, {
        $pull      : { groups: { groupId: group._id } },
        activeGroupId: null,
      });
      return res.json({ success: true, message: 'Group deleted as you were the last member.' });
    }

    // Balance already validated above
    // Remove from group members
    await Group.findByIdAndUpdate(group._id, {
      $pull: { members: req.user._id },
    });

    // Remove group from user's groups array
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { groups: { groupId: group._id } },
    });

    // If this was active group, switch to another
    if (user.activeGroupId?.toString() === group._id.toString()) {
      const updatedUser   = await User.findById(req.user._id);
      const nextGroup     = updatedUser.groups[0];
      await User.findByIdAndUpdate(req.user._id, {
        activeGroupId: nextGroup?.groupId || null,
      });
    }

    res.json({ success: true, message: `You have left ${group.name}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Transfer admin role ───────────────────────────────────────────────────
// @route PUT /api/groups/:id/transfer-admin
const transferAdmin = async (req, res) => {
  try {
    const { newAdminId } = req.body;

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only current admin can transfer role' });
    }

    const isMember = group.members.some(m => m.toString() === newAdminId);
    if (!isMember) {
      return res.status(400).json({ success: false, message: 'New admin must be a member of this group' });
    }

    // Update group admin
    group.admin = newAdminId;
    await group.save();

    // Update old admin role in their groups array
    await User.updateOne(
      { _id: req.user._id, 'groups.groupId': group._id },
      { $set: { 'groups.$.role': 'member' } }
    );

    // Update new admin role
    await User.updateOne(
      { _id: newAdminId, 'groups.groupId': group._id },
      { $set: { 'groups.$.role': 'admin' } }
    );

    res.json({ success: true, message: 'Admin role transferred successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Remove member (admin only) ────────────────────────────────────────────
// @route DELETE /api/groups/:id/members/:memberId
const removeMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only admin can remove members' });
    }

    const member = await User.findById(req.params.memberId);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    const membership = member.getMembership(group._id);
    if (membership && membership.balance !== 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot remove member with outstanding balance of Rs. ${membership.balance}`,
      });
    }

    // Remove from group
    await Group.findByIdAndUpdate(group._id, {
      $pull: { members: member._id },
    });

    // Remove group from member's groups array
    await User.findByIdAndUpdate(member._id, {
      $pull: { groups: { groupId: group._id } },
    });

    // If this was their active group, clear it
    if (member.activeGroupId?.toString() === group._id.toString()) {
      const updatedMember = await User.findById(member._id);
      const nextGroup     = updatedMember.groups[0];
      await User.findByIdAndUpdate(member._id, {
        activeGroupId: nextGroup?.groupId || null,
      });
    }

    res.json({ success: true, message: 'Member removed from group' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Monthly reset ─────────────────────────────────────────────────────────
// @route POST /api/groups/:id/reset
const monthlyReset = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only admin can reset balances' });
    }

    // Reset balance for all members in this group
    await User.updateMany(
      { 'groups.groupId': group._id },
      {
        $set: {
          'groups.$[elem].balance'       : 0,
          'groups.$[elem].adminShareOwed': 0,
          'groups.$[elem].adminSharePaid': 0,
        },
      },
      { arrayFilters: [{ 'elem.groupId': group._id }] }
    );

    await Group.findByIdAndUpdate(group._id, { totalExpenses: 0 });

    res.json({ success: true, message: 'Monthly reset completed. All balances cleared.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllGroups,
  getMyGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  sendJoinRequest,
  getJoinRequests,
  handleJoinRequest,
  getMyRequests,
  leaveGroup,
  transferAdmin,
  removeMember,
  monthlyReset,
};
