// pages/MembersPage.js - Member management (Admin only)
import React, { useState, useEffect } from 'react';
import { groupAPI } from '../services/api';
import Modal, { ConfirmModal } from '../components/Modal';
import FormField from '../components/FormField';
import Spinner from '../components/Spinner';
import { Avatar } from '../components/Layout';
import toast from 'react-hot-toast';

const COLORS = ['#2ECC9A', '#5B8DEF', '#FFB547', '#E879F9', '#FB923C', '#34D399'];

const MembersPage = () => {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [removeId, setRemoveId] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const loadGroup = async () => {
    setLoading(true);
    try {
      const res = await groupAPI.getGroup();
      setGroup(res.data.group);
    } catch { toast.error('Failed to load group'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadGroup(); }, []);

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) return toast.error('All fields required');
    setSaving(true);
    try {
      await groupAPI.addMember(form);
      toast.success(`${form.name} added to the group!`);
      setShowAdd(false);
      setForm({ name: '', email: '', password: '' });
      loadGroup();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    } finally { setSaving(false); }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await groupAPI.removeMember(removeId);
      toast.success('Member removed');
      setRemoveId(null);
      loadGroup();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot remove member');
    } finally { setRemoving(false); }
  };

  // ✅ Correct balance label per role
  const getBalanceLabel = (m) => {
    if (m.role === 'admin') {
      if (m.balance > 0)  return 'Members owe you';
      if (m.balance < 0)  return 'You overspent';
      return 'All settled';
    }
    // member
    if (m.balance < 0)  return 'Owes admin';
    if (m.balance > 0)  return 'Admin owes member';
    return 'Settled';
  };

  if (loading) return <Spinner message="Loading members..." />;

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 28, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h2 style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 900,
            fontSize: 26, color: 'var(--text)', margin: 0,
          }}>Members</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            Group: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{group?.name}</span>
            {' · '}{group?.members?.length} members
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
          border: 'none', borderRadius: 10,
          padding: '10px 20px', color: '#000', fontWeight: 800,
          cursor: 'pointer', fontSize: 14,
        }}>+ Add Member</button>
      </div>

      {/* ── Member Cards Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 16,
      }}>
        {group?.members?.map((m, i) => {
          const color      = COLORS[i % COLORS.length];
          const isPositive = m.balance >= 0;
          const balanceColor  = isPositive ? 'var(--accent)' : 'var(--red)';
          const balanceBg     = isPositive ? 'var(--accent-soft)' : 'var(--red-soft)';
          const balanceBorder = isPositive ? 'var(--accent-glow)' : 'rgba(255,92,106,0.25)';

          return (
            <div
              key={m._id}
              style={{
                background: `linear-gradient(135deg, var(--surface), ${color}0A)`,
                border: `1px solid ${color}22`,
                borderRadius: 16,
                padding: 20,
                // ✅ Prevent card from being too narrow — content fits at any width
                minWidth: 0,
                overflow: 'hidden',
                transition: 'transform .2s, box-shadow .2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 16px 40px ${color}20`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* ── Avatar + Role Badge ── */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 16,
                gap: 8,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  minWidth: 0, flex: 1,
                }}>
                  <div style={{ flexShrink: 0 }}>
                    <Avatar name={m.name} size={40} color={color} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontWeight: 800, color: 'var(--text)', fontSize: 14,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{m.name}</div>
                    <div style={{
                      fontSize: 11, color: 'var(--text-muted)', marginTop: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{m.email}</div>
                  </div>
                </div>

                {/* Role badge — shrinks but doesn't wrap */}
                <span style={{
                  flexShrink: 0,
                  background: m.role === 'admin' ? 'var(--accent-soft)' : 'var(--blue-soft)',
                  color: m.role === 'admin' ? 'var(--accent)' : 'var(--blue)',
                  padding: '3px 8px', borderRadius: 99,
                  fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                  whiteSpace: 'nowrap',
                }}>
                  {m.role === 'admin' ? '👑 ADMIN' : '👤 MEMBER'}
                </span>
              </div>

              {/* ── Balance Card ── */}
              <div style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: balanceBg,
                border: `1px solid ${balanceBorder}`,
                marginBottom: 14,
                // ✅ Key fix: label and amount stack vertically when space is tight
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}>
                {/* Label row */}
                <span style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  {getBalanceLabel(m)}
                </span>

                {/* Amount — always on its own line, scales with font clamp */}
                <span style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 800,
                  // ✅ clamp: min 15px, preferred 4vw, max 20px — never overflows
                  fontSize: 'clamp(15px, 4vw, 20px)',
                  color: balanceColor,
                  // Allow wrapping for very large numbers on small screens
                  wordBreak: 'break-word',
                  lineHeight: 1.2,
                }}>
                  {m.balance >= 0 ? '+' : ''}Rs.{' '}
                  {m.balance?.toLocaleString()}
                </span>
              </div>

              {/* ── Remove Button (members only) ── */}
              {m.role !== 'admin' && (
                <button
                  onClick={() => setRemoveId(m._id)}
                  style={{
                    width: '100%', padding: '8px', borderRadius: 8,
                    background: 'var(--red-soft)',
                    border: '1px solid rgba(255,92,106,0.3)',
                    color: 'var(--red)', fontWeight: 700,
                    cursor: 'pointer', fontSize: 12,
                  }}
                >
                  Remove from Group
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Add Member Modal ── */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Member">
        <p style={{
          color: 'var(--text-muted)', fontSize: 13,
          marginBottom: 20, lineHeight: 1.5,
        }}>
          Create a login account for the new member. They can use these credentials to
          login and view their balance.
        </p>
        <FormField label="Full Name" required>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ali Khan"
          />
        </FormField>
        <FormField label="Email Address" required>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="ali@example.com"
          />
        </FormField>
        <FormField label="Password" required>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Min 6 characters"
          />
        </FormField>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowAdd(false)}
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={handleAdd}
            disabled={saving}
            style={{
              flex: 2, padding: '11px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
              color: '#000', fontWeight: 800,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Adding...' : 'Add Member'}
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
        message="Remove this member from the group? They must have a zero balance to be removed."
      />
    </div>
  );
};

export default MembersPage;