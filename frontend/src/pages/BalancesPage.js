// pages/BalancesPage.js
// PRIVACY RULES:
//   Admin: sees all member balances, settlement suggestions, full group overview
//   Member: sees ONLY their own balance — no other members' names, amounts, or status
import React, { useState, useEffect } from 'react';
import { balanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import { Avatar } from '../components/Layout';
import toast from 'react-hot-toast';

const BalancesPage = () => {
  const { user } = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    balanceAPI.getBalances()
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load balances'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner message="Loading balances..." />;

  // ─── MEMBER VIEW ──────────────────────────────────────────────────────────────
  // Only shows the logged-in member's own balance. Nothing about others.
  if (!isAdmin) {
    const myBalance = user?.balance ?? 0;
    const settled   = myBalance === 0;
    const owes      = myBalance < 0;

    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 900,
            fontSize: 26, color: 'var(--text)', margin: 0,
          }}>My Balance</h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 13 }}>
            Your current outstanding balance with the group
          </p>
        </div>

        {/* Big balance card */}
        <div style={{
          background: settled
            ? 'linear-gradient(135deg, #0a1a12, #061210)'
            : owes
              ? 'linear-gradient(135deg, #1a0a0c, #120608)'
              : 'linear-gradient(135deg, #0a1318, #060e12)',
          border: `1px solid ${settled ? 'rgba(46,204,154,0.4)' : owes ? 'rgba(255,92,106,0.4)' : 'rgba(91,141,239,0.4)'}`,
          borderRadius: 20, padding: '32px 28px', marginBottom: 24,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 150, height: 150,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${settled ? 'rgba(46,204,154,0.1)' : owes ? 'rgba(255,92,106,0.1)' : 'rgba(91,141,239,0.1)'}, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <Avatar name={user?.name || '?'} size={52} color={settled ? '#2ECC9A' : owes ? '#FF5C6A' : '#5B8DEF'} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>{user?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Member</div>
            </div>
          </div>

          <div style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 900,
            fontSize: 48, letterSpacing: -2, lineHeight: 1,
            color: settled ? '#2ECC9A' : owes ? '#FF5C6A' : '#5B8DEF',
            marginBottom: 10,
          }}>
            {myBalance >= 0 ? '+' : ''}Rs. {myBalance.toLocaleString()}
          </div>

          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
            {settled
              ? '✅ You are fully settled with the group!'
              : owes
                ? `You owe Rs. ${Math.abs(myBalance).toLocaleString()} to the admin`
                : `You have a positive balance of Rs. ${myBalance.toLocaleString()}`}
          </div>

          {owes && (
            <div style={{
              background: 'rgba(255,92,106,0.1)', border: '1px solid rgba(255,92,106,0.2)',
              borderRadius: 12, padding: '14px 18px',
            }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                💡 <strong style={{ color: '#FF5C6A' }}>To settle up:</strong> Pay the admin
                <strong style={{ color: 'var(--text)' }}> Rs. {Math.abs(myBalance).toLocaleString()}</strong> and
                ask them to record the payment in the Payments section.
              </div>
            </div>
          )}

          {settled && (
            <div style={{
              background: 'rgba(46,204,154,0.1)', border: '1px solid rgba(46,204,154,0.2)',
              borderRadius: 12, padding: '14px 18px',
            }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                🎉 Great job! You have no outstanding dues. You're all caught up.
              </div>
            </div>
          )}
        </div>

        {/* Status summary */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '20px 24px',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, marginBottom: 16 }}>
            Balance Summary
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Status</span>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99,
                background: settled ? 'var(--accent-soft)' : owes ? 'var(--red-soft)' : 'rgba(91,141,239,0.15)',
                color: settled ? 'var(--accent)' : owes ? 'var(--red)' : '#5B8DEF',
                border: `1px solid ${settled ? 'var(--accent-glow)' : owes ? 'rgba(255,92,106,0.3)' : 'rgba(91,141,239,0.3)'}`,
              }}>
                {settled ? 'Settled' : owes ? 'Outstanding' : 'Overpaid'}
              </span>
            </div>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Amount</span>
              <span style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18,
                color: settled ? 'var(--accent)' : owes ? 'var(--red)' : '#5B8DEF',
              }}>
                Rs. {Math.abs(myBalance).toLocaleString()}
              </span>
            </div>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Direction</span>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>
                {settled ? 'No dues' : owes ? 'You → Admin' : 'Admin → You'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── ADMIN VIEW ───────────────────────────────────────────────────────────────
  const members     = data?.members     || [];
  const summary     = data?.summary     || {};
  const settlements = data?.settlements || [];
  const nonAdmins   = members.filter(m => m.role !== 'admin');
  const COLORS = ['#2ECC9A', '#5B8DEF', '#FFB547', '#E879F9', '#FB923C', '#34D399'];

  const settledCount    = nonAdmins.filter(m => m.balance === 0).length;
  const outstandingCount = nonAdmins.filter(m => m.balance < 0).length;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 900,
          fontSize: 26, color: 'var(--text)', margin: 0,
        }}>Balances</h2>
        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 13 }}>
          Group financial overview — who owes what
        </p>
      </div>

      {/* Summary row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16, marginBottom: 24,
      }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--accent-glow)',
          borderRadius: 16, padding: '18px 20px', textAlign: 'center',
        }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 24, color: 'var(--accent)' }}>
            Rs. {(summary.totalReceivable || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.8, marginTop: 4 }}>
            Total Receivable
          </div>
        </div>
        <div style={{
          background: 'var(--surface)', border: '1px solid rgba(255,92,106,0.3)',
          borderRadius: 16, padding: '18px 20px', textAlign: 'center',
        }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 24, color: 'var(--red)' }}>
            {outstandingCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.8, marginTop: 4 }}>
            Outstanding
          </div>
        </div>
        <div style={{
          background: 'var(--surface)', border: '1px solid rgba(46,204,154,0.3)',
          borderRadius: 16, padding: '18px 20px', textAlign: 'center',
        }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 24, color: '#2ECC9A' }}>
            {settledCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.8, marginTop: 4 }}>
            Settled
          </div>
        </div>
      </div>

      {/* Member balance list */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden', marginBottom: 24,
      }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>Member Balances</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {nonAdmins.length} members · {outstandingCount} outstanding
          </div>
        </div>

        {nonAdmins.map((m, i) => {
          const color   = COLORS[i % COLORS.length];
          const isSettled = m.balance === 0;
          const owes    = m.balance < 0;
          return (
            <div key={m._id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: i < nonAdmins.length - 1 ? '1px solid var(--border)' : 'none',
              transition: 'background .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Avatar name={m.name} size={42} color={color} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{
                  fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16,
                  color: isSettled ? 'var(--accent)' : owes ? 'var(--red)' : '#5B8DEF',
                }}>
                  {m.balance >= 0 ? '+' : ''}Rs. {m.balance.toLocaleString()}
                </div>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                  background: isSettled ? 'var(--accent-soft)' : owes ? 'var(--red-soft)' : 'rgba(91,141,239,0.15)',
                  color: isSettled ? 'var(--accent)' : owes ? 'var(--red)' : '#5B8DEF',
                  border: `1px solid ${isSettled ? 'var(--accent-glow)' : owes ? 'rgba(255,92,106,0.3)' : 'rgba(91,141,239,0.3)'}`,
                }}>
                  {isSettled ? 'Settled' : owes ? `Owes Rs. ${Math.abs(m.balance).toLocaleString()}` : 'Overpaid'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Settlement suggestions */}
      {settlements.length > 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '18px 20px',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, marginBottom: 14 }}>
            Settlement Plan
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {settlements.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                background: 'var(--surface-alt)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '12px 16px',
              }}>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--red)',
                  background: 'var(--red-soft)', padding: '4px 10px', borderRadius: 99,
                }}>{s.from}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>→</span>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--accent)',
                  background: 'var(--accent-soft)', padding: '4px 10px', borderRadius: 99,
                }}>{s.to}</span>
                <span style={{ marginLeft: 'auto', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>
                  Rs. {s.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {settlements.length === 0 && (
        <div style={{
          background: 'var(--accent-soft)', border: '1px solid var(--accent-glow)',
          borderRadius: 16, padding: '24px 28px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 16, marginBottom: 4 }}>
            Everyone is settled!
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No outstanding dues in the group.</div>
        </div>
      )}
    </div>
  );
};

export default BalancesPage;