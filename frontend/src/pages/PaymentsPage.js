import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { paymentAPI, groupAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal, { ConfirmModal } from '../components/Modal';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { Avatar } from '../components/Layout';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { addDays, addMonths, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { AVATAR_COLORS } from '../theme';

const COLORS = AVATAR_COLORS;
const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
];

const getMemberPaymentStatus = (member) => {
  if (!member) return { text: '', tone: 'neutral' };
  if (member.balance < 0) return { text: `Owes ${formatCurrency(Math.abs(member.balance))}`, tone: 'danger' };
  if (member.balance === 0) return { text: 'Settled', tone: 'neutral' };
  return { text: `Overpaid ${formatCurrency(member.balance)}`, tone: 'success' };
};

const PaymentFieldIcon = ({ type }) => {
  const paths = {
    user: (
      <>
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
        <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
      </>
    ),
    money: (
      <>
        <path d="M4 7.5h16v9H4z" />
        <path d="M8 12h8" />
        <path d="M12 9.5v5" />
      </>
    ),
    method: (
      <>
        <rect x="4" y="6.5" width="16" height="11" rx="2.5" />
        <path d="M4 10.5h16" />
      </>
    ),
    calendar: (
      <>
        <rect x="4.5" y="6.5" width="15" height="13" rx="2.5" />
        <path d="M8 4.5v4" />
        <path d="M16 4.5v4" />
        <path d="M4.5 10h15" />
      </>
    ),
    note: (
      <>
        <path d="M6.5 5.5h8l3 3v10a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" />
        <path d="M14.5 5.5v3h3" />
        <path d="M8.5 12h7" />
        <path d="M8.5 15h5.5" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="payments-floating-field__icon-svg">
      {paths[type]}
    </svg>
  );
};

const FloatingField = ({ label, icon, required = false, filled = false, children, hint }) => (
  <div className={`payments-floating-field ${filled ? 'payments-floating-field--filled' : ''}`}>
    <div className="payments-floating-field__control">
      <span className="payments-floating-field__icon">
        <PaymentFieldIcon type={icon} />
      </span>
      {children}
      <label className="payments-floating-field__label">
        {label}
        {required && <span className="payments-floating-field__required">*</span>}
      </label>
    </div>
    {hint && <div className="payments-floating-field__hint">{hint}</div>}
  </div>
);

const FloatingSelect = ({
  label,
  icon,
  required = false,
  value,
  onChange,
  options,
  placeholder,
  renderSelected,
  renderOption,
  dropdownClassName = '',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || null;

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={`payments-floating-field payments-floating-select ${value ? 'payments-floating-field--filled' : ''} ${open ? 'payments-floating-select--open' : ''}`.trim()}
    >
      <div className="payments-floating-field__control">
        <span className="payments-floating-field__icon">
          <PaymentFieldIcon type={icon} />
        </span>
        <button
          type="button"
          className="payments-floating-field__input payments-floating-field__input--button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
        >
          <span className={`payments-floating-select__value ${!selectedOption ? 'payments-floating-select__value--placeholder' : ''}`}>
            {selectedOption ? renderSelected(selectedOption) : placeholder}
          </span>
          <span className={`payments-floating-select__chevron ${open ? 'payments-floating-select__chevron--open' : ''}`} />
        </button>
        <label className="payments-floating-field__label">
          {label}
          {required && <span className="payments-floating-field__required">*</span>}
        </label>
      </div>

      {open && (
        <div className={`payments-floating-select__menu ${dropdownClassName}`.trim()}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`payments-floating-select__option ${option.value === value ? 'payments-floating-select__option--active' : ''}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {renderOption(option)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const FloatingDatePicker = ({ label, icon, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => value ? parseISO(value) : new Date());
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef(null);
  const selectedDate = value ? parseISO(value) : null;

  useEffect(() => {
    if (value) {
      setVisibleMonth(parseISO(value));
    }
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;

    const updatePlacement = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const estimatedPanelHeight = 360;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUpward(spaceBelow < estimatedPanelHeight && spaceAbove > spaceBelow);
    };

    updatePlacement();

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleResize = () => updatePlacement();

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [open]);

  const monthStart = startOfMonth(visibleMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const days = Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index));

  const pickDate = (date) => {
    onChange(format(date, 'yyyy-MM-dd'));
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`payments-floating-field payments-floating-select payments-floating-date ${value ? 'payments-floating-field--filled' : ''} ${open ? 'payments-floating-select--open' : ''}`.trim()}
    >
      <div className="payments-floating-field__control">
        <span className="payments-floating-field__icon">
          <PaymentFieldIcon type={icon} />
        </span>
        <button
          type="button"
          className="payments-floating-field__input payments-floating-field__input--button payments-floating-date__trigger"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
        >
          <span className={`payments-floating-select__value ${!value ? 'payments-floating-select__value--placeholder' : ''}`}>
            {value ? format(parseISO(value), 'MM/dd/yyyy') : 'Select date'}
          </span>
          <span className={`payments-floating-select__chevron ${open ? 'payments-floating-select__chevron--open' : ''}`} />
        </button>
        <label className="payments-floating-field__label">{label}</label>
      </div>

      {open && (
        <div className={`payments-floating-date__panel ${openUpward ? 'payments-floating-date__panel--up' : ''}`.trim()}>
          <div className="payments-floating-date__header">
            <button
              type="button"
              className="payments-floating-date__nav"
              onClick={() => setVisibleMonth((current) => subMonths(current, 1))}
              aria-label="Previous month"
            >
              <span className="payments-floating-date__nav-icon payments-floating-date__nav-icon--left" />
            </button>
            <div className="payments-floating-date__month">{format(visibleMonth, 'MMMM yyyy')}</div>
            <button
              type="button"
              className="payments-floating-date__nav"
              onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
              aria-label="Next month"
            >
              <span className="payments-floating-date__nav-icon payments-floating-date__nav-icon--right" />
            </button>
          </div>

          <div className="payments-floating-date__weekdays">
            {dayLabels.map((dayLabel) => (
              <span key={dayLabel} className="payments-floating-date__weekday">{dayLabel}</span>
            ))}
          </div>

          <div className="payments-floating-date__grid">
            {days.map((day) => {
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isCurrentMonth = isSameMonth(day, visibleMonth);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`payments-floating-date__day ${isCurrentMonth ? '' : 'payments-floating-date__day--muted'} ${isSelected ? 'payments-floating-date__day--selected' : ''} ${isToday ? 'payments-floating-date__day--today' : ''}`.trim()}
                  onClick={() => pickDate(day)}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const NoGroup = () => (
  <div className="payments-empty">
    <div className="payments-empty__icon">CASH</div>
    <h3 className="payments-empty__title">No Active Group</h3>
    <p className="payments-empty__copy">Select or join a group to manage payment activity.</p>
    <Link to="/groups" style={{ textDecoration: 'none' }}>
      <button className="payments-action payments-action--primary" type="button">
        Browse Groups
      </button>
    </Link>
  </div>
);

const OverviewCard = ({ label, value, note, tone = 'default', featured = false }) => (
  <article className={`payments-overview-card payments-overview-card--${tone} ${featured ? 'payments-overview-card--featured' : ''}`}>
    <div className="payments-overview-card__label">{label}</div>
    <div className="payments-overview-card__value">{value}</div>
    {note && <div className="payments-overview-card__note">{note}</div>}
  </article>
);

const PaymentsPage = () => {
  const { isAdmin, updateUser, user, activeGroupId } = useAuth();
  const [payments, setPayments] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [adminShareSummary, setAdminShareSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState('member');
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ memberId: '', amount: '', note: '', paymentMethod: 'cash', date: '' });

  const applySummary = useCallback((summary) => {
    if (!summary) return;
    if (typeof summary.monthlyTotal === 'number') setMonthlyTotal(summary.monthlyTotal);
    if (summary.adminShareSummary !== undefined) setAdminShareSummary(summary.adminShareSummary);
  }, []);

  const paymentMatchesActiveTab = useCallback((payment) => {
    if (!payment) return false;
    if (activeTab === 'members') return payment.isAdminSelfPayment !== true;
    if (activeTab === 'myshare') return payment.isAdminSelfPayment === true;
    return true;
  }, [activeTab]);

  const loadPayments = useCallback(async (page = 1) => {
    if (!activeGroupId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const typeMap = { all: '', members: 'member', myshare: 'self' };
      const res = await paymentAPI.getPayments(activeGroupId, { page, limit: 10, type: typeMap[activeTab] });
      setPayments(res.data.payments);
      setPagination(res.data.pagination);
      setMonthlyTotal(res.data.monthlyTotal);
      if (res.data.adminShareSummary !== undefined) setAdminShareSummary(res.data.adminShareSummary);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [activeGroupId, activeTab]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const loadMembers = useCallback(async () => {
    if (!isAdmin || !activeGroupId) return;
    try {
      const res = await groupAPI.getGroup(activeGroupId);
      setAllMembers(res.data.group.members);
    } catch {}
  }, [activeGroupId, isAdmin]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const refreshBalance = async () => {
    try {
      const { authAPI } = await import('../services/api');
      const res = await authAPI.getMe();
      updateUser(res.data.user);
    } catch (error) {
      console.error(error);
    }
  };

  const openModal = (mode = 'member') => {
    setPaymentMode(mode);
    const today = format(new Date(), 'yyyy-MM-dd');
    setForm({ memberId: mode === 'self' ? user?._id || '' : '', amount: '', note: '', paymentMethod: 'cash', date: today });
    setShowModal(true);
  };

  const handleRecord = async () => {
    if (!form.memberId || !form.amount) return toast.error('Please select a person and enter amount');
    setSaving(true);
    try {
      const res = await paymentAPI.recordPayment(activeGroupId, { ...form, amount: parseFloat(form.amount) });
      applySummary(res.data.summary);

      if (paymentMatchesActiveTab(res.data.payment)) {
        setPayments((current) => [res.data.payment, ...current].slice(0, 10));
        setPagination((current) => {
          const total = (current.total || 0) + 1;
          return { ...current, page: 1, total, pages: Math.max(1, Math.ceil(total / 10)) };
        });
      }

      toast.success(paymentMode === 'self' ? 'Your share payment recorded!' : 'Member payment recorded!');
      setShowModal(false);
      await Promise.all([loadPayments(1), refreshBalance(), loadMembers()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const deletedId = deleteId;
      const res = await paymentAPI.deletePayment(activeGroupId, deletedId);
      applySummary(res.data.summary);
      setPayments((current) => current.filter((payment) => payment._id !== deletedId));
      setPagination((current) => {
        const total = Math.max(0, (current.total || 0) - 1);
        return { ...current, total, pages: Math.max(1, Math.ceil(total / 10)) };
      });
      toast.success('Payment reversed');
      setDeleteId(null);
      await Promise.all([loadPayments(1), refreshBalance(), loadMembers()]);
    } catch {
      toast.error('Failed to reverse');
    } finally {
      setDeleting(false);
    }
  };

  const regularMembers = allMembers.filter((member) => member.role !== 'admin');
  const selectedMember = allMembers.find((member) => member._id === form.memberId);
  const shareRemaining = adminShareSummary?.remaining || 0;

  const tabItems = [
    { key: 'all', label: 'All Payments' },
    { key: 'members', label: 'Member Payments' },
    { key: 'myshare', label: 'My Share' },
  ];

  const insights = useMemo(() => {
    const memberPayments = payments.filter((payment) => payment.isAdminSelfPayment !== true).length;
    const selfPayments = payments.filter((payment) => payment.isAdminSelfPayment === true).length;
    return {
      memberPayments,
      selfPayments,
      sharePaid: adminShareSummary?.totalPaid || 0,
    };
  }, [payments, adminShareSummary]);

  if (!activeGroupId) return <NoGroup />;

  return (
    <div className="payments-page">
      <section className="payments-hero">
        <div className="payments-hero__copy">
          <div className="payments-hero__eyebrow">Payments Desk</div>
          <h2 className="payments-hero__title">Payments</h2>
          <div className="payments-hero__chips">
            <span className="payments-chip payments-chip--accent">{formatCurrency(monthlyTotal)} this month</span>
            <span className="payments-chip">{pagination.total || 0} total records</span>
            {isAdmin && adminShareSummary && <span className={`payments-chip ${shareRemaining > 0 ? 'payments-chip--danger' : 'payments-chip--success'}`}>{formatCurrency(shareRemaining)} remaining</span>}
          </div>
        </div>

        <div className="payments-hero__aside">
          <div className="payments-hero__ledger">
            <div className="payments-hero__ledger-line">
              <span className="payments-hero__ledger-label">Member Payments</span>
              <strong className="payments-hero__ledger-value">{insights.memberPayments}</strong>
            </div>
            <div className="payments-hero__ledger-line">
              <span className="payments-hero__ledger-label">My Share Entries</span>
              <strong className="payments-hero__ledger-value">{insights.selfPayments}</strong>
            </div>
            {isAdmin && adminShareSummary && (
              <div className="payments-hero__ledger-line">
                <span className="payments-hero__ledger-label">Share Paid</span>
                <strong className="payments-hero__ledger-value">{formatCurrency(insights.sharePaid)}</strong>
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="payments-hero__actions">
              <button type="button" className="payments-action payments-action--primary" onClick={() => openModal('member')}>
                Record Member Payment
              </button>
              <button type="button" className="payments-action payments-action--secondary" onClick={() => openModal('self')}>
                Pay My Share
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="payments-overview">
        <OverviewCard label="Received This Month" value={formatCurrency(monthlyTotal)} note="Live cash inflow" tone="success" featured />
        <OverviewCard label="Total Payments" value={pagination.total || 0} note="Recorded transactions" tone="default" />
        {isAdmin && adminShareSummary ? (
          <>
            <OverviewCard label="My Share Owed" value={formatCurrency(adminShareSummary.totalOwed)} note={`Paid ${formatCurrency(adminShareSummary.totalPaid)}`} tone="info" />
            <OverviewCard label="My Remaining Share" value={formatCurrency(shareRemaining)} note={shareRemaining > 0 ? 'Still unpaid' : 'Fully paid'} tone={shareRemaining > 0 ? 'danger' : 'success'} />
          </>
        ) : (
          <>
            <OverviewCard label="Member Payments" value={insights.memberPayments} note="Payments from members" tone="success" />
            <OverviewCard label="My Share Records" value={insights.selfPayments} note="Entries tagged to your share" tone="info" />
          </>
        )}
      </section>

      <section className="payments-panel">
        <div className="payments-panel__header">
          <div>
            <h3 className="payments-panel__title">Payment Activity</h3>
          </div>

          {isAdmin && (
            <div className="payments-tabs">
              {tabItems.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`payments-tab ${activeTab === tab.key ? 'payments-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <Spinner />
        ) : payments.length === 0 ? (
          <EmptyState icon="💵" title="No payments yet" message="Record a payment when someone clears a balance." />
        ) : (
          <>
            <div className="payments-feed">
              {payments.map((payment, index) => {
                const isAdminSelf = payment.isAdminSelfPayment === true;
                const chipTone = isAdminSelf ? 'info' : 'success';

                return (
                  <article key={payment._id} className={`payment-entry payment-entry--${chipTone}`}>
                    <div className="payment-entry__left">
                      <Avatar name={payment.member?.name || '?'} size={44} color={isAdminSelf ? 'var(--blue)' : COLORS[index % COLORS.length]} />
                      <div className="payment-entry__copy">
                        <div className="payment-entry__topline">
                          <h4 className="payment-entry__name">{payment.member?.name}</h4>
                          <span className={`payment-entry__chip payment-entry__chip--${chipTone}`}>
                            {isAdminSelf ? 'My Share' : 'Member Paid'}
                          </span>
                        </div>
                        <div className="payment-entry__meta">
                          <span>{format(new Date(payment.date), 'MMM d, yyyy')}</span>
                          <span>{payment.paymentMethod.replace('_', ' ')}</span>
                          {payment.note && <span>{payment.note}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="payment-entry__right">
                      <div className={`payment-entry__amount ${isAdminSelf ? 'payment-entry__amount--success' : 'payment-entry__amount--info'}`}>
                        +{formatCurrency(payment.amount)}
                      </div>
                      {isAdmin && (
                        <button type="button" className="payment-entry__reverse" onClick={() => setDeleteId(payment._id)}>
                          Reverse
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="payments-panel__footer">
              <Pagination current={pagination.page} total={pagination.pages} onChange={loadPayments} />
            </div>
          </>
        )}
      </section>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={(
          <span className="payments-modal__title-group">
            <span className={`payments-modal__logo payments-modal__logo--${paymentMode === 'self' ? 'accent' : 'primary'}`}>
              {paymentMode === 'self' ? 'SH' : 'PM'}
            </span>
            <span className="payments-modal__title-text">
              {paymentMode === 'self' ? 'Pay My Share' : 'Record Member Payment'}
            </span>
          </span>
        )}
        className="payments-modal"
      >
        <div className="payments-form">
          <div className="payments-form__surface">
            {paymentMode === 'member' && (
              <div className="payments-form__section">
                {!selectedMember && (
                  <FloatingSelect
                    label="Who Paid?"
                    icon="user"
                    required
                    value={form.memberId}
                    onChange={(memberId) => setForm((current) => ({ ...current, memberId }))}
                    options={regularMembers.map((member, index) => ({
                      value: member._id,
                      label: member.name,
                      status: getMemberPaymentStatus(member),
                      color: COLORS[index % COLORS.length],
                    }))}
                    placeholder="Select member..."
                    dropdownClassName="payments-floating-select__menu--members"
                    renderSelected={(option) => (
                      <span className="payments-floating-select__selected payments-floating-select__selected--member">
                        <span className="payments-floating-select__option-main">
                          <span className="payments-floating-select__avatar" style={{ '--option-accent': option.color }}>
                            {option.label.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                          <span className="payments-floating-select__selected-copy payments-floating-select__selected-copy--member">
                            <span className="payments-floating-select__selected-label">{option.label}</span>
                          </span>
                        </span>
                        <span className={`payments-floating-select__status payments-floating-select__status--${option.status.tone} payments-floating-select__status--selected`}>
                          {option.status.text}
                        </span>
                      </span>
                    )}
                    renderOption={(option) => (
                      <span className="payments-floating-select__option-layout">
                        <span className="payments-floating-select__option-main">
                          <span className="payments-floating-select__avatar" style={{ '--option-accent': option.color }}>
                            {option.label.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                          <span className="payments-floating-select__option-copy payments-floating-select__option-copy--member">
                            <span className="payments-floating-select__option-label">{option.label}</span>
                          </span>
                        </span>
                        <span className={`payments-floating-select__status payments-floating-select__status--${option.status.tone}`}>
                          {option.status.text}
                        </span>
                      </span>
                    )}
                  />
                )}

                {selectedMember && (
                  <div className={`payments-form__member-card ${selectedMember.balance < 0 ? 'payments-form__member-card--due' : 'payments-form__member-card--ok'}`}>
                    <Avatar name={selectedMember.name} size={42} color={selectedMember.balance < 0 ? 'var(--red)' : 'var(--accent)'} />
                    <div className="payments-form__member-card-content">
                      <div className="payments-form__member-card-top">
                        <div className="payments-form__member-card-name">{selectedMember.name}</div>
                        <button
                          type="button"
                          className="payments-form__member-card-change"
                          onClick={() => setForm((current) => ({ ...current, memberId: '' }))}
                        >
                          Change
                        </button>
                      </div>
                      <div className="payments-form__member-card-copy">
                        {selectedMember.balance < 0
                          ? `${selectedMember.name} currently owes ${formatCurrency(selectedMember.balance)}`
                          : selectedMember.balance === 0
                            ? `${selectedMember.name} is already settled`
                            : `${selectedMember.name} currently has ${formatCurrency(selectedMember.balance)} in credit`}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="payments-form__section">
              <FloatingField label="Amount (Rs.)" icon="money" required filled={!!form.amount}>
                <input
                  className="payments-floating-field__input"
                  type="number"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  placeholder=" "
                  min="1"
                />
              </FloatingField>

              <div className="payments-form__split">
                <FloatingSelect
                  label="Payment Method"
                  icon="method"
                  value={form.paymentMethod}
                  onChange={(paymentMethod) => setForm((current) => ({ ...current, paymentMethod }))}
                  options={PAYMENT_METHOD_OPTIONS}
                  placeholder="Choose method"
                  renderSelected={(option) => (
                    <span className="payments-floating-select__simple-value">{option.label}</span>
                  )}
                  renderOption={(option) => (
                    <span className="payments-floating-select__simple-option">
                      <span className="payments-floating-select__simple-label">{option.label}</span>
                    </span>
                  )}
                />

                <FloatingDatePicker
                  label="Date"
                  icon="calendar"
                  value={form.date}
                  onChange={(date) => setForm((current) => ({ ...current, date }))}
                />
              </div>

              <FloatingField label="Note (Optional)" icon="note" filled={!!form.note}>
                <textarea
                  className="payments-floating-field__input payments-floating-field__input--textarea"
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder=" "
                  rows={3}
                />
              </FloatingField>
            </div>

            <div className="payments-form__actions">
              <button type="button" className="payments-form__action payments-form__action--secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={`payments-form__action payments-form__action--${paymentMode === 'self' ? 'accent' : 'primary'}`}
                onClick={handleRecord}
                disabled={saving}
              >
                {saving ? 'Recording...' : paymentMode === 'self' ? 'Record My Share' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Reverse Payment"
        confirmText="Reverse"
        loading={deleting}
        message="This will reverse the payment and restore the original balance."
      />
    </div>
  );
};

export default PaymentsPage;
