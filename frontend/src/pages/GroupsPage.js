// pages/GroupsPage.js - Discover & join groups
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';
import { AVATAR_COLORS } from '../theme';

const COLORS = AVATAR_COLORS;

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
    <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M20 20l-4.2-4.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14">
    <path
      d="M12 21s-5.5-5.2-5.5-10A5.5 5.5 0 0 1 17.5 11C17.5 15.8 12 21 12 21Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="11" r="1.8" fill="currentColor" />
  </svg>
);

const GroupsPage = () => {
  const { user, switchGroup, activeGroupId, updateUser } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [memberPreviewByGroup, setMemberPreviewByGroup] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteCardId, setDeleteCardId] = useState(null);
  const [deleteAckById, setDeleteAckById] = useState({});
  const [deleteTypeById, setDeleteTypeById] = useState({});
  const [deleteErrorById, setDeleteErrorById] = useState({});
  const [leaveCardId, setLeaveCardId] = useState(null);
  const [leaveTarget, setLeaveTarget] = useState(null);
  const [leaveAck, setLeaveAck] = useState(false);
  const [leaveType, setLeaveType] = useState('');
  const [leaveError, setLeaveError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reqMessage, setReqMessage] = useState('');
  const [activeTab, setActiveTab] = useState('joined');

  const [createForm, setCreateForm] = useState({
    name: '',
    hostelName: '',
    city: '',
    university: '',
    description: '',
    isPublic: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await groupAPI.getAllGroups({ search });
      setGroups(res.data.groups);
    } catch {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleCreate = async () => {
    if (!createForm.name.trim()) return toast.error('Group name is required');
    setSaving(true);
    try {
      const res = await groupAPI.createGroup(createForm);
      toast.success(`"${createForm.name}" created!`);
      setShowCreate(false);
      setCreateForm({ name: '', hostelName: '', city: '', university: '', description: '', isPublic: true });
      await switchGroup(res.data.group._id);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create group');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestJoin = async () => {
    if (!selectedGroup) return;
    setSaving(true);
    try {
      await groupAPI.sendJoinRequest(selectedGroup._id, { message: reqMessage });
      toast.success(`Request sent to "${selectedGroup.name}"!`);
      setShowRequest(false);
      setReqMessage('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send request');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchGroup = async (groupId) => {
    const ok = await switchGroup(groupId);
    if (ok) {
      toast.success('Group switched!');
      navigate('/dashboard');
    }
  };

  const getMyRoleForGroup = (groupId) => (
    user?.groups?.find(g => ((g.groupId?._id || g.groupId)?.toString() === groupId?.toString()))?.role || null
  );

  const loadMemberPreview = async (groupId) => {
    if (!groupId || memberPreviewByGroup[groupId]) return;
    try {
      const res = await groupAPI.getGroup(groupId);
      setMemberPreviewByGroup(prev => ({ ...prev, [groupId]: res.data.group.members || [] }));
    } catch {
      setMemberPreviewByGroup(prev => ({ ...prev, [groupId]: [] }));
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await groupAPI.deleteGroup(deleteTarget._id);

      const remainingGroups = (user?.groups || []).filter(
        g => ((g.groupId?._id || g.groupId)?.toString() !== deleteTarget._id?.toString())
      );
      const nextActiveGroupId = activeGroupId?.toString() === deleteTarget._id?.toString()
        ? (remainingGroups[0]?.groupId?._id || remainingGroups[0]?.groupId || null)
        : activeGroupId;

      updateUser({
        ...user,
        groups: remainingGroups,
        activeGroupId: nextActiveGroupId,
      });

      setDeleteTarget(null);
      setDeleteCardId(null);
      setDeleteAckById(prev => ({ ...prev, [deleteTarget._id]: false }));
      setDeleteTypeById(prev => ({ ...prev, [deleteTarget._id]: '' }));
      setDeleteErrorById(prev => ({ ...prev, [deleteTarget._id]: '' }));
      setGroups(prev => prev.filter(group => group._id !== deleteTarget._id));
      toast.success(`"${deleteTarget.name}" deleted`);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete group';
      setDeleteErrorById(prev => ({ ...prev, [deleteTarget._id]: message }));
    } finally {
      setDeleting(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!leaveTarget) return;
    setLeaving(true);
    try {
      await groupAPI.leaveGroup(leaveTarget._id);
      if (activeGroupId?.toString() === leaveTarget._id?.toString()) {
        await switchGroup(null);
      }
      setLeaveCardId(null);
      setLeaveAck(false);
      setLeaveType('');
      setLeaveError('');
      setLeaveTarget(null);
      load();
      toast.success('You have left the group');
    } catch (err) {
      setLeaveError(err.response?.data?.message || 'Cannot leave group');
    } finally {
      setLeaving(false);
    }
  };

  const joinedGroups = groups.filter(group => group.isMember);
  const discoverGroups = groups.filter(group => !group.isMember);
  const visibleGroups = activeTab === 'joined' ? joinedGroups : discoverGroups;
  const totalCount = activeTab === 'joined' ? joinedGroups.length : discoverGroups.length;

  const renderGroupCard = (group, index, isDiscover) => {
    const color = COLORS[index % COLORS.length];
    const isActive = activeGroupId?.toString() === group._id?.toString();
    const myRole = getMyRoleForGroup(group._id);
    const canDelete = myRole === 'admin';
    const canLeave = group.isMember && myRole !== 'admin';
    const memberPreview = memberPreviewByGroup[group._id] || [];
    const maxAvatars = Math.min(3, group.memberCount || 3);
    const avatarNames = memberPreview.length
      ? memberPreview.slice(0, maxAvatars).map(member => member?.name || 'Member')
      : Array.from({ length: maxAvatars }, () => group.name || 'Member');
    const isDeleteMode = deleteCardId === group._id;
    const isLeaveMode = leaveCardId === group._id;
    const mode = isDeleteMode ? 'delete' : (isLeaveMode ? 'leave' : 'delete');
    const deleteAck = deleteAckById[group._id] || false;
    const deleteTyped = deleteTypeById[group._id] || '';
    const deleteError = deleteErrorById[group._id] || '';
    const deleteNameMatch = deleteTyped.trim().toLowerCase() === (group.name || '').trim().toLowerCase();
    const canConfirmDelete = deleteAck && deleteNameMatch && !deleting;
    const leaveNameMatch = leaveType.trim().toLowerCase() === (group.name || '').trim().toLowerCase();
    const canConfirmLeave = leaveAck && leaveNameMatch && !leaving;
    const backError = mode === 'delete' ? deleteError : leaveError;
    const isFlipMode = isDeleteMode || isLeaveMode;

    return (
      <article
        key={group._id}
        className={[
          'group-card',
          isActive ? 'group-card--active' : '',
          isDiscover ? 'group-card--discover' : '',
          isFlipMode ? 'group-card--flip' : '',
          backError ? 'group-card--error' : '',
        ].filter(Boolean).join(' ')}
        onMouseEnter={() => loadMemberPreview(group._id)}
        onMouseLeave={() => {
          if (deleteCardId === group._id || leaveCardId === group._id) return;
        }}
      >
        {canDelete && !isDiscover && (
          <button
            type="button"
            className="group-card__delete"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteCardId(group._id);
              setDeleteTarget(group);
              setLeaveCardId(null);
              setLeaveTarget(null);
              setLeaveAck(false);
              setLeaveType('');
              setLeaveError('');
              setDeleteErrorById(prev => ({ ...prev, [group._id]: '' }));
            }}
            aria-label={`Delete ${group.name}`}
            title="Delete group"
          >
            Del
          </button>
        )}
        {canLeave && !isDiscover && (
          <button
            type="button"
            className="group-card__leave"
            onClick={(e) => {
              e.stopPropagation();
              setLeaveCardId(group._id);
              setLeaveTarget(group);
              setDeleteCardId(null);
              setDeleteTarget(null);
              setLeaveAck(false);
              setLeaveType('');
              setLeaveError('');
            }}
            aria-label={`Leave ${group.name}`}
            title="Leave group"
          >
            Leave
          </button>
        )}

        <div className="group-card__front">
        <div
          className="group-card__icon"
          style={{
            background: `linear-gradient(140deg, ${color}38, rgba(255,255,255,0.02))`,
            borderColor: `${color}80`,
            color,
          }}
        >
          {group.name?.[0]?.toUpperCase() || 'G'}
        </div>

        <div className="group-card__title">{group.name}</div>
        <div className="group-card__org">{group.hostelName || group.university || 'Shared group'}</div>
        <div className="group-card__location">
          <span className="group-card__pin">Ã°Å¸â€œÂ</span>
          {group.city || 'Unknown'}{group.university ? ` Ã‚Â· ${group.university}` : ''}
        </div>

        <div className="group-card__location group-card__location--clean">
          <span className="group-card__pin"><PinIcon /></span>
          {[group.city || 'Unknown', group.university].filter(Boolean).join(' | ')}
        </div>

        <div className="group-card__divider" />

        <div className="group-card__meta">
          <div className="group-card__members">
            {avatarNames.map((name, idx) => (
              <span
                key={`${group._id}-avatar-${idx}`}
                className="group-card__avatar"
                style={{
                  background: `${color}22`,
                  borderColor: `${color}66`,
                  color,
                }}
                title={name}
              >
                {name.charAt(0).toUpperCase()}
              </span>
            ))}
            <span className="group-card__members-count">{group.memberCount || 0}</span>
          </div>

          <div className="group-card__admin">
            <div className="group-card__admin-label">Admin</div>
            <div className="group-card__admin-name">{group.admin?.name || 'Unknown'}</div>
          </div>
        </div>

        <div className="group-card__footer">
          {myRole && (
            <span className={`group-card__role ${myRole === 'admin' ? 'group-card__role--admin' : 'group-card__role--member'}`}>
              {myRole === 'admin' ? 'Admin' : 'Member'}
            </span>
          )}
          {!myRole && !isDiscover && (
            <span className="group-card__role group-card__role--member">Member</span>
          )}
        </div>

        <button
          type="button"
          className={[
            'group-card__action',
            isActive ? 'group-card__action--active' : '',
            isDiscover ? 'group-card__action--discover' : '',
          ].filter(Boolean).join(' ')}
          disabled={group.requestStatus === 'pending'}
          onClick={() => {
            if (isDiscover) {
              if (group.requestStatus === 'pending') return;
              setSelectedGroup(group);
              setShowRequest(true);
              return;
            }
            if (!isActive) handleSwitchGroup(group._id);
          }}
        >
          {isDiscover
            ? (group.requestStatus === 'pending' ? 'Request Pending' : '+ Request to Join')
            : (isActive ? 'Currently Active' : 'Switch to this Group')}
        </button>

        </div>

        <div className={`group-card__back ${backError ? 'group-card__back--error' : ''} ${mode === 'leave' ? 'group-card__back--leave' : ''}`}>
          <div className="group-card__back-title">{mode === 'delete' ? 'Confirm Delete' : 'Confirm Leave'}</div>
          <div className="group-card__back-copy">
            {mode === 'delete'
              ? 'This will permanently remove the group, its members, expenses, and payment history. Deletion is blocked until all member balances are cleared.'
              : 'You can only leave if your balance is zero. Clear all dues before leaving the group.'}
          </div>
          {backError && (
            <div className="group-card__back-error">{backError}</div>
          )}
          <div className="group-card__back-input">
            <div>Type the group name to confirm</div>
            <input
              value={mode === 'delete' ? deleteTyped : leaveType}
              onChange={(e) => {
                if (mode === 'delete') {
                  setDeleteTypeById(prev => ({ ...prev, [group._id]: e.target.value }));
                  return;
                }
                setLeaveType(e.target.value);
              }}
              placeholder={group.name}
            />
          </div>
          <label className="group-card__back-check">
            <input
              type="checkbox"
              checked={mode === 'delete' ? deleteAck : leaveAck}
              onChange={(e) => {
                if (mode === 'delete') {
                  setDeleteAckById(prev => ({ ...prev, [group._id]: e.target.checked }));
                  return;
                }
                setLeaveAck(e.target.checked);
              }}
            />
            <span>{mode === 'delete' ? 'I understand this action is irreversible.' : 'I understand I will lose access to this group.'}</span>
          </label>
          <div className="group-card__back-actions">
            <button
              type="button"
              className="group-card__back-cancel"
              onClick={() => {
                if (mode === 'delete') {
                  setDeleteCardId(null);
                  setDeleteTarget(null);
                  setDeleteAckById(prev => ({ ...prev, [group._id]: false }));
                  setDeleteTypeById(prev => ({ ...prev, [group._id]: '' }));
                  return;
                }
                setLeaveCardId(null);
                setLeaveTarget(null);
                setLeaveAck(false);
                setLeaveType('');
                setLeaveError('');
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="group-card__back-confirm"
              disabled={mode === 'delete' ? !canConfirmDelete : !canConfirmLeave}
              onClick={() => {
                if (mode === 'delete') {
                  handleDeleteGroup();
                  return;
                }
                handleLeaveGroup();
              }}
            >
              {mode === 'delete'
                ? (deleting ? 'Deleting...' : 'Delete Group')
                : (leaving ? 'Leaving...' : 'Leave Group')}
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="groups-page">
      <section className="groups-hero">
        <div className="groups-hero__left">
          <div className="groups-hero__eyebrow">GROUP DIRECTORY</div>
          <h2 className="groups-hero__title">Groups</h2>
        <div className="groups-hero__meta">
            <span className="groups-hero__pill">{joinedGroups.length} joined</span>
        </div>
        </div>
        <div className="groups-hero__right">
          <button
            type="button"
            className="groups-hero__cta"
            onClick={() => setShowCreate(true)}
          >
            + Create Group
          </button>
        </div>
      </section>

      <div className="groups-search">
        <span className="groups-search__icon"><SearchIcon /></span>
        <input
          placeholder="Search groups by name, org, or city..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="groups-search__input"
        />
        {activeTab === 'joined' && (
          <span className="groups-search__count">{totalCount} total</span>
        )}
      </div>

      <div className="groups-tabs">
        <button
          type="button"
          className={`groups-tab ${activeTab === 'joined' ? 'groups-tab--active' : ''}`}
          onClick={() => setActiveTab('joined')}
        >
          Joined Groups
        </button>
        <button
          type="button"
          className={`groups-tab ${activeTab === 'discover' ? 'groups-tab--active' : ''}`}
          onClick={() => setActiveTab('discover')}
        >
          Discover Groups
        </button>
      </div>

      <div className="groups-section-heading">
        <div>
          <div className="groups-section-title">
            {activeTab === 'joined' ? 'Joined Groups' : 'Discover Groups'}
          </div>
          <div className="groups-section-subtitle">
            {activeTab === 'joined' ? 'Groups you are part of' : 'Browse and request to join'}
          </div>
        </div>
        {activeTab === 'joined' && (
          <span className="groups-section-count">{totalCount} total</span>
        )}
      </div>

      {loading ? <Spinner message="Loading groups..." /> : groups.length === 0 ? (
        <EmptyState
          icon="Ã°Å¸ÂËœÃ¯Â¸Â"
          title="No groups found"
          message={search ? `No groups match "${search}"` : 'Be the first to create a group!'}
          action={
            <button onClick={() => setShowCreate(true)} className="group-empty__cta">
              Create Group
            </button>
          }
        />
      ) : (
        <div className="groups-grid">
          {visibleGroups.map((group, index) =>
            renderGroupCard(group, index, activeTab === 'discover')
          )}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Group" maxWidth={500}>
        <FormField label="Group Name" required>
          <input
            value={createForm.name}
            onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Room 5 Expenses"
          />
        </FormField>
        <FormField label="Hostel Name">
          <input
            value={createForm.hostelName}
            onChange={e => setCreateForm(f => ({ ...f, hostelName: e.target.value }))}
            placeholder="e.g. Fast Hostel Block B"
          />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="City">
            <input
              value={createForm.city}
              onChange={e => setCreateForm(f => ({ ...f, city: e.target.value }))}
              placeholder="e.g. Lahore"
            />
          </FormField>
          <FormField label="University">
            <input
              value={createForm.university}
              onChange={e => setCreateForm(f => ({ ...f, university: e.target.value }))}
              placeholder="e.g. FAST NUCES"
            />
          </FormField>
        </div>
        <FormField label="Description">
          <textarea
            value={createForm.description}
            onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Brief description of this group..."
            rows={2} style={{ resize: 'vertical' }}
          />
        </FormField>
        <FormField label="Visibility">
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { val: true, label: 'Ã°Å¸Å’Â Public', desc: 'Anyone can find & request to join' },
              { val: false, label: 'Ã°Å¸â€â€™ Private', desc: 'Only visible to members' },
            ].map(opt => (
              <label key={opt.label} style={{
                flex: 1, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                background: createForm.isPublic === opt.val ? 'var(--accent-soft)' : 'var(--surface)',
                border: `1px solid ${createForm.isPublic === opt.val ? 'var(--accent-glow)' : 'var(--border)'}`,
              }}>
                <input
                  type="radio" name="visibility"
                  checked={createForm.isPublic === opt.val}
                  onChange={() => setCreateForm(f => ({ ...f, isPublic: opt.val }))}
                  style={{ display: 'none' }}
                />
                <div style={{ fontWeight: 700, fontSize: 13, color: createForm.isPublic === opt.val ? 'var(--accent)' : 'var(--text)' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
              </label>
            ))}
          </div>
        </FormField>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={() => setShowCreate(false)} style={{
            flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleCreate} disabled={saving} style={{
            flex: 2, padding: '11px', borderRadius: 10, border: 'none',
            background: 'var(--button-primary-gradient)',
            color: 'var(--button-primary-text)', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}>{saving ? 'Creating...' : 'Create Group'}</button>
        </div>
      </Modal>

      {/* Join Request Modal */}
      <Modal
        isOpen={showRequest}
        onClose={() => { setShowRequest(false); setReqMessage(''); }}
        title={`Request to Join "${selectedGroup?.name}"`}
        maxWidth={420}
      >
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 16,
          background: 'var(--accent-soft)', border: '1px solid var(--accent-glow)',
          fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6,
        }}>
          Your request will be sent to the group admin. They can accept or reject it.
        </div>
        <FormField label="Message (optional)">
          <textarea
            value={reqMessage}
            onChange={e => setReqMessage(e.target.value)}
            placeholder="Introduce yourself to the admin..."
            rows={3} style={{ resize: 'vertical' }}
          />
        </FormField>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setShowRequest(false); setReqMessage(''); }} style={{
            flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleRequestJoin} disabled={saving} style={{
            flex: 2, padding: '11px', borderRadius: 10, border: 'none',
            background: 'var(--button-primary-gradient)',
            color: 'var(--button-primary-text)', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}>{saving ? 'Sending...' : 'Send Request'}</button>
        </div>
      </Modal>

    </div>
  );
};

export default GroupsPage;
