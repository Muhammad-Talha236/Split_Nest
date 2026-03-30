import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { balanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import { Avatar } from '../components/Layout';
import { AVATAR_COLORS, alpha } from '../theme';

const COLORS = AVATAR_COLORS;

const formatCurrency = (amount) => `Rs. ${Math.abs(Number(amount || 0)).toLocaleString()}`;
const formatSignedCurrency = (amount) => `${Number(amount || 0) >= 0 ? '+' : '-'}Rs. ${Math.abs(Number(amount || 0)).toLocaleString()}`;

const StatCard = ({ label, value, hint, tone = 'default', valueVariant = 'metric' }) => (
  <div className={`balances-stat balances-stat--${tone}`}>
    <div className="balances-stat__label">{label}</div>
    <div className={`balances-stat__value ${valueVariant === 'text' ? 'balances-stat__value--text' : ''}`}>{value}</div>
    {hint && <div className="balances-stat__hint">{hint}</div>}
  </div>
);

const NoGroup = () => (
  <div className="members-empty balances-empty">
    <div className="members-empty__glow" />
    <div className="members-empty__icon">LEDGER</div>
    <h3 className="members-empty__title">No Active Group</h3>
    <p className="members-empty__text">Select or join a group to view balances and settlement details.</p>
    <Link to="/groups" style={{ textDecoration: 'none' }}>
      <button className="members-btn members-btn--primary" type="button">
        Browse Groups -&gt;
      </button>
    </Link>
  </div>
);

const MemberBalanceCard = ({ member, index }) => {
  const accent = COLORS[index % COLORS.length];
  const balance = Number(member.balance || 0);
  const isSettled = balance === 0;
  const owes = balance < 0;
  const tone = isSettled ? 'positive' : owes ? 'danger' : 'info';
  const statusText = isSettled ? 'Clear' : owes ? 'Pending payment' : 'In credit';
  const nextStepText = isSettled ? 'No action needed' : owes ? 'Collect from member' : 'Offset in next cycle';
  const amountLabel = isSettled ? 'Current position' : owes ? 'Amount due to admin' : 'Credit balance';
  return (
    <article
      className={`balance-member-card balance-member-card--${tone}`}
      style={{
        '--balance-member-accent': accent,
        '--balance-member-accent-soft': alpha(accent, 16),
        '--balance-member-accent-wash': alpha(accent, 8),
      }}
    >
      <div className="balance-member-card__header">
        <div className="balance-member-card__identity">
          <Avatar name={member.name} size={48} color={accent} />
          <div className="balance-member-card__copy">
            <h4 className="balance-member-card__name">{member.name}</h4>
          </div>
        </div>
        <span className={`balance-member-card__status balance-member-card__status--${tone}`}>
          {isSettled ? 'Settled' : owes ? 'Needs payment' : 'In credit'}
        </span>
      </div>

      <div className={`balance-member-card__amount balance-member-card__amount--${tone}`}>
        <div className="balance-member-card__amount-label">{amountLabel}</div>
        <div className="balance-member-card__amount-value">{formatSignedCurrency(balance)}</div>
      </div>

      <div className="balance-member-card__meta">
        <div className="balance-member-card__meta-item">
          <span className="balance-member-card__meta-label">Status</span>
          <span className="balance-member-card__meta-value">{statusText}</span>
        </div>
        <div className="balance-member-card__meta-item">
          <span className="balance-member-card__meta-label">Next Step</span>
          <span className="balance-member-card__meta-value">{nextStepText}</span>
        </div>
      </div>
    </article>
  );
};

const BalancesPage = () => {
  const { user, activeGroupId, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeGroupId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    balanceAPI.getBalances(activeGroupId)
      .then((res) => setData(res.data))
      .catch(() => toast.error('Failed to load balances'))
      .finally(() => setLoading(false));
  }, [activeGroupId]);

  const members = data?.members || [];
  const summary = data?.summary || {};
  const settlements = data?.settlements || [];

  const memberView = useMemo(() => {
    const currentMember = members[0] || user || {};
    const balance = Number(currentMember.balance || user?.balance || 0);
    const settled = balance === 0;
    const owes = balance < 0;

    return {
      currentMember,
      balance,
      settled,
      owes,
      tone: settled ? 'positive' : owes ? 'danger' : 'info',
      statusLabel: settled ? 'Settled' : owes ? 'Outstanding' : 'In Credit',
      directionLabel: settled ? 'No dues' : owes ? 'You -> Admin' : 'Admin -> You',
      helperText: settled
        ? 'You are all clear in this group.'
        : owes
          ? `You need to pay ${formatCurrency(balance)} to the admin.`
          : `You currently have ${formatCurrency(balance)} in credit.`,
    };
  }, [members, user]);

  const adminView = useMemo(() => {
    const nonAdmins = members.filter((member) => member.role !== 'admin');
    const settledCount = nonAdmins.filter((member) => Number(member.balance || 0) === 0).length;
    const outstandingCount = nonAdmins.filter((member) => Number(member.balance || 0) < 0).length;
    const creditCount = nonAdmins.filter((member) => Number(member.balance || 0) > 0).length;

    return {
      nonAdmins,
      settledCount,
      outstandingCount,
      creditCount,
      totalReceivable: Number(summary.totalReceivable || 0),
      adminShareRemaining: Number(summary.adminShareStats?.remaining || 0),
    };
  }, [members, summary]);

  if (!activeGroupId) return <NoGroup />;
  if (loading) return <Spinner message="Loading balances..." />;

  if (!isAdmin) {
    const { currentMember, balance, settled, owes, tone, statusLabel, directionLabel, helperText } = memberView;
    const heroAccent = owes ? 'danger' : settled ? 'positive' : 'info';

    return (
      <div className="balances-page">
        <section className={`balances-hero balances-hero--${heroAccent}`}>
          <div className="balances-hero__bg balances-hero__bg--left" />
          <div className="balances-hero__bg balances-hero__bg--right" />

          <div className="balances-hero__content">
            <div className="balances-hero__copy">
              <div className="balances-hero__eyebrow">Personal Balance</div>
              <h2 className="balances-hero__title">My Balance</h2>

              <div className="balances-hero__meta">
                <span className={`balances-chip balances-chip--${tone}`}>{statusLabel}</span>
                <span className="balances-chip">{directionLabel}</span>
                <span className="balances-chip">{formatCurrency(balance)}</span>
              </div>
            </div>

            <div className={`balances-hero__spotlight balances-hero__spotlight--${tone}`}>
              <Avatar name={currentMember?.name || user?.name || '?'} size={56} color={owes ? 'var(--red)' : settled ? 'var(--accent)' : 'var(--blue)'} />
              <div className="balances-hero__spotlight-copy">
                <div className="balances-hero__spotlight-name">{currentMember?.name || user?.name}</div>
                <div className="balances-hero__spotlight-value">{formatSignedCurrency(balance)}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="balances-stats-grid">
          <StatCard label="Status" value={statusLabel} tone={tone} valueVariant="text" />
          <StatCard label="Amount" value={formatCurrency(balance)} tone={tone} />
          <StatCard label="Direction" value={directionLabel} tone="default" valueVariant="text" />
        </section>

        <section className="balances-section balances-section--focus">
          <div className={`balances-focus balances-focus--${tone}`}>
            <div>
              <div className="balances-focus__label">Summary</div>
              <h3 className="balances-focus__title">{helperText}</h3>
              <p className="balances-focus__copy">
                {settled
                  ? 'No action is required right now.'
                  : owes
                    ? 'Pay the admin and ask them to record the payment from the payments page.'
                    : 'Your balance can be adjusted in the next settlement or expense cycle.'}
              </p>
            </div>

            <div className="balances-focus__panel">
              <div className="balances-focus__panel-label">Current Position</div>
              <div className="balances-focus__panel-value">{formatSignedCurrency(balance)}</div>
              <div className="balances-focus__panel-note">
                {settled ? 'Fully cleared' : owes ? 'Pending payment' : 'Credit available'}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const { nonAdmins, settledCount, outstandingCount, creditCount, totalReceivable, adminShareRemaining } = adminView;
  return (
    <div className="balances-page">
      <section className="balances-hero">
        <div className="balances-hero__bg balances-hero__bg--left" />
        <div className="balances-hero__bg balances-hero__bg--right" />

        <div className="balances-hero__content">
          <div className="balances-hero__copy">
            <div className="balances-hero__eyebrow">Group Ledger</div>
            <h2 className="balances-hero__title">Balances</h2>

            <div className="balances-hero__meta">
              <span className="balances-chip balances-chip--positive">{nonAdmins.length} members</span>
              <span className="balances-chip balances-chip--danger">{outstandingCount} outstanding</span>
              <span className="balances-chip balances-chip--info">{settledCount} settled</span>
              {creditCount > 0 && <span className="balances-chip">{creditCount} in credit</span>}
            </div>
          </div>

          <div className="balances-hero__summary">
            <div className="balances-hero__summary-label">Total Receivable</div>
            <div className="balances-hero__summary-value">{formatCurrency(totalReceivable)}</div>
          </div>
        </div>
      </section>

      <section className="balances-stats-grid">
        <StatCard label="Total Receivable" value={formatCurrency(totalReceivable)} tone="positive" />
        <StatCard label="Outstanding" value={outstandingCount} tone="danger" />
        <StatCard label="Settled" value={settledCount} tone="info" />
        <StatCard label="Admin Share Left" value={formatCurrency(adminShareRemaining)} tone={adminShareRemaining > 0 ? 'warning' : 'default'} />
      </section>

      <section className="balances-section">
        <div className="balances-section__header">
          <div>
            <h3 className="balances-section__title">Member Balances</h3>
          </div>
          <div className="balances-section__hint">{outstandingCount} pending</div>
        </div>

        <div className="balances-members-grid">
          {nonAdmins.map((member, index) => (
            <MemberBalanceCard key={member._id} member={member} index={index} />
          ))}
        </div>
      </section>

      <section className="balances-section">
        <div className="balances-section__header">
          <div>
            <h3 className="balances-section__title">Settlement Plan</h3>
          </div>
          <div className="balances-section__hint">{settlements.length} transfers</div>
        </div>

        {settlements.length > 0 ? (
          <div className="balances-settlement-list">
            {settlements.map((settlement, index) => (
              <article key={`${settlement.fromId || settlement.from}-${index}`} className="balances-settlement-item">
                <div className="balances-settlement-item__parties">
                  <div className="balances-settlement-party balances-settlement-party--from">
                    <div className="balances-settlement-party__label">From</div>
                    <div className="balances-settlement-party__name">{settlement.from}</div>
                  </div>

                  <div className="balances-settlement-item__connector" aria-hidden="true">
                    <span className="balances-settlement-item__line" />
                    <span className="balances-settlement-item__arrow">-&gt;</span>
                    <span className="balances-settlement-item__line" />
                  </div>

                  <div className="balances-settlement-party balances-settlement-party--to">
                    <div className="balances-settlement-party__label">To</div>
                    <div className="balances-settlement-party__name">{settlement.to}</div>
                  </div>
                </div>
                <div className="balances-settlement-item__amount">{formatCurrency(settlement.amount)}</div>
              </article>
            ))}
          </div>
        ) : (
          <div className="balances-settled-empty">
            <div className="balances-settled-empty__title">Everyone is settled</div>
            <div className="balances-settled-empty__copy">No transfers are needed at the moment.</div>
          </div>
        )}
      </section>
    </div>
  );
};

export default BalancesPage;
