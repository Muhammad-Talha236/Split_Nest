// pages/GroupRequestsPage.js - Admin manages join requests
import React, { useState, useEffect, useCallback } from 'react';
import { groupAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Layout';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

const GroupRequestsPage = () => {
  const { activeGroupId } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [handling, setHandling] = useState(false);
  const [counts, setCounts] = useState({ pending: 0, accepted: 0, rejected: 0 });

  const loadRequests = useCallback(async () => {
    if (!activeGroupId) return;
    setLoading(true);
    try {
      const res = await groupAPI.getJoinRequests(activeGroupId, { status: activeTab });
      setRequests(res.data.requests || []);
    } catch {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [activeGroupId, activeTab]);

  const loadCounts = useCallback(async () => {
    if (!activeGroupId) return;
    try {
      const [pendingRes, acceptedRes, rejectedRes] = await Promise.all([
        groupAPI.getJoinRequests(activeGroupId, { status: 'pending' }),
        groupAPI.getJoinRequests(activeGroupId, { status: 'accepted' }),
        groupAPI.getJoinRequests(activeGroupId, { status: 'rejected' }),
      ]);

      setCounts({
        pending: pendingRes.data.requests?.length || 0,
        accepted: acceptedRes.data.requests?.length || 0,
        rejected: rejectedRes.data.requests?.length || 0,
      });
    } catch {
      // Keep prior counts if this optional fetch fails.
    }
  }, [activeGroupId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const refreshAll = async () => {
    await Promise.all([loadRequests(), loadCounts()]);
  };

  const handleAccept = async (reqId, userName) => {
    setHandling(reqId);
    try {
      await groupAPI.handleJoinRequest(activeGroupId, reqId, { action: 'accept' });
      toast.success(`${userName} joined the group`);
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept request');
    } finally {
      setHandling(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setHandling(rejectModal._id);
    try {
      await groupAPI.handleJoinRequest(activeGroupId, rejectModal._id, {
        action: 'reject',
        rejectedReason: rejectReason,
      });
      toast.success('Request rejected');
      setRejectModal(null);
      setRejectReason('');
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setHandling(null);
    }
  };

  const totalRequests = counts.pending + counts.accepted + counts.rejected;

  return (
    <div className="requests-page">
      <section className="requests-hero">
        <div className="requests-hero__left">
          <span className="requests-hero__eyebrow">REQUEST CONTROL</span>
          <h2 className="requests-hero__title">Join Requests</h2>
          <p className="requests-hero__subtitle">Review, accept, or reject people asking to join your group.</p>
          <div className="requests-hero__chips">
            <span className="requests-chip requests-chip--pending">{counts.pending} pending</span>
            <span className="requests-chip requests-chip--accepted">{counts.accepted} accepted</span>
            <span className="requests-chip requests-chip--rejected">{counts.rejected} rejected</span>
          </div>
        </div>
        <div className="requests-hero__stat">
          <div className="requests-hero__stat-label">Total Requests</div>
          <div className="requests-hero__stat-value">{totalRequests}</div>
          <div className="requests-hero__stat-hint">Across all statuses</div>
        </div>
      </section>

      <section className="requests-switcher">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`requests-switcher__tab ${activeTab === tab.key ? 'requests-switcher__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className="requests-switcher__count">{counts[tab.key]}</span>
          </button>
        ))}
      </section>

      {loading ? (
        <Spinner message="Loading requests..." />
      ) : requests.length === 0 ? (
        <div className="requests-empty">
          <EmptyState
            icon={activeTab === 'pending' ? 'mail' : activeTab === 'accepted' ? 'ok' : 'x'}
            title={`No ${activeTab} requests`}
            message={activeTab === 'pending'
              ? 'No one has requested to join your group yet.'
              : `No ${activeTab} requests to show right now.`}
          />
        </div>
      ) : (
        <section className="requests-list">
          {requests.map(req => (
            <article key={req._id} className={`request-card request-card--${req.status}`}>
              <div className="request-card__rail" />
              <div className="request-card__body">
                <div className="request-card__main">
                  <Avatar name={req.user?.name} size={46} color="#35C7A5" />
                  <div className="request-card__copy">
                    <div className="request-card__name">{req.user?.name || 'Unknown user'}</div>
                    <div className="request-card__email">{req.user?.email || 'No email provided'}</div>
                    {req.message && (
                      <div className="request-card__message">"{req.message}"</div>
                    )}
                    <div className="request-card__meta">
                      Requested {format(new Date(req.createdAt), 'MMM d, yyyy · h:mm a')}
                    </div>
                    {req.status === 'rejected' && req.rejectedReason && (
                      <div className="request-card__reason">Reason: {req.rejectedReason}</div>
                    )}
                  </div>
                </div>

                {req.status === 'pending' ? (
                  <div className="request-card__actions">
                    <button
                      type="button"
                      className="request-btn request-btn--accept"
                      onClick={() => handleAccept(req._id, req.user?.name)}
                      disabled={!!handling}
                    >
                      {handling === req._id ? 'Working...' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      className="request-btn request-btn--reject"
                      onClick={() => setRejectModal(req)}
                      disabled={!!handling}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className={`request-status request-status--${req.status}`}>
                    {req.status}
                  </span>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      <Modal
        isOpen={!!rejectModal}
        onClose={() => { setRejectModal(null); setRejectReason(''); }}
        title="Reject Request"
        maxWidth={420}
      >
        <div className="requests-reject">
          <p className="requests-reject__copy">
            Reject <strong>{rejectModal?.user?.name}</strong>'s request? You can add an optional reason.
          </p>
          <div className="requests-reject__field">
            <label>Reason (optional)</label>
            <input
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Group is full"
            />
          </div>
          <div className="requests-reject__actions">
            <button
              type="button"
              className="requests-reject__cancel"
              onClick={() => { setRejectModal(null); setRejectReason(''); }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="requests-reject__confirm"
              onClick={handleReject}
              disabled={!!handling}
            >
              {handling ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GroupRequestsPage;
