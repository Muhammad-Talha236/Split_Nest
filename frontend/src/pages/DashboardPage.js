import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { expenseAPI, balanceAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Spinner from '../components/Spinner';
import { Avatar } from '../components/Layout';
import { format } from 'date-fns';
import { AVATAR_COLORS } from '../theme';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'var(--primary)' }}>Rs. {payload[0].value?.toLocaleString()}</div>
    </div>
  );
};

const NoGroup = () => (
  <div style={{ textAlign: 'center', padding: '60px 24px' }}>
    <div style={{ fontSize: 64, marginBottom: 20 }}>Home</div>
    <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, color: 'var(--text)', fontSize: 24, margin: '0 0 12px' }}>
      No Active Group
    </h2>
    <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 28, maxWidth: 360, margin: '0 auto 28px' }}>
      You are not part of any group yet. Create a new group or join an existing one to start tracking expenses.
    </p>
    <Link to="/groups">
      <button
        style={{
          padding: '12px 32px',
          borderRadius: 12,
          border: 'none',
          background: 'var(--button-primary-gradient)',
          color: 'var(--button-primary-text)',
          fontWeight: 800,
          fontSize: 15,
          cursor: 'pointer',
          boxShadow: 'var(--shadow)',
        }}
      >
        Browse Groups
      </button>
    </Link>
  </div>
);

const MemberDashboard = ({ user, stats, history, navigate }) => {
  const myBalance = user?.balance ?? 0;
  const firstName = user?.name?.split(' ')[0] || 'Member';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const weeklyChart = stats?.weeklyChart || [];
  const weeklyTotal = weeklyChart.reduce((sum, day) => sum + (day.amount || 0), 0);
  const paymentCount = history.filter((item) => item.type === 'payment').length;
  const expenseCount = history.filter((item) => item.type === 'expense').length;
  const recentHistory = history.slice(0, 4);
  const [typedName, setTypedName] = useState('');

  useEffect(() => {
    let timeoutId;
    let charIndex = 0;

    const typeName = () => {
      setTypedName(firstName.slice(0, charIndex));

      if (charIndex <= firstName.length) {
        charIndex += 1;
        timeoutId = setTimeout(typeName, 140);
        return;
      }

      timeoutId = setTimeout(() => {
        charIndex = 0;
        setTypedName('');
        typeName();
      }, 1200);
    };

    typeName();

    return () => clearTimeout(timeoutId);
  }, [firstName]);

  const tone =
    myBalance < 0
      ? {
          className: 'member-dash-hero--negative',
          badge: 'Outstanding',
          label: 'Amount You Owe',
          note: `Please settle Rs. ${Math.abs(myBalance).toLocaleString()} with admin to clear dues.`,
        }
      : myBalance > 0
      ? {
          className: 'member-dash-hero--positive',
          badge: 'In Credit',
          label: 'Your Balance',
          note: 'You are in a positive position and can offset upcoming group expenses.',
        }
      : {
          className: 'member-dash-hero--settled',
          badge: 'Settled',
          label: 'Your Balance',
          note: 'Great work. Your account is fully balanced right now.',
        };

  return (
    <div className="member-dash">
      <section className={`member-dash-hero ${tone.className}`}>
        <div className="member-dash-hero__left">
          <p className="member-dash-hero__eyebrow">Overview</p>
          <h1 className="member-dash-hero__title">
            <span className="member-dash-hero__title-text">Good {greeting},</span>
            <span className="member-dash-hero__name" aria-label={firstName}>
              {typedName}
              <span className="member-dash-hero__caret" />
            </span>
          </h1>
          <div className="member-dash-hero__chips">
            <span className="member-dash-chip member-dash-chip--accent">Rs. {weeklyTotal.toLocaleString()} this week</span>
            <span className="member-dash-chip">{history.length} records</span>
            <span className="member-dash-chip member-dash-chip--muted">{tone.badge}</span>
          </div>
        </div>

        <div className="member-dash-hero__balance-card">
          <span className="member-dash-hero__balance-label">{tone.label}</span>
          <div className={`member-dash-hero__balance-value ${myBalance < 0 ? 'member-dash-hero__balance-value--negative' : ''}`}>
            {myBalance >= 0 ? '+' : ''}Rs. {myBalance.toLocaleString()}
          </div>
          <div className="member-dash-hero__actions">
            <button className="member-dash-btn member-dash-btn--primary" onClick={() => navigate('/balances')}>
              View Balances
            </button>
            <button className="member-dash-btn member-dash-btn--ghost" onClick={() => navigate('/payments')}>
              Open Payments
            </button>
          </div>
        </div>
      </section>

      <section className="member-dash-kpis">
        <div className="member-dash-kpi member-dash-kpi--green">
          <div className="member-dash-kpi__label">My Expenses</div>
          <div className="member-dash-kpi__value">{expenseCount}</div>
          <div className="member-dash-kpi__hint">Shared charges recorded</div>
        </div>
        <div className="member-dash-kpi member-dash-kpi--blue">
          <div className="member-dash-kpi__label">Payments Made</div>
          <div className="member-dash-kpi__value">{paymentCount}</div>
          <div className="member-dash-kpi__hint">Entries paid to admin</div>
        </div>
        <div className="member-dash-kpi member-dash-kpi--violet">
          <div className="member-dash-kpi__label">Weekly Total</div>
          <div className="member-dash-kpi__value">Rs. {weeklyTotal.toLocaleString()}</div>
          <div className="member-dash-kpi__hint">Group expense volume</div>
        </div>
      </section>

      <section className="member-dash-content">
        <article className="member-dash-panel member-dash-panel--chart">
          <div className="member-dash-panel__head">
            <div>
              <div className="member-dash-panel__title">Weekly Overview</div>
              <div className="member-dash-panel__subtitle">Last 7 days of spending</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={weeklyChart} barSize={28}>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(46,204,154,.08)' }} />
              <Bar dataKey="amount" fill="url(#memberDashBarGrad)" radius={[7, 7, 2, 2]} />
              <defs>
                <linearGradient id="memberDashBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3AEEB7" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#1A8F6B" stopOpacity={0.5} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="member-dash-panel member-dash-panel--history">
          <div className="member-dash-panel__head">
            <div>
              <div className="member-dash-panel__title">Recent Activity</div>
              <div className="member-dash-panel__subtitle">Latest updates from your account</div>
            </div>
            <button className="member-dash-link" onClick={() => navigate('/history')}>
              View all
            </button>
          </div>

          {recentHistory.length === 0 ? (
            <div className="member-dash-empty">No transactions yet</div>
          ) : (
            <div className="member-dash-history-list">
              {recentHistory.map((entry, index) => {
                const amount = Number(entry.amount || 0);
                const isPayment = entry.type === 'payment';
                const splitLabel =
                  entry.type === 'expense' ? (entry.splitMode === 'percentage' ? 'Percentage split' : 'Equal split') : 'Payment entry';
                return (
                  <div key={index} className={`member-dash-history-item ${isPayment ? 'member-dash-history-item--payment' : 'member-dash-history-item--expense'}`}>
                    <div className="member-dash-history-item__left">
                      <span className="member-dash-history-item__dot">{isPayment ? 'P' : 'E'}</span>
                      <div className="member-dash-history-item__content">
                        <div className="member-dash-history-item__title">{entry.title}</div>
                        <div className="member-dash-history-item__meta">
                          {format(new Date(entry.date), 'MMM d, yyyy')} - {splitLabel}
                        </div>
                      </div>
                    </div>
                    <div className={`member-dash-history-item__amount ${isPayment ? 'is-positive' : 'is-negative'}`}>
                      {isPayment ? '+' : '-'}Rs. {amount.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </div>
  );
};

const AdminDashboard = ({ user, stats, history, navigate }) => {
  const adminBalance = user?.balance ?? 0;
  const totalReceivable = stats?.totalReceivable || 0;
  const adminShareStats = stats?.adminShareStats || null;
  const firstName = user?.name?.split(' ')[0] || 'Admin';
  const monthlyTotal = stats?.monthlyTotal || 0;
  const totalMembers = stats?.totalMembers || 0;
  const memberBalances = stats?.memberBalances || [];
  const categoryData = stats?.categoryData || [];
  const recentTransactions = history.slice(0, 5);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const collectionRate = adminShareStats?.totalOwed ? Math.round((adminShareStats.totalPaid / adminShareStats.totalOwed) * 100) : 100;
  const totalCategoryAmount = categoryData.reduce((sum, current) => sum + current.total, 0);
  const balanceTone = adminBalance > 0 ? 'positive' : adminBalance < 0 ? 'negative' : 'neutral';

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chartData = weekDays.map((day, idx) => {
    const found = stats?.weeklyData?.find((d) => d._id === idx + 1);
    return { day, amount: found?.total || 0 };
  });

  const [typedName, setTypedName] = useState('');

  useEffect(() => {
    let timeoutId;
    let charIndex = 0;

    const typeName = () => {
      setTypedName(firstName.slice(0, charIndex));

      if (charIndex <= firstName.length) {
        charIndex += 1;
        timeoutId = setTimeout(typeName, 140);
        return;
      }

      timeoutId = setTimeout(() => {
        charIndex = 0;
        setTypedName('');
        typeName();
      }, 1200);
    };

    typeName();

    return () => clearTimeout(timeoutId);
  }, [firstName]);

  const adminSummaryCards = [
    {
      label: 'Members owe me',
      value: `Rs. ${Math.abs(adminBalance).toLocaleString()}`,
      detail: adminBalance >= 0 ? 'Pending recovery from members' : 'You are ahead on collections',
      tone: balanceTone,
    },
    {
      label: 'Monthly expenses',
      value: `Rs. ${monthlyTotal.toLocaleString()}`,
      detail: 'Total shared spending this month',
      tone: 'blue',
    },
    {
      label: 'Receivable',
      value: `Rs. ${totalReceivable.toLocaleString()}`,
      detail: totalReceivable > 0 ? 'Outstanding amounts in queue' : 'Nothing waiting right now',
      tone: 'amber',
    },
    {
      label: 'Active members',
      value: totalMembers.toLocaleString(),
      detail: 'People participating in this group',
      tone: 'violet',
    },
  ];

  return (
    <div className="admin-dash">
      <section className={`admin-dash-hero admin-dash-hero--${balanceTone}`}>
        <div className="admin-dash-hero__main">
          <p className="admin-dash-hero__eyebrow">Admin Control</p>
          <h1 className="admin-dash-hero__title">
            <span className="admin-dash-hero__title-text">Good {greeting},</span>
            <span className="admin-dash-hero__name" aria-label={firstName}>
              {typedName}
              <span className="admin-dash-hero__caret" />
            </span>
          </h1>
          <div className="admin-dash-hero__meta">
            <span className="admin-dash-pill admin-dash-pill--accent">{format(new Date(), 'EEEE, d MMM yyyy')}</span>
            <span className="admin-dash-pill">{totalMembers} members</span>
            <span className="admin-dash-pill">{history.length} live records</span>
          </div>

          <div className="admin-dash-hero__actions">
            <button className="admin-dash-btn admin-dash-btn--primary" onClick={() => navigate('/payments')}>
              Manage Payments
            </button>
            <button className="admin-dash-btn admin-dash-btn--secondary" onClick={() => navigate('/balances')}>
              Check Balances
            </button>
          </div>
        </div>

        <div className="admin-dash-hero__aside">
          <article className="admin-dash-spotlight admin-dash-spotlight--blue">
            <span className="admin-dash-spotlight__label">Monthly Spend</span>
            <strong className="admin-dash-spotlight__value">Rs. {monthlyTotal.toLocaleString()}</strong>
            <span className="admin-dash-spotlight__note">Shared expenses added this month</span>
          </article>

          <article className="admin-dash-spotlight admin-dash-spotlight--amber">
            <span className="admin-dash-spotlight__label">Collection Rate</span>
            <strong className="admin-dash-spotlight__value">{collectionRate}%</strong>
            <span className="admin-dash-spotlight__note">
              {adminShareStats?.totalOwed ? 'Based on your personal share payments' : 'No personal share due right now'}
            </span>
          </article>
        </div>
      </section>

      <section className="admin-dash-summary">
        {adminSummaryCards.map((card) => (
          <article key={card.label} className={`admin-dash-summary-card admin-dash-summary-card--${card.tone}`}>
            <span className="admin-dash-summary-card__label">{card.label}</span>
            <strong className="admin-dash-summary-card__value">
              {typeof card.value === 'string' && card.value.startsWith('Rs. ') ? (
                <>
                  <span className="admin-dash-summary-card__currency">Rs.</span>
                  <span>{card.value.slice(4)}</span>
                </>
              ) : (
                card.value
              )}
            </strong>
          </article>
        ))}
      </section>

      <section className="admin-dash-columns">
        <div className="admin-dash-stack admin-dash-stack--main">
          <article className="admin-dash-card admin-dash-card--chart">
            <div className="admin-dash-card__head">
              <div>
                <div className="admin-dash-card__title">Expense Rhythm</div>
                <div className="admin-dash-card__subtitle">Seven-day spending pattern across the group</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(91,141,239,.08)' }} />
                <Bar dataKey="amount" fill="url(#adminDashBarGrad)" radius={[8, 8, 3, 3]} />
                <defs>
                  <linearGradient id="adminDashBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#78B0FF" stopOpacity={0.92} />
                    <stop offset="100%" stopColor="#2ECC9A" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </article>

          <article className="admin-dash-card admin-dash-card--balances">
            <div className="admin-dash-card__head">
              <div>
                <div className="admin-dash-card__title">Balance Board</div>
                <div className="admin-dash-card__subtitle">Quick view of each member position</div>
              </div>
              <button className="admin-dash-link admin-dash-link--members" onClick={() => navigate('/members')}>
                View all members
              </button>
            </div>

            <div className="admin-dash-balance-list">
              {memberBalances.slice(0, 3).map((member, idx) => {
                const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                return (
                  <div key={member._id || idx} className="admin-dash-balance-row">
                    <div className="admin-dash-balance-row__left">
                      <Avatar name={member.name} size={34} color={color} />
                      <div className="admin-dash-balance-row__content">
                        <div className="admin-dash-balance-row__name">{member.name}</div>
                        <div className="admin-dash-balance-row__role">{member.role}</div>
                      </div>
                    </div>
                    <div className={`admin-dash-balance-row__amount ${member.balance >= 0 ? 'is-positive' : 'is-negative'}`}>
                      {member.balance >= 0 ? '+' : ''}Rs. {member.balance?.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </div>

        <div className="admin-dash-stack admin-dash-stack--side">
          {adminShareStats && adminShareStats.totalOwed > 0 && (
            <article className="admin-dash-card admin-dash-card--tracker">
              <div className="admin-dash-card__head">
                <div>
                  <div className="admin-dash-card__title">My Share Tracker</div>
                </div>
              </div>

              <div className="admin-dash-tracker-stats">
                {[
                  ['Total owed', adminShareStats.totalOwed],
                  ['Paid', adminShareStats.totalPaid],
                  ['Remaining', adminShareStats.remaining],
                ].map(([label, value]) => (
                  <div key={label} className="admin-dash-tracker-stat">
                    <span className="admin-dash-tracker-stat__label">{label}</span>
                    <strong className="admin-dash-tracker-stat__value">Rs. {Number(value).toLocaleString()}</strong>
                  </div>
                ))}
              </div>

              {adminShareStats.remaining > 0 && (
                <button className="admin-dash-btn admin-dash-btn--secondary admin-dash-btn--block" onClick={() => navigate('/payments')}>
                  Pay My Share
                </button>
              )}
            </article>
          )}

          {categoryData.length > 0 && (
            <article className="admin-dash-card admin-dash-card--categories">
              <div className="admin-dash-card__head">
                <div>
                  <div className="admin-dash-card__title">Top Categories</div>
                  <div className="admin-dash-card__subtitle">Where most of the money is going</div>
                </div>
              </div>

              <div className="admin-dash-category-list">
                {categoryData.slice(0, 5).map((category, idx) => {
                  const pct = totalCategoryAmount ? Math.round((category.total / totalCategoryAmount) * 100) : 0;
                  return (
                    <div key={category._id || idx} className="admin-dash-category-row">
                      <div className="admin-dash-category-row__top">
                        <span className="admin-dash-category-row__name">{category._id}</span>
                        <span className="admin-dash-category-row__value">
                          Rs. {category.total?.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="admin-dash-category-row__track">
                        <div
                          className="admin-dash-category-row__fill"
                          style={{ width: `${pct}%`, background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          )}
        </div>
      </section>

      <article className="admin-dash-card admin-dash-card--history">
        <div className="admin-dash-card__head">
          <div>
            <div className="admin-dash-card__title">Recent Transactions</div>
            <div className="admin-dash-card__subtitle">Latest payment and expense activity</div>
          </div>
          <button className="admin-dash-link" onClick={() => navigate('/history')}>
            Open history
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="admin-dash-empty">No transactions yet</div>
        ) : (
          <div className="admin-dash-activity-list">
            {recentTransactions.map((tx, idx) => {
              const isAdminSelf = tx.isAdminSelfPayment === true;
              const isPayment = tx.type === 'payment';
              const toneClass = isAdminSelf ? 'is-admin' : isPayment ? 'is-payment' : 'is-expense';

              return (
                <div key={idx} className={`admin-dash-activity-row ${toneClass}`}>
                  <div className="admin-dash-activity-row__left">
                    <span className="admin-dash-activity-row__badge">{isAdminSelf ? 'A' : isPayment ? 'P' : 'E'}</span>
                    <div className="admin-dash-activity-row__content">
                      <div className="admin-dash-activity-row__title">{tx.title}</div>
                      <div className="admin-dash-activity-row__meta">
                        {tx.dividedAmong && <span>{tx.splitMode === 'percentage' ? 'Percentage split' : `Split ${tx.dividedAmong.length} ways`} - </span>}
                        {tx.member?.name && <span>{tx.member.name} - </span>}
                        {format(new Date(tx.date), 'MMM d')}
                      </div>
                    </div>
                  </div>
                  <div className={`admin-dash-activity-row__amount ${isPayment ? 'is-positive' : 'is-negative'}`}>
                    {isPayment ? '+' : '-'}Rs. {tx.amount?.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>
    </div>
  );
};

const DashboardPage = () => {
  const { user, activeGroupId, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeGroupId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const [statsRes, histRes] = await Promise.all([expenseAPI.getStats(activeGroupId), balanceAPI.getHistory(activeGroupId, { page: 1, limit: 5 })]);

        const raw = statsRes.data.stats;
        const weekDaysFull = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyChart = weekDaysFull.map((day, idx) => {
          const found = raw?.weeklyData?.find((d) => d._id === idx + 1);
          return { day, amount: found?.total || 0 };
        });

        setStats({ ...raw, weeklyChart });
        setHistory(histRes.data.history);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [activeGroupId]);

  if (loading) return <Spinner message="Loading dashboard..." />;

  const firstName = user?.name?.split(' ')[0] || 'Member';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const showSharedHeader = !activeGroupId;

  return (
    <div>
      {showSharedHeader && (
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 24, color: 'var(--text)', margin: 0, letterSpacing: -0.5 }}>
            Good {greeting}, {firstName}
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 13 }}>{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
      )}

      {!activeGroupId ? (
        <NoGroup />
      ) : isAdmin ? (
        <AdminDashboard user={user} stats={stats} history={history} navigate={navigate} />
      ) : (
        <MemberDashboard user={user} stats={stats} history={history} navigate={navigate} />
      )}
    </div>
  );
};

export default DashboardPage;
