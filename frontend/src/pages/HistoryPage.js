// pages/HistoryPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { balanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'expense', label: 'Expenses' },
  { key: 'payment', label: 'Member Payments' },
  { key: 'self', label: 'My Share' },
];

const NoGroup = () => (
  <section className="history-empty-group">
    <div className="history-empty-group__icon">LOG</div>
    <h3 className="history-empty-group__title">No Active Group</h3>
    <p className="history-empty-group__text">Select or join a group to view transaction history.</p>
    <Link to="/groups" style={{ textDecoration: 'none' }}>
      <button type="button" className="history-empty-group__cta">
        Browse Groups
      </button>
    </Link>
  </section>
);

const HistoryPage = () => {
  const { activeGroupId } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filter, setFilter] = useState('all');

  const load = useCallback(async (page = 1) => {
    if (!activeGroupId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await balanceAPI.getHistory(activeGroupId, { page, limit: 15, type: filter });
      setHistory(res.data.history || []);
      setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [activeGroupId, filter]);

  useEffect(() => {
    load(1);
  }, [load]);

  if (!activeGroupId) return <NoGroup />;

  return (
    <div className="history-page">
      <section className="history-hero">
        <div className="history-hero__left">
          <span className="history-hero__eyebrow">AUDIT TRAIL</span>
          <h2 className="history-hero__title">Transaction History</h2>
          <p className="history-hero__subtitle">
            Full ledger for your group. Descriptions auto-clear after 21 days.
          </p>
          <div className="history-hero__chips">
            <span className="history-chip">{pagination.total} total</span>
            <span className="history-chip history-chip--soft">Page {pagination.page} of {pagination.pages}</span>
          </div>
        </div>
        <div className="history-hero__right">
          <div className="history-hero__stat-label">Visible Entries</div>
          <div className="history-hero__stat-value">{history.length}</div>
          <div className="history-hero__stat-meta">Current page window</div>
        </div>
      </section>

      <section className="history-filter">
        {FILTERS.map(item => (
          <button
            key={item.key}
            type="button"
            className={`history-filter__tab ${filter === item.key ? 'history-filter__tab--active' : ''}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </section>

      {loading ? (
        <Spinner message="Loading history..." />
      ) : history.length === 0 ? (
        <div className="history-empty">
          <EmptyState
            icon="history"
            title="No transactions found"
            message="Transactions will appear here once you start adding expenses and payments."
          />
        </div>
      ) : (
        <>
          <section className="history-list">
            {history.map(item => {
              const isSelfShare = item.isAdminSelfPayment === true;
              const isPayment = item.type === 'payment';

              const tone = isSelfShare ? 'self' : isPayment ? 'payment' : 'expense';
              const amountPrefix = isPayment ? '+' : '-';
              const toneLabel = isSelfShare ? 'My share' : isPayment ? 'Payment' : 'Expense';
              const badgeLabel = isSelfShare ? 'ME' : isPayment ? 'IN' : 'EX';
              const formattedDate = format(new Date(item.date), 'MMM d, yyyy');
              const splitLabel = item.type === 'expense'
                ? (item.splitMode === 'percentage' ? 'Percentage split' : 'Equal split')
                : null;
              const sourceLabel = item.member && !item.dividedAmong ? `From ${item.member.name}` : null;
              const hasTags = Boolean(item.category || item.paymentMethod || splitLabel);
              const hasNote = Boolean(item.description || sourceLabel);

              return (
                <article key={item._id} className={`history-card history-card--${tone}`}>
                  <div className="history-card__rail" />
                  <div className="history-card__inner">
                    <div className="history-card__top">
                      <div className={`history-card__badge history-card__badge--${tone}`}>{badgeLabel}</div>
                      <div className="history-card__main">
                        <div className="history-card__header">
                          <span className={`history-card__eyebrow history-card__eyebrow--${tone}`}>{toneLabel}</span>
                          <h3 className="history-card__title">{item.title}</h3>
                        </div>
                        {hasNote && (
                          <div className="history-card__note">
                            {item.description && (
                              <div className="history-card__description">{item.description}</div>
                            )}
                            {sourceLabel && (
                              <div className="history-card__note-meta">{sourceLabel}</div>
                            )}
                          </div>
                        )}
                        {!hasNote && (
                          <div className="history-card__note history-card__note--empty" />
                        )}
                      </div>
                      <div className="history-card__side">
                        <div className={`history-card__amount-box history-card__amount-box--${tone}`}>
                          <div className={`history-card__amount history-card__amount--${tone}`}>
                            {amountPrefix}Rs. {Number(item.amount || 0).toLocaleString()}
                          </div>
                          <div className="history-card__date">{formattedDate}</div>
                        </div>
                        {hasTags && (
                          <div className="history-card__side-tags">
                            {splitLabel && (
                              <span className="history-tag history-tag--warn">{splitLabel}</span>
                            )}
                            {item.paymentMethod && (
                              <span className={`history-tag history-tag--${tone}`}>
                                {item.paymentMethod.replace('_', ' ')}
                              </span>
                            )}
                            {item.category && (
                              <span className="history-tag history-tag--muted">{item.category}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <Pagination current={pagination.page} total={pagination.pages} onChange={load} />
        </>
      )}
    </div>
  );
};

export default HistoryPage;
