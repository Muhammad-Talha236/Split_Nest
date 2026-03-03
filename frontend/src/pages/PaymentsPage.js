// pages/PaymentsPage.js - Payment recording & history
import React, { useState, useEffect, useCallback } from 'react';
import { paymentAPI, groupAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal, { ConfirmModal } from '../components/Modal';
import FormField from '../components/FormField';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { Avatar } from '../components/Layout';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COLORS = ['#2ECC9A', '#5B8DEF', '#FFB547', '#E879F9', '#FB923C', '#34D399'];

const PaymentsPage = () => {
  const { isAdmin, updateUser, user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    memberId: '', amount: '', note: '', paymentMethod: 'cash', date: ''
  });

  const loadPayments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await paymentAPI.getPayments({ page, limit: 10 });
      setPayments(res.data.payments);
      setPagination(res.data.pagination);
      setMonthlyTotal(res.data.monthlyTotal);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  useEffect(() => {
    if (isAdmin) {
      groupAPI.getGroup().then(res => {
        // ✅ Include ALL members (including admin themselves) so admin can settle own balance
        setMembers(res.data.group.members);
      }).catch(() => {});
    }
  }, [isAdmin]);

  // ✅ Refresh admin's own balance from server after payment
  const refreshAdminBalance = async () => {
    try {
      const { authAPI } = await import('../services/api');
      const res = await authAPI.getMe();
      updateUser(res.data.user);
    } catch (e) {
      console.error('Could not refresh user balance', e);
    }
  };

  const handleRecord = async () => {
    if (!form.memberId || !form.amount) return toast.error('Member and amount are required');
    setSaving(true);
    try {
      await paymentAPI.recordPayment({ ...form, amount: parseFloat(form.amount) });
      toast.success('Payment recorded!');
      setShowModal(false);
      setForm({ memberId: '', amount: '', note: '', paymentMethod: 'cash', date: '' });
      await loadPayments();
      // ✅ Update topbar balance immediately
      await refreshAdminBalance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await paymentAPI.deletePayment(deleteId);
      toast.success('Payment reversed');
      setDeleteId(null);
      await loadPayments();
      // ✅ Update topbar balance immediately
      await refreshAdminBalance();
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  const openModal = () => {
    setShowModal(true);
    setForm({
      memberId: '',
      amount: '',
      note: '',
      paymentMethod: 'cash',
      date: format(new Date(), 'yyyy-MM-dd')
    });
  };

  // Separate members into "regular members" and "admin" for display
  const regularMembers = members.filter(m => m.role !== 'admin');
  const adminSelf = members.find(m => m.role === 'admin');

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 24, flexWrap: 'wrap', gap: 12
      }}>
        <div>
          <h2 style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 900,
            fontSize: 26, color: 'var(--text)', margin: 0
          }}>Payments</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            Track payments received from members
          </p>
        </div>
        {isAdmin && (
          <button onClick={openModal} style={{
            background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
            border: 'none', borderRadius: 10, padding: '10px 20px',
            color: '#000', fontWeight: 800, cursor: 'pointer', fontSize: 14,
          }}>+ Record Payment</button>
        )}
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--accent-glow)',
          borderRadius: 16, padding: 20
        }}>
          <div style={{
            fontSize: 12, color: 'var(--text-muted)', marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600
          }}>Received This Month</div>
          <div style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 900,
            fontSize: 28, color: 'var(--accent)'
          }}>Rs. {monthlyTotal?.toLocaleString()}</div>
        </div>
        <div style={{
          background: 'var(--surface)',
          border: '1px solid rgba(255,92,106,0.3)',
          borderRadius: 16, padding: 20
        }}>
          <div style={{
            fontSize: 12, color: 'var(--text-muted)', marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600
          }}>Total Payments</div>
          <div style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 900,
            fontSize: 28, color: 'var(--text)'
          }}>{pagination.total || 0}</div>
        </div>
      </div>

      {/* List */}
      {loading ? <Spinner /> : payments.length === 0 ? (
        <EmptyState
          icon="💵"
          title="No payments recorded"
          message="Record a payment when a member pays back their dues."
        />
      ) : (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16, overflow: 'hidden'
        }}>
          <div style={{ padding: '12px 16px 0', fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>
            Payment History
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {payments.map((p, i) => (
              <div key={p._id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: i < payments.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Avatar name={p.member?.name || '?'} size={40} color={COLORS[i % COLORS.length]} />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>
                      {p.member?.name}
                      {p.member?.role === 'admin' && (
                        <span style={{
                          marginLeft: 8, fontSize: 10, padding: '2px 6px',
                          borderRadius: 99, background: 'var(--accent-soft)',
                          color: 'var(--accent)', fontWeight: 700
                        }}>ADMIN</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {format(new Date(p.date), 'MMM d, yyyy')}
                      {' · '}{p.paymentMethod.replace('_', ' ')}
                      {p.note && ` · ${p.note}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 16 }}>
                    +Rs. {p.amount?.toLocaleString()}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => setDeleteId(p._id)}
                      style={{
                        background: 'var(--red-soft)',
                        border: '1px solid rgba(255,92,106,0.3)',
                        borderRadius: 6, padding: '4px 10px',
                        color: 'var(--red)', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                      }}
                    >Reverse</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <Pagination
              current={pagination.page}
              total={pagination.pages}
              onChange={loadPayments}
            />
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Payment">
        <FormField label="Who paid?" required>
          <select
            value={form.memberId}
            onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))}
          >
            <option value="">Select person...</option>

            {/* ✅ Regular members section */}
            {regularMembers.length > 0 && (
              <optgroup label="── Members ──">
                {regularMembers.map(m => (
                  <option key={m._id} value={m._id}>
                    {m.name} (Balance: Rs. {m.balance?.toLocaleString()})
                  </option>
                ))}
              </optgroup>
            )}

            {/* ✅ Admin self-settlement */}
            {adminSelf && (
              <optgroup label="── Admin ──">
                <option value={adminSelf._id}>
                  {adminSelf.name} — My Own Payment (Balance: Rs. {adminSelf.balance?.toLocaleString()})
                </option>
              </optgroup>
            )}
          </select>
        </FormField>

        <FormField label="Amount (Rs.)" required>
          <input
            type="number"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="e.g. 500"
            min="1"
          />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Payment Method">
            <select
              value={form.paymentMethod}
              onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="online">Online</option>
              <option value="other">Other</option>
            </select>
          </FormField>
          <FormField label="Date">
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </FormField>
        </div>

        <FormField label="Note (optional)">
          <input
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            placeholder="e.g. Rent payment"
          />
        </FormField>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={() => setShowModal(false)}
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer'
            }}
          >Cancel</button>
          <button
            onClick={handleRecord}
            disabled={saving}
            style={{
              flex: 2, padding: '11px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
              color: '#000', fontWeight: 800,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Reverse Payment"
        confirmText="Reverse"
        loading={deleting}
        message="This will reverse the payment and restore the member's original balance."
      />
    </div>
  );
};

export default PaymentsPage;