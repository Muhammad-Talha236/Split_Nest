// pages/ReportsPage.js
// PRIVACY RULES:
//   Admin: sees group-wide reports — total expenses, category breakdown, member contributions,
//          monthly trends, payment collection stats
//   Member: sees ONLY their own expense history and how much they personally owe/have paid
//           NO other members' names, amounts, or financial data
import React, { useState, useEffect } from 'react';
import { expenseAPI, balanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PIE_COLORS = ['#2ECC9A', '#5B8DEF', '#FFB547', '#E879F9', '#FB923C', '#34D399'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface-alt)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '8px 14px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'var(--accent)' }}>Rs. {payload[0].value?.toLocaleString()}</div>
    </div>
  );
};

// ─── MEMBER REPORT ─────────────────────────────────────────────────────────────
// Only shows member's own expense participation and their personal dues
const MemberReport = ({ user, history }) => {
  const myBalance    = user?.balance ?? 0;
  const myExpenses   = history.filter(t => t.type === 'expense');
  const myPayments   = history.filter(t => t.type === 'payment');
  const totalExpenseAmt = myExpenses.reduce((s, e) => s + (e.splitAmount || 0), 0);
  const totalPaid       = myPayments.reduce((s, p) => s + p.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Personal summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid rgba(255,92,106,0.3)',
          borderRadius: 16, padding: '18px 20px',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
            My Outstanding Balance
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 26, color: myBalance < 0 ? 'var(--red)' : 'var(--accent)' }}>
            {myBalance >= 0 ? '+' : ''}Rs. {myBalance.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {myBalance < 0 ? 'You owe the admin' : myBalance === 0 ? 'Fully settled ✅' : 'Admin owes you'}
          </div>
        </div>

        <div style={{
          background: 'var(--surface)', border: '1px solid rgba(91,141,239,0.3)',
          borderRadius: 16, padding: '18px 20px',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
            My Share of Expenses
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 26, color: '#5B8DEF' }}>
            Rs. {totalExpenseAmt.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Across {myExpenses.length} expense{myExpenses.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div style={{
          background: 'var(--surface)', border: '1px solid var(--accent-glow)',
          borderRadius: 16, padding: '18px 20px',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
            Total I've Paid Back
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 26, color: 'var(--accent)' }}>
            Rs. {totalPaid.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Across {myPayments.length} payment{myPayments.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div style={{
          background: 'var(--surface)', border: '1px solid rgba(255,181,71,0.3)',
          borderRadius: 16, padding: '18px 20px',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
            Still To Pay
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 26, color: '#FFB547' }}>
            Rs. {Math.max(0, Math.abs(myBalance)).toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {myBalance >= 0 ? 'Nothing — you\'re settled!' : 'Pay this to settle up'}
          </div>
        </div>
      </div>

      {/* My recent expense history */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>My Expense History</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Expenses you were included in
          </div>
        </div>
        {myExpenses.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No expenses found
          </div>
        ) : (
          myExpenses.slice(0, 10).map((e, i) => (
            <div key={e._id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px',
              borderBottom: i < Math.min(myExpenses.length, 10) - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18 }}>🧾</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{e.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {format(new Date(e.date), 'MMM d, yyyy')}
                    {e.category && ` · ${e.category}`}
                    {e.dividedAmong && ` · split ${e.dividedAmong.length} ways`}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--red)' }}>
                  -Rs. {(e.splitAmount || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>your share</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ─── ADMIN REPORT ──────────────────────────────────────────────────────────────
const AdminReport = ({ stats, history }) => {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chartData = weekDays.map((day, idx) => {
    const found = stats?.weeklyData?.find(d => d._id === idx + 1);
    return { day, amount: found?.total || 0 };
  });

  const categoryData = stats?.categoryData || [];
  const totalCat = categoryData.reduce((s, c) => s + c.total, 0);
  const memberBalances = stats?.memberBalances || [];
  const nonAdminMembers = memberBalances.filter(m => m.role !== 'admin');

  // Payment rate = members who have settled / total members
  const settledCount = nonAdminMembers.filter(m => m.balance === 0).length;
  const payRate = nonAdminMembers.length > 0
    ? Math.round((settledCount / nonAdminMembers.length) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Monthly Total', value: `Rs. ${(stats?.monthlyTotal || 0).toLocaleString()}`, color: '#2ECC9A', border: 'rgba(46,204,154,0.3)' },
          { label: 'Total Receivable', value: `Rs. ${(stats?.totalReceivable || 0).toLocaleString()}`, color: '#FF5C6A', border: 'rgba(255,92,106,0.3)' },
          { label: 'Members', value: stats?.totalMembers || 0, color: '#E879F9', border: 'rgba(232,121,249,0.3)' },
          { label: 'Settlement Rate', value: `${payRate}%`, color: '#FFB547', border: 'rgba(255,181,71,0.3)' },
        ].map((card, i) => (
          <div key={i} style={{
            background: 'var(--surface)', border: `1px solid ${card.border}`,
            borderRadius: 16, padding: '18px 20px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
              {card.label}
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 22, color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, marginBottom: 4 }}>Weekly Expense Trend</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Last 7 days</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(46,204,154,0.05)' }} />
            <Bar dataKey="amount" fill="url(#rptGrad)" radius={[6, 6, 2, 2]} />
            <defs>
              <linearGradient id="rptGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2ECC9A" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#1A7A5C" stopOpacity={0.5} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown + pie */}
      {categoryData.length > 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 20,
          display: 'grid', gridTemplateColumns: '1fr 240px', gap: 24, alignItems: 'center',
        }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, marginBottom: 16 }}>
              Spending by Category
            </div>
            {categoryData.slice(0, 6).map((c, i) => {
              const pct = totalCat ? Math.round((c.total / totalCat) * 100) : 0;
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'capitalize', fontWeight: 500 }}>{c._id}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                      Rs. {c.total.toLocaleString()} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: 'var(--border)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: PIE_COLORS[i % PIE_COLORS.length], transition: 'width 1s' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <PieChart width={200} height={200}>
            <Pie data={categoryData.slice(0, 6)} cx={100} cy={100} innerRadius={55} outerRadius={85}
              dataKey="total" nameKey="_id" paddingAngle={3}>
              {categoryData.slice(0, 6).map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} contentStyle={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 8 }} />
          </PieChart>
        </div>
      )}

      {/* Member balance overview */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>Member Balance Overview</div>
        </div>
        {nonAdminMembers.map((m, i) => {
          const color = PIE_COLORS[i % PIE_COLORS.length];
          const owes  = m.balance < 0;
          const pctSettled = stats?.totalReceivable
            ? Math.round((Math.abs(m.balance) / stats.totalReceivable) * 100)
            : 0;
          return (
            <div key={m._id} style={{
              padding: '14px 20px',
              borderBottom: i < nonAdminMembers.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
                  }} />
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{m.name}</span>
                </div>
                <span style={{
                  fontWeight: 700, fontSize: 14,
                  color: m.balance === 0 ? 'var(--accent)' : owes ? 'var(--red)' : '#5B8DEF',
                }}>
                  {m.balance >= 0 ? '+' : ''}Rs. {m.balance.toLocaleString()}
                </span>
              </div>
              {owes && (
                <div style={{ height: 4, borderRadius: 99, background: 'var(--border)' }}>
                  <div style={{
                    height: '100%', borderRadius: 99, background: color,
                    width: `${Math.min(pctSettled, 100)}%`, transition: 'width 1s',
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
const ReportsPage = () => {
  const { user } = useAuth();
  const [stats, setStats]     = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, histRes] = await Promise.all([
          expenseAPI.getStats(),
          balanceAPI.getHistory({ page: 1, limit: 50 }),
        ]);
        setStats(statsRes.data.stats);
        setHistory(histRes.data.history || []);
      } catch {
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Spinner message="Loading reports..." />;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 900,
          fontSize: 26, color: 'var(--text)', margin: 0,
        }}>Reports</h2>
        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 13 }}>
          {isAdmin
            ? 'Group financial analytics and insights'
            : 'Your personal expense summary and payment history'}
        </p>
      </div>

      {isAdmin ? (
        <AdminReport stats={stats} history={history} />
      ) : (
        <MemberReport user={user} history={history} />
      )}
    </div>
  );
};

export default ReportsPage;