import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { groupAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal, { ConfirmModal } from '../components/Modal';
import FormField from '../components/FormField';
import Spinner from '../components/Spinner';
import { Avatar } from '../components/Layout';
import { AVATAR_COLORS, alpha } from '../theme';

const COLORS = AVATAR_COLORS;

const HeaderButton = ({ children, variant = 'secondary', ...props }) => (
  <button
    {...props}
    className={`members-btn members-btn--${variant}`}
    type={props.type || 'button'}
  >
    {children}
  </button>
);

const StatCard = ({ label, value, hint, tone = 'default' }) => (
  <div className={`members-stat members-stat--${tone}`}>
    <div className="members-stat__label">{label}</div>
    <div className="members-stat__value">{value}</div>
    {hint && <div className="members-stat__hint">{hint}</div>}
  </div>
);

const NoGroup = () => (
  <div className="members-empty">
    <div className="members-empty__glow" />
    <div className="members-empty__icon">TEAM</div>
    <h3 className="members-empty__title">No Active Group</h3>
    <p className="members-empty__text">Select or join a group to view members and manage roles.</p>
    <Link to="/groups" style={{ textDecoration: 'none' }}>
      <button className="members-btn members-btn--primary" type="button">
        Browse Groups -&gt;
      </button>
    </Link>
  </div>
);

const MembersPage = () => {
  const { user, activeGroupId, isAdmin, switchGroup } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [removeId, setRemoveId] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [newAdminId, setNewAdminId] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveAck, setLeaveAck] = useState(false);
  const [leaveType, setLeaveType] = useState('');
  const [leaveError, setLeaveError] = useState('');
  const [showDeleteGroup, setShowDeleteGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', hostelName: '', city: '', university: '', description: '' });
  const [saving, setSaving] = useState(false);

  const loadGroup = async () => {
    if (!activeGroupId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await groupAPI.getGroup(activeGroupId);
      setGroup(res.data.group);
      setEditForm({
        name: res.data.group.name || '',
        hostelName: res.data.group.hostelName || '',
        city: res.data.group.city || '',
        university: res.data.group.university || '',
        description: res.data.group.description || '',
      });
    } catch {
      toast.error('Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroup();
  }, [activeGroupId]);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await groupAPI.removeMember(activeGroupId, removeId);
      toast.success('Member removed');
      setRemoveId(null);
      loadGroup();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot remove member');
    } finally {
      setRemoving(false);
    }
  };

  const handleTransferAdmin = async () => {
    if (!newAdminId) return toast.error('Select a member to transfer admin to');

    setTransferring(true);
    try {
      await groupAPI.transferAdmin(activeGroupId, newAdminId);
      toast.success('Admin role transferred');
      setShowTransfer(false);
      setNewAdminId('');
      loadGroup();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await groupAPI.leaveGroup(activeGroupId);
      toast.success('You have left the group');
      setShowLeave(false);
      setLeaveAck(false);
      setLeaveType('');
      setLeaveError('');
      await switchGroup(null);
      navigate('/groups');
    } catch (err) {
      setLeaveError(err.response?.data?.message || 'Cannot leave group');
    } finally {
      setLeaving(false);
    }
  };

  const handleUpdateGroup = async () => {
    setSaving(true);
    try {
      await groupAPI.updateGroup(activeGroupId, editForm);
      toast.success('Group updated');
      setShowEditGroup(false);
      loadGroup();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    setDeletingGroup(true);
    try {
      await groupAPI.deleteGroup(activeGroupId);
      toast.success('Group deleted');
      setShowDeleteGroup(false);
      await switchGroup(null);
      navigate('/groups');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete group');
    } finally {
      setDeletingGroup(false);
    }
  };

  const getBalanceLabel = (member) => {
    if (member.role === 'admin') {
      if (member.balance > 0) return 'Members owe you';
      if (member.balance < 0) return 'You overspent';
      return 'All settled';
    }

    if (member.balance < 0) return 'Owes admin';
    if (member.balance > 0) return 'Admin owes member';
    return 'Settled';
  };

  const members = group?.members || [];
  const visibleMembers = members.filter((member) => member.role !== 'admin');
  const nonAdminMembers = visibleMembers;

  const stats = useMemo(() => {
    const admins = members.filter((member) => member.role === 'admin').length;
    const settled = members.filter((member) => Number(member.balance || 0) === 0).length;
    const activeBalances = members.filter((member) => Number(member.balance || 0) !== 0).length;
    const you = members.find((member) => member._id === user?._id);

    return {
      total: members.length,
      admins,
      settled,
      activeBalances,
      yourBalance: you?.balance || 0,
    };
  }, [members, user?._id]);

  if (!activeGroupId) return <NoGroup />;
  if (loading) return <Spinner message="Loading members..." />;

  return (
    <div className="members-page">
      <section className="members-hero">
        <div className="members-hero__bg members-hero__bg--left" />
        <div className="members-hero__bg members-hero__bg--right" />

        <div className="members-hero__content">
          <div className="members-hero__copy">
            <div className="members-hero__eyebrow">Team Directory</div>
            <h2 className="members-hero__title">Members</h2>

            <div className="members-hero__meta">
              <span className="members-chip members-chip--accent">{group?.name}</span>
              <span className="members-chip">{visibleMembers.length} members</span>
              {group?.hostelName && <span className="members-chip">{group.hostelName}</span>}
              {group?.city && <span className="members-chip">{group.city}</span>}
              {group?.university && <span className="members-chip">{group.university}</span>}
            </div>
          </div>

          <div className="members-hero__actions">
            {isAdmin ? (
              <>
                <HeaderButton onClick={() => setShowEditGroup(true)}>Edit Group</HeaderButton>
                <Link to="/group-requests" style={{ textDecoration: 'none' }}>
                  <button className="members-btn members-btn--primary" type="button">
                    Join Requests
                  </button>
                </Link>
                <HeaderButton variant="danger" onClick={() => setShowDeleteGroup(true)}>Delete Group</HeaderButton>
              </>
            ) : (
              <HeaderButton variant="danger" onClick={() => setShowLeave(true)}>Leave Group</HeaderButton>
            )}
          </div>
        </div>
      </section>

      <section className="members-stats-grid">
        <StatCard label="Total Members" value={stats.total} hint="Everyone currently in this group" />
        <StatCard label="Admins" value={stats.admins} hint="People with full control" tone="info" />
        <StatCard label="Open Balances" value={stats.activeBalances} hint="Members needing attention" tone="warning" />
        <StatCard
          label="Your Balance"
          value={`Rs. ${stats.yourBalance.toLocaleString()}`}
          hint={stats.yourBalance >= 0 ? 'Positive or settled position' : 'You currently owe'}
          tone={stats.yourBalance >= 0 ? 'positive' : 'danger'}
        />
      </section>

      <section className="members-directory">
        <div className="members-directory__header">
          <div>
            <h3 className="members-section-title">Group Members</h3>
          </div>
          <div className="members-directory__hint">{stats.settled} settled</div>
        </div>

        <div
          className={`members-grid ${
            visibleMembers.length === 1
              ? 'members-grid--single'
              : visibleMembers.length === 2
                ? 'members-grid--double'
                : 'members-grid--scroll'
          }`}
        >
          {visibleMembers.map((member, index) => {
            const color = COLORS[index % COLORS.length];
            const isCurrentUser = member._id?.toString() === user?._id?.toString();
            const showEmail = isAdmin || isCurrentUser;
            const canManage = isAdmin && member.role !== 'admin';
            const canLeave = isCurrentUser;
            const showActions = canManage || canLeave;
            const isPositive = member.balance > 0;
            const isNegative = member.balance < 0;
            const balanceTone = isPositive ? 'positive' : isNegative ? 'negative' : 'neutral';

            return (
              <article
                key={member._id}
                className={`member-card ${showActions ? 'member-card--with-actions' : ''}`}
                style={{
                  '--member-accent': color,
                  '--member-accent-soft': alpha(color, 18),
                  '--member-accent-glow': alpha(color, 28),
                  '--member-accent-wash': alpha(color, 7),
                }}
              >
                <div className="member-card__top">
                  <div className="member-card__identity">
                    <Avatar name={member.name} size={48} color={color} />
                    <div className="member-card__identity-copy">
                      <h4 className="member-card__name">{member.name}</h4>
                      <div className="member-card__email">
                        {showEmail ? member.email : 'Member account'}
                      </div>
                    </div>
                  </div>

                  <div className="member-card__tag-rail">
                    {isCurrentUser && <span className="member-tag member-tag--self">You</span>}
                  </div>
                </div>

                <div className={`member-card__balance member-card__balance--${balanceTone}`}>
                  <div className="member-card__balance-label">{getBalanceLabel(member)}</div>
                  <div className="member-card__balance-value">
                    {member.balance >= 0 ? '+' : ''}Rs. {Number(member.balance || 0).toLocaleString()}
                  </div>
                </div>

                <div className="member-card__meta">
                  <div className="member-card__meta-item">
                    <span className="member-card__meta-label">Status</span>
                    <span className="member-card__meta-value">
                      {member.balance === 0 ? 'Settled' : member.balance > 0 ? 'In credit' : 'Pending'}
                    </span>
                  </div>
                  <div className="member-card__meta-item">
                    <span className="member-card__meta-label">Access</span>
                    <span className="member-card__meta-value">{isCurrentUser ? 'Your profile' : 'Standard'}</span>
                  </div>
                </div>

                {showActions && (
                  <div className="member-card__actions">
                    {canManage && (
                      <>
                        <button
                          type="button"
                          className="member-action-btn member-action-btn--secondary"
                          onClick={() => {
                            setNewAdminId(member._id);
                            setShowTransfer(true);
                          }}
                        >
                          Make Admin
                        </button>
                        <button
                          type="button"
                          className="member-action-btn member-action-btn--danger"
                          onClick={() => setRemoveId(member._id)}
                        >
                          Remove
                        </button>
                      </>
                    )}

                    {canLeave && (
                      <button
                        type="button"
                        className="member-action-btn member-action-btn--danger member-action-btn--full"
                        onClick={() => setShowLeave(true)}
                      >
                        Leave Group
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <Modal isOpen={showEditGroup} onClose={() => setShowEditGroup(false)} title="Edit Group Info">
        <FormField label="Group Name" required>
          <input value={editForm.name} onChange={(e) => setEditForm((form) => ({ ...form, name: e.target.value }))} />
        </FormField>
        <FormField label="Hostel Name">
          <input value={editForm.hostelName} onChange={(e) => setEditForm((form) => ({ ...form, hostelName: e.target.value }))} placeholder="e.g. Fast Hostel Block B" />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="City">
            <input value={editForm.city} onChange={(e) => setEditForm((form) => ({ ...form, city: e.target.value }))} placeholder="e.g. Lahore" />
          </FormField>
          <FormField label="University">
            <input value={editForm.university} onChange={(e) => setEditForm((form) => ({ ...form, university: e.target.value }))} placeholder="e.g. FAST NUCES" />
          </FormField>
        </div>
        <FormField label="Description">
          <textarea value={editForm.description} onChange={(e) => setEditForm((form) => ({ ...form, description: e.target.value }))} rows={2} style={{ resize: 'vertical' }} />
        </FormField>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowEditGroup(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleUpdateGroup} disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: 'var(--button-primary-gradient)', color: 'var(--button-primary-text)', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={showTransfer} onClose={() => { setShowTransfer(false); setNewAdminId(''); }} title="Transfer Admin Role" maxWidth={400}>
        <p className="app-modal__message">
          You will become a regular member. The selected person will become the new admin.
        </p>
        <FormField label="New Admin">
          <select value={newAdminId} onChange={(e) => setNewAdminId(e.target.value)}>
            <option value="">Select member...</option>
            {nonAdminMembers.map((member) => (
              <option key={member._id} value={member._id}>{member.name}</option>
            ))}
          </select>
        </FormField>
        <div className="app-modal__actions">
          <button
            type="button"
            className="app-modal__action app-modal__action--secondary"
            onClick={() => { setShowTransfer(false); setNewAdminId(''); }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="app-modal__action app-modal__action--accent"
            onClick={handleTransferAdmin}
            disabled={transferring || !newAdminId}
          >
            {transferring ? '...' : 'Transfer'}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!removeId}
        onClose={() => setRemoveId(null)}
        onConfirm={handleRemove}
        title="Remove Member"
        confirmText="Remove"
        loading={removing}
        message="Remove this member? They must have a zero balance to be removed."
      />

      <Modal
        isOpen={showLeave}
        onClose={() => {
          setShowLeave(false);
          setLeaveAck(false);
          setLeaveType('');
          setLeaveError('');
        }}
        title="Leave Group"
        maxWidth={440}
      >
        <div className="leave-confirm">
          <div className="leave-confirm__text">
            You can only leave if your balance is zero. Clear all dues before leaving.
          </div>
          {leaveError && (
            <div className="leave-confirm__error">{leaveError}</div>
          )}
          <div className="leave-confirm__input">
            <div>Type the group name to confirm</div>
            <input
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              placeholder={group?.name || 'Group name'}
            />
          </div>
          <label className="leave-confirm__check">
            <input
              type="checkbox"
              checked={leaveAck}
              onChange={(e) => setLeaveAck(e.target.checked)}
            />
            <span>I understand I will lose access to this group.</span>
          </label>
          <div className="leave-confirm__actions">
            <button
              type="button"
              className="leave-confirm__cancel"
              onClick={() => {
                setShowLeave(false);
                setLeaveAck(false);
                setLeaveType('');
                setLeaveError('');
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="leave-confirm__confirm"
              disabled={
                leaving ||
                !leaveAck ||
                leaveType.trim().toLowerCase() !== (group?.name || '').trim().toLowerCase()
              }
              onClick={handleLeave}
            >
              {leaving ? 'Leaving...' : 'Leave Group'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showDeleteGroup}
        onClose={() => setShowDeleteGroup(false)}
        onConfirm={handleDeleteGroup}
        title="Delete Group"
        confirmText="Delete Group"
        loading={deletingGroup}
        message="Delete this group permanently? All members, join requests, expenses, payments, and history for this group will be removed."
      />
    </div>
  );
};

export default MembersPage;
