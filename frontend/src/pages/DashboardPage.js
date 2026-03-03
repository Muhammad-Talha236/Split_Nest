// pages/DashboardPage.js - Fixed Cash stat + live balance
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { expenseAPI, balanceAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Spinner from '../components/Spinner';
import { Avatar } from '../components/Layout';
import { format } from 'date-fns';

const StatCard = ({ icon, label, value, sub, color = '#2ECC9A' }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{
      background: `linear-gradient(135deg, var(--surface) 60%, ${color}08)`,
      border: '1px solid var(--border)', borderRadius: 16,
      padding: isMobile ? 14 : 20,
      flex: '1 1 140px',
      minWidth: isMobile ? 'calc(50% - 6px)' : 160,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 60, height: 60,
        background: `radial-gradient(circle at top right, ${color}15, transparent 70%)`
      }} />
      <div style={{ fontSize: isMobile ? 20 : 22, marginBottom: 6 }}>{icon}</div>
      <div style={{
        fontFamily: "'Syne', sans-serif", fontWeight: 900,
        fontSize: isMobile ? 18 : 24, color,
        letterSpacing: -1, whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis'
      }}>{value}</div>
      <div style={{
        fontSize: isMobile ? 10 : 12, color: 'var(--text-muted)',
        marginTop: 4, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: 0.6, whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis'
      }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface-alt)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '8px 14px'
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'var(--accent)' }}>Rs. {payload[0].value?.toLocaleString()}</div>
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, histRes] = await Promise.all([
          expenseAPI.getStats(),
          balanceAPI.getHistory({ page: 1, limit: 5 }),
        ]);
        setStats(statsRes.data.stats);
        setHistory(histRes.data.history);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Spinner message="Loading dashboard..." />;

  const isMobile = windowWidth <= 768;
  const isSmallMobile = windowWidth <= 480;

  const weekDays = isMobile
    ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const chartData = weekDays.map((day, idx) => {
    const found = stats?.weeklyData?.find(d => d._id === idx + 1);
    return { day, amount: found?.total || 0 };
  });

  // ✅ FIXED: Cash = total payments received by admin (admin's actual collected cash)
  // Admin balance tracks: positive = still owed, but decreases as payments come in
  // So "collected cash" = totalReceivable (what was owed) - adminBalance (what's still owed)
  const totalOwed = stats?.memberBalances
    ?.filter(m => m.role !== 'admin' && m.balance < 0)
    .reduce((sum, m) => sum + Math.abs(m.balance), 0) || 0;

  const adminBalance = stats?.memberBalances?.find(m => m.role === 'admin')?.balance || 0;

  // ✅ Use user.balance from AuthContext for topbar (always live)
  // For dashboard Cash card: show admin's current receivable balance (what people still owe)
  // This is the same as adminBalance from stats, but we use user.balance for live updates
  const cashValue = user?.balance ?? adminBalance;

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 900,
          fontSize: isMobile ? (isSmallMobile ? 18 : 20) : 24,
          color: 'var(--text)', margin: 0, letterSpacing: -0.5, lineHeight: 1.3
        }}>
          Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'},
          <span style={{ display: isSmallMobile ? 'block' : 'inline' }}> {user?.name?.split(' ')[0]} 👋</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: isMobile ? 11 : 13 }}>
          {format(new Date(), isMobile ? 'EEE, MMM d' : 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: isMobile ? 8 : 16,
        marginBottom: isMobile ? 16 : 24
      }}>
        {/* ✅ Cash = admin's current balance (live from AuthContext user) */}
        <StatCard
          icon="💰"
          label="My Balance"
          value={`${cashValue >= 0 ? '+' : ''}Rs. ${Math.abs(cashValue).toLocaleString()}`}
          color={cashValue >= 0 ? '#2ECC9A' : '#FF5C6A'}
        />
        <StatCard
          icon="📊"
          label="Monthly"
          value={`Rs. ${(stats?.monthlyTotal || 0).toLocaleString()}`}
          color="#5B8DEF"
        />
        <StatCard
          icon="📥"
          label="Receivable"
          value={`Rs. ${(stats?.totalReceivable || 0).toLocaleString()}`}
          color="#FFB547"
        />
        <StatCard
          icon="👥"
          label="Members"
          value={stats?.totalMembers || 0}
          color="#E879F9"
        />
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 20 }}>
        {/* Weekly Chart */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: isMobile ? 16 : 20
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: isMobile ? 15 : 16 }}>
              Weekly Expenses
            </div>
            <div style={{ fontSize: isMobile ? 11 : 12, color: 'var(--text-muted)' }}>
              Last 7 days breakdown
            </div>
          </div>
          <ResponsiveContainer width="100%" height={isMobile ? 140 : 180}>
            <BarChart data={chartData} barSize={isMobile ? 20 : 32}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: 'var(--text-muted)', fontSize: isMobile ? 10 : 12 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: isMobile ? 10 : 11 }}
                axisLine={false} tickLine={false}
                tickFormatter={v => isMobile ? `${v / 1000}k` : `${v}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(46,204,154,0.05)' }} />
              <Bar dataKey="amount" fill="url(#barGrad)" radius={[6, 6, 2, 2]} />
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2ECC9A" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#1A7A5C" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Member Balances */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: isMobile ? 16 : 20
        }}>
          <div style={{
            fontWeight: 700, color: 'var(--text)',
            fontSize: isMobile ? 15 : 16, marginBottom: 14
          }}>
            Member Balances
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10 }}>
            {(stats?.memberBalances || []).map((m, i) => {
              const colors = ['#2ECC9A', '#5B8DEF', '#FFB547', '#E879F9', '#FB923C', '#34D399'];
              const color = colors[i % colors.length];
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--surface-alt)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: isMobile ? '10px 12px' : '8px 12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={m.name} size={isMobile ? 32 : 30} color={color} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        {m.name}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: m.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)',
                        textTransform: 'uppercase', fontWeight: 600
                      }}>
                        {m.role}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontWeight: 700, fontSize: isMobile ? 14 : 13,
                    color: m.balance >= 0 ? 'var(--accent)' : 'var(--red)',
                    background: m.balance >= 0 ? 'var(--accent-soft)' : 'var(--red-soft)',
                    padding: '4px 10px', borderRadius: 99, whiteSpace: 'nowrap'
                  }}>
                    {m.balance >= 0 ? '+' : ''}Rs. {m.balance?.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={() => navigate('/balances')} style={{
            marginTop: 16, width: '100%',
            padding: isMobile ? '12px' : '10px', borderRadius: 10,
            background: 'var(--accent-soft)', border: '1px solid var(--accent-glow)',
            color: 'var(--accent)', fontWeight: 700, cursor: 'pointer',
            fontSize: isMobile ? 13 : 13,
          }}>View Full Balances →</button>
        </div>

        {/* Category Breakdown */}
        {stats?.categoryData?.length > 0 && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: isMobile ? 16 : 20
          }}>
            <div style={{
              fontWeight: 700, color: 'var(--text)',
              fontSize: isMobile ? 15 : 16, marginBottom: 14
            }}>
              By Category
            </div>
            {stats.categoryData.slice(0, 5).map((c, i) => {
              const total = stats.categoryData.reduce((s, x) => s + x.total, 0);
              const pct = total ? Math.round((c.total / total) * 100) : 0;
              const colors = ['#2ECC9A', '#5B8DEF', '#FFB547', '#E879F9', '#FB923C'];
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    marginBottom: 4, flexWrap: isMobile ? 'wrap' : 'nowrap'
                  }}>
                    <span style={{
                      fontSize: 12, color: 'var(--text-dim)',
                      textTransform: 'capitalize', fontWeight: 500
                    }}>{c._id}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                      Rs. {c.total?.toLocaleString()}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
                        ({pct}%)
                      </span>
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: 'var(--border)' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`, borderRadius: 99,
                      background: colors[i % colors.length], transition: 'width 1s'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Transactions */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: isMobile ? 16 : 20
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 16
          }}>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: isMobile ? 15 : 16 }}>
              Recent Transactions
            </div>
            <button
              onClick={() => navigate('/history')}
              style={{
                background: 'none', border: 'none',
                color: 'var(--accent)', cursor: 'pointer',
                fontSize: isMobile ? 12 : 12, fontWeight: 600
              }}
            >
              View all →
            </button>
          </div>

          {history.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: isMobile ? 24 : 30,
              color: 'var(--text-muted)', fontSize: isMobile ? 13 : 14
            }}>
              No transactions yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map((t, i) => (
                <div key={i} style={{
                  display: 'flex',
                  flexDirection: isSmallMobile ? 'column' : 'row',
                  alignItems: isSmallMobile ? 'stretch' : 'center',
                  justifyContent: 'space-between',
                  padding: isMobile ? '12px' : '10px 14px',
                  borderRadius: 12,
                  background: t.type === 'payment' ? 'var(--accent-soft)' : 'var(--red-soft)',
                  border: `1px solid ${t.type === 'payment' ? 'var(--accent-glow)' : 'rgba(255,92,106,0.25)'}`,
                  gap: isSmallMobile ? 8 : 0,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    gap: isMobile ? 10 : 12, flex: 1
                  }}>
                    <span style={{ fontSize: isMobile ? 18 : 20 }}>
                      {t.type === 'payment' ? '💵' : '🧾'}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontWeight: 600, fontSize: isMobile ? 13 : 13,
                        color: 'var(--text)', whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>{t.title}</div>
                      <div style={{
                        fontSize: isMobile ? 11 : 11, color: 'var(--text-muted)',
                        display: 'flex', gap: 6, flexWrap: 'wrap'
                      }}>
                        {t.dividedAmong && <span>Split {t.dividedAmong.length} ways</span>}
                        {t.member?.name && <span>• {t.member.name}</span>}
                        <span>• {format(new Date(t.date), 'MMM d')}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontWeight: 700, fontSize: isMobile ? 14 : 14,
                    color: t.type === 'payment' ? 'var(--accent)' : 'var(--red)',
                    textAlign: 'right',
                    paddingLeft: isSmallMobile ? 28 : 0,
                  }}>
                    {t.type === 'payment' ? '+' : '-'}Rs. {t.amount?.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;