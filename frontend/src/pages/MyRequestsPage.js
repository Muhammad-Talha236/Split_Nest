// pages/MyRequestsPage.js - Member sees their sent requests
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { groupAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

const MyRequestsPage = () => {
  const { switchGroup } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    groupAPI.getMyRequests()
      .then(res => setRequests(res.data.requests || []))
      .catch(() => toast.error('Failed to load requests'))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => ({
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }), [requests]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return requests;
    return requests.filter(r => r.status === activeFilter);
  }, [activeFilter, requests]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!mobileMenuRef.current?.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [mobileMenuOpen]);

  const statusClass = (status) => {
    if (status === 'accepted') return 'my-request-card--accepted';
    if (status === 'rejected') return 'my-request-card--rejected';
    return 'my-request-card--pending';
  };

  const activeFilterMeta = FILTERS.find((filter) => filter.key === activeFilter) || FILTERS[0];

  if (loading) return <Spinner message="Loading your requests..." />;

  return (
    <div className="my-requests-page">
      <section className="my-requests-hero">
        <div className="my-requests-hero__left">
          <span className="my-requests-hero__eyebrow">TRACKER</span>
          <h2 className="my-requests-hero__title">My Join Requests</h2>
          <p className="my-requests-hero__subtitle">Follow every request from sent to approved or rejected.</p>
          <div className="my-requests-hero__chips">
            <span className="my-requests-chip my-requests-chip--pending">{counts.pending} pending</span>
            <span className="my-requests-chip my-requests-chip--accepted">{counts.accepted} accepted</span>
            <span className="my-requests-chip my-requests-chip--rejected">{counts.rejected} rejected</span>
          </div>
        </div>
        <div className="my-requests-hero__stat">
          <div className="my-requests-hero__stat-label">Total Sent</div>
          <div className="my-requests-hero__stat-value">{counts.all}</div>
        </div>
      </section>

      <section className="my-requests-filter">
        <div ref={mobileMenuRef} className="my-requests-filter__dropdown">
          <button
            type="button"
            className="my-requests-filter__trigger"
            onClick={() => setMobileMenuOpen((current) => !current)}
            aria-expanded={mobileMenuOpen}
            aria-label="Filter your requests by status"
          >
            <span>{`${activeFilterMeta.label} (${counts[activeFilterMeta.key]})`}</span>
            <span className={`my-requests-filter__chevron ${mobileMenuOpen ? 'my-requests-filter__chevron--open' : ''}`} />
          </button>
          {mobileMenuOpen && (
            <div className="my-requests-filter__menu">
              {FILTERS.map(filter => (
                <button
                  key={filter.key}
                  type="button"
                  className={`my-requests-filter__option ${activeFilter === filter.key ? 'my-requests-filter__option--active' : ''}`}
                  onClick={() => {
                    setActiveFilter(filter.key);
                    setMobileMenuOpen(false);
                  }}
                >
                  <span>{`${filter.label} (${counts[filter.key]})`}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {FILTERS.map(filter => (
          <button
            key={filter.key}
            type="button"
            className={`my-requests-filter__tab ${activeFilter === filter.key ? 'my-requests-filter__tab--active' : ''}`}
            onClick={() => setActiveFilter(filter.key)}
          >
            {filter.label}
            <span className="my-requests-filter__count">{counts[filter.key]}</span>
          </button>
        ))}
      </section>

      {filtered.length === 0 ? (
        <div className="my-requests-empty">
          <EmptyState
            icon="mail"
            title={activeFilter === 'all' ? 'No requests sent' : `No ${activeFilter} requests`}
            message={activeFilter === 'all'
              ? "You haven't requested to join any group yet. Go to Groups to find one."
              : `No ${activeFilter} requests found for your account.`}
          />
        </div>
      ) : (
        <section className="my-requests-list">
          {filtered.map(req => {
            const group = req.group;

            return (
              <article key={req._id} className={`my-request-card ${statusClass(req.status)}`}>
                <div className="my-request-card__rail" />
                <div className="my-request-card__body">
                  <div className="my-request-card__main">
                    <div className="my-request-card__group">{group?.name || 'Unknown Group'}</div>
                    <div className="my-request-card__meta">
                      {[group?.hostelName, group?.city].filter(Boolean).join(' | ') || 'Group details not available'}
                    </div>
                    {req.message && (
                      <div className="my-request-card__message">Your message: "{req.message}"</div>
                    )}
                    {req.status === 'rejected' && req.rejectedReason && (
                      <div className="my-request-card__reason">Reason: {req.rejectedReason}</div>
                    )}
                    <div className="my-request-card__time">
                      Sent {format(new Date(req.createdAt), 'MMM d, yyyy | h:mm a')}
                      {req.handledAt && (
                        <> | {req.status === 'accepted' ? 'Accepted' : 'Rejected'} {format(new Date(req.handledAt), 'MMM d, yyyy')}</>
                      )}
                    </div>
                  </div>

                  <div className="my-request-card__side">
                    <span className={`my-request-status my-request-status--${req.status}`}>
                      {req.status}
                    </span>
                    {req.status === 'accepted' && (
                      <button
                        type="button"
                        className="my-request-card__go"
                        onClick={async () => {
                          await switchGroup(group._id);
                          toast.success(`Switched to ${group.name}`);
                        }}
                      >
                        Go to Group
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
};

export default MyRequestsPage;
