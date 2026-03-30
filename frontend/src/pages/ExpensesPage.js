import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Modal, { ConfirmModal } from '../components/Modal';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { expenseAPI, groupAPI } from '../services/api';
import { CATEGORY_COLORS } from '../theme';

const CATEGORIES = ['grocery', 'electricity', 'gas', 'internet', 'water', 'rent', 'other'];
const CAT_COLORS = CATEGORY_COLORS;

const CATEGORY_LABELS = {
  grocery: 'Grocery',
  electricity: 'Electricity',
  gas: 'Gas',
  internet: 'Internet',
  water: 'Water',
  rent: 'Rent',
  other: 'Other',
};

const roundValue = (value) => Number(Number(value || 0).toFixed(2));
const toCents = (value) => Math.round(Number(value || 0) * 100);
const fromCents = (value) => roundValue(value / 100);

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'MB';

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
const getCategoryLabel = (category) => CATEGORY_LABELS[category] || 'Other';
const getCategoryAccent = (category) => CAT_COLORS[category] || '#8AA1C7';

const allocateByWeights = (amount, items) => {
  const totalCents = toCents(amount);
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

  if (!items.length || totalWeight <= 0 || totalCents <= 0) {
    return items.map((item) => ({ ...item, amount: 0, cents: 0 }));
  }

  const base = items.map((item, index) => {
    const raw = (totalCents * item.weight) / totalWeight;
    const cents = Math.floor(raw);
    return { ...item, cents, remainder: raw - cents, index };
  });

  let remaining = totalCents - base.reduce((sum, item) => sum + item.cents, 0);

  base
    .slice()
    .sort((first, second) => {
      if (second.remainder !== first.remainder) return second.remainder - first.remainder;
      return first.index - second.index;
    })
    .forEach((item) => {
      if (remaining <= 0) return;
      base[item.index].cents += 1;
      remaining -= 1;
    });

  return base.map(({ cents, ...item }) => ({
    ...item,
    cents,
    amount: fromCents(cents),
  }));
};

const createEqualPercentages = (memberIds) => {
  if (!memberIds.length) return {};

  const allocations = allocateByWeights(
    100,
    memberIds.map((memberId) => ({ memberId, weight: 1 }))
  );

  return allocations.reduce((acc, allocation) => {
    acc[allocation.memberId] = roundValue(allocation.amount);
    return acc;
  }, {});
};

const buildPreviewSplit = (amount, splitMode, memberIds, percentageByMember) => {
  if (!memberIds.length || Number(amount || 0) <= 0) {
    return memberIds.map((memberId) => ({
      memberId,
      amount: 0,
      percentage: roundValue(percentageByMember[memberId] || 0),
    }));
  }

  if (splitMode === 'percentage') {
    const allocations = allocateByWeights(
      amount,
      memberIds.map((memberId) => ({
        memberId,
        weight: Number(percentageByMember[memberId] || 0),
      }))
    );

    return allocations.map((allocation) => ({
      memberId: allocation.memberId,
      amount: allocation.amount,
      percentage: roundValue(percentageByMember[allocation.memberId] || 0),
    }));
  }

  const allocations = allocateByWeights(
    amount,
    memberIds.map((memberId) => ({ memberId, weight: 1 }))
  );

  return allocations.map((allocation) => ({
    memberId: allocation.memberId,
    amount: allocation.amount,
    percentage: roundValue((allocation.cents / Math.max(1, toCents(amount))) * 100),
  }));
};

const getSplitLabel = (expense) => {
  if (expense.splitMode === 'percentage') return 'Percentage split';
  return 'Equal split';
};

  const ExpenseField = ({ label, required = false, children }) => (
  <label className="expenses-editor__field">
    <span className="expenses-editor__label">
      {label}
      {required ? <span className="expenses-editor__required"> *</span> : null}
    </span>
    {children}
  </label>
);

const SplitFieldIcon = ({ type }) => {
  const paths = {
    user: (
      <>
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
        <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="expenses-editor__icon-svg">
      {paths[type]}
    </svg>
  );
};

const ExpensesSelect = ({ value, onChange, options, placeholder, icon = 'user' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = React.useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointer = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, [open]);

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={containerRef} className={`expenses-editor__select ${open ? 'expenses-editor__select--open' : ''}`.trim()}>
      <button
        type="button"
        className="expenses-editor__select-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="expenses-editor__select-icon">
          <SplitFieldIcon type={icon} />
        </span>
        <span className={`expenses-editor__select-value ${selected ? '' : 'expenses-editor__select-value--placeholder'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className={`expenses-editor__select-chevron ${open ? 'expenses-editor__select-chevron--open' : ''}`} />
      </button>
      {open && (
        <div className="expenses-editor__select-menu">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`expenses-editor__select-option ${option.value === value ? 'expenses-editor__select-option--active' : ''}`.trim()}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span className="expenses-editor__select-option-avatar">
                {option.label.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <span className="expenses-editor__select-option-name">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const NoGroup = () => (
  <div className="expenses-empty-state expenses-empty-state--simple">
    <h2 className="expenses-empty-state__title">No active group</h2>
    <p className="expenses-empty-state__copy">Select a group to manage expenses.</p>
    <Link to="/groups" className="expenses-empty-state__action">
      Browse Groups
    </Link>
  </div>
);

const ExpensesPage = () => {
  const { isAdmin, activeGroupId } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    amount: '',
    dividedAmong: [],
    date: '',
    category: 'other',
    splitMode: 'equal',
    splitPercentages: {},
    memberPicker: '',
  });

  const load = useCallback(
    async (page = 1) => {
      if (!activeGroupId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await expenseAPI.getExpenses(activeGroupId, { page, limit: 10, search, category });
        setExpenses(res.data.expenses);
        setPagination(res.data.pagination);
      } catch {
        toast.error('Failed to load expenses');
      } finally {
        setLoading(false);
      }
    },
    [activeGroupId, search, category]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!activeGroupId) return;

    groupAPI
      .getGroup(activeGroupId)
      .then((res) => setMembers(res.data.group.members))
      .catch(() => {});
  }, [activeGroupId]);

  const resetForm = (next = {}) => {
    const defaultPicker = members[0]?._id || '';
    setForm({
      title: '',
      description: '',
      amount: '',
      dividedAmong: [],
      date: format(new Date(), 'yyyy-MM-dd'),
      category: 'other',
      splitMode: 'equal',
      splitPercentages: {},
      memberPicker: defaultPicker,
      ...next,
    });
  };

  const openAdd = () => {
    setEditingExpense(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (expense) => {
    setEditingExpense(expense);
    const selectedIds = expense.dividedAmong.map((member) => member._id || member);
    const storedPercentages =
      expense.splitDetails?.length > 0
        ? expense.splitDetails.reduce((acc, detail) => {
            const memberId = detail.member?._id || detail.member;
            acc[memberId] = roundValue(detail.percentage || 0);
            return acc;
          }, {})
        : createEqualPercentages(selectedIds);

    const nextPicker = members.find((member) => !selectedIds.includes(member._id))?._id || '';

    resetForm({
      title: expense.title,
      description: expense.description || '',
      amount: expense.amount,
      dividedAmong: selectedIds,
      date: format(new Date(expense.date), 'yyyy-MM-dd'),
      category: expense.category,
      splitMode: expense.splitMode || 'equal',
      splitPercentages: storedPercentages,
      memberPicker: nextPicker,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const selectedMembers = useMemo(
    () => members.filter((member) => form.dividedAmong.includes(member._id)),
    [members, form.dividedAmong]
  );

  const previewSplit = useMemo(
    () => buildPreviewSplit(form.amount, form.splitMode, form.dividedAmong, form.splitPercentages),
    [form.amount, form.splitMode, form.dividedAmong, form.splitPercentages]
  );

  const percentageTotal = useMemo(
    () =>
      form.dividedAmong.reduce(
        (sum, memberId) => sum + Number(form.splitPercentages[memberId] || 0),
        0
      ),
    [form.dividedAmong, form.splitPercentages]
  );

  const percentageOverLimit = form.splitMode === 'percentage' && percentageTotal > 100;

  const splitPreviewLabel = useMemo(() => {
    if (!selectedMembers.length || Number(form.amount || 0) <= 0) return 'Rs. 0';
    if (form.splitMode === 'percentage') return `${roundValue(percentageTotal)}% total`;
    return `${formatCurrency(roundValue(Number(form.amount || 0) / Math.max(1, selectedMembers.length)))} avg`;
  }, [form.amount, form.splitMode, percentageTotal, selectedMembers.length]);

  const addMember = (memberId) => {
    if (!memberId || form.dividedAmong.includes(memberId)) {
      return;
    }

    const nextMembers = [...form.dividedAmong, memberId];
    setForm((current) => ({
      ...current,
      dividedAmong: nextMembers,
      splitPercentages:
        current.splitMode === 'percentage'
          ? createEqualPercentages(nextMembers)
          : { ...current.splitPercentages, [memberId]: createEqualPercentages(nextMembers)[memberId] || 0 },
      memberPicker: '',
    }));
  };

  const removeMember = (memberId) => {
    const nextMembers = form.dividedAmong.filter((id) => id !== memberId);
    const nextPercentages = { ...form.splitPercentages };
    delete nextPercentages[memberId];

    setForm((current) => ({
      ...current,
      dividedAmong: nextMembers,
      splitPercentages:
        current.splitMode === 'percentage' ? createEqualPercentages(nextMembers) : nextPercentages,
      memberPicker: current.memberPicker || memberId,
    }));
  };

  const addAllMembers = () => {
    const nextMembers = members.map((member) => member._id);
    setForm((current) => ({
      ...current,
      dividedAmong: nextMembers,
      splitPercentages: createEqualPercentages(nextMembers),
      memberPicker: '',
    }));
  };

  const applyEqualSplit = () => {
    setForm((current) => ({
      ...current,
      splitMode: 'equal',
      splitPercentages: createEqualPercentages(current.dividedAmong),
    }));
  };

  const switchToPercentage = () => {
    setForm((current) => ({
      ...current,
      splitMode: 'percentage',
      splitPercentages:
        current.dividedAmong.length > 0 ? createEqualPercentages(current.dividedAmong) : current.splitPercentages,
    }));
  };

  const updatePercentage = (memberId, value) => {
    const cleaned = String(value).replace(/[^0-9.]/g, '');
    const numeric = cleaned === '' ? 0 : Math.min(100, Math.max(0, Number(cleaned)));

    setForm((current) => {
      const selectedIds = current.dividedAmong;
      if (!selectedIds.length) return current;

      const others = selectedIds.filter((id) => id !== memberId);
      const remaining = Math.max(0, 100 - numeric);
      const equalShare = others.length > 0 ? roundValue(remaining / others.length) : 0;

      const nextPercentages = { ...current.splitPercentages, [memberId]: roundValue(numeric) };
      others.forEach((id) => {
        nextPercentages[id] = equalShare;
      });

      return {
        ...current,
        splitPercentages: nextPercentages,
      };
    });
  };

  const handleSave = async () => {
    if (!form.title || !form.amount || form.dividedAmong.length === 0) {
      return toast.error('Title, amount and at least one member required');
    }

    if (form.splitMode === 'percentage' && Math.abs(percentageTotal - 100) > 0.05) {
      return toast.error('Percentages must total 100%');
    }

    const payload = {
      title: form.title,
      description: form.description,
      amount: parseFloat(form.amount),
      dividedAmong: form.dividedAmong,
      date: form.date,
      category: form.category,
      splitMode: form.splitMode,
      splitDetails: previewSplit.map((detail) => ({
        member: detail.memberId,
        percentage: detail.percentage,
        amount: detail.amount,
      })),
    };

    setSaving(true);
    try {
      if (editingExpense) {
        await expenseAPI.updateExpense(activeGroupId, editingExpense._id, payload);
        toast.success('Expense updated');
      } else {
        await expenseAPI.addExpense(activeGroupId, payload);
        toast.success('Expense added and balances updated');
      }
      setShowModal(false);
      load(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await expenseAPI.deleteExpense(activeGroupId, deleteId);
      toast.success('Expense deleted');
      setDeleteId(null);
      load(pagination.page);
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const summary = useMemo(() => {
    const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const averageExpense = expenses.length > 0 ? totalSpent / expenses.length : 0;
    const topCategoryEntry = Object.entries(
      expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + 1;
        return acc;
      }, {})
    ).sort((first, second) => second[1] - first[1])[0];

    return {
      totalSpent,
      averageExpense,
      topCategory: topCategoryEntry ? getCategoryLabel(topCategoryEntry[0]) : 'No category',
    };
  }, [expenses]);

  if (!activeGroupId) return <NoGroup />;

  return (
    <div className="expenses-page expenses-page--clean">
      <section className="expenses-header">
        <div className="expenses-header__main">
          <div className="expenses-header__eyebrow-row">
            <span className="expenses-header__eyebrow">Expense Desk</span>
          </div>
          <div className="expenses-header__stats">
            <article className="expenses-mini-stat expenses-mini-stat--teal">
              <span className="expenses-mini-stat__label">Total</span>
              <strong className="expenses-mini-stat__value">{formatCurrency(summary.totalSpent)}</strong>
            </article>
            <article className="expenses-mini-stat expenses-mini-stat--blue">
              <span className="expenses-mini-stat__label">Average</span>
              <strong className="expenses-mini-stat__value">{formatCurrency(summary.averageExpense)}</strong>
            </article>
            <article className="expenses-mini-stat expenses-mini-stat--gold">
              <span className="expenses-mini-stat__label">Category</span>
              <strong className="expenses-mini-stat__value">{summary.topCategory}</strong>
            </article>
          </div>
        </div>

        {isAdmin ? (
          <button type="button" className="expenses-header__action" onClick={openAdd}>
            Add Expense
          </button>
        ) : null}
      </section>

      <section className="expenses-controls">
        <input
          className="expenses-controls__search"
          placeholder="Search expenses"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          className="expenses-controls__select"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {getCategoryLabel(item)}
            </option>
          ))}
        </select>

        <div className="expenses-controls__count">{pagination.total} records</div>
      </section>

      {loading ? (
        <Spinner />
      ) : expenses.length === 0 ? (
        <section className="expenses-empty expenses-empty--clean">
          <h2 className="expenses-empty__title">No expenses yet</h2>
          {isAdmin ? (
            <button type="button" className="expenses-empty__action" onClick={openAdd}>
              Add Expense
            </button>
          ) : null}
        </section>
      ) : (
        <section className="expenses-ledger">
          <div className="expenses-ledger__list">
            {expenses.map((expense) => {
              const categoryAccent = getCategoryAccent(expense.category);
              const splitDetails = expense.splitDetails?.length > 0
                ? expense.splitDetails
                : expense.dividedAmong?.map((member) => ({
                    member,
                    amount: expense.splitAmount,
                    percentage: null,
                  })) || [];

              return (
                <article key={expense._id} className="expenses-row" style={{ '--expense-accent': categoryAccent }}>
                  <div className="expenses-row__left">
                    <span className="expenses-row__dot" />
                    <div className="expenses-row__content">
                      <div className="expenses-row__topline">
                        <h3 className="expenses-row__title">{expense.title}</h3>
                        <span className="expenses-row__category">{getCategoryLabel(expense.category)}</span>
                      </div>
                      <div className="expenses-row__meta">
                        <span>{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                        <span>{expense.dividedAmong?.length || 0} members</span>
                        <span>{getSplitLabel(expense)}</span>
                      </div>
                      {expense.description ? <p className="expenses-row__note">{expense.description}</p> : null}
                    </div>
                  </div>

                  <div className="expenses-row__right">
                    <div className="expenses-row__people">
                      {expense.dividedAmong?.slice(0, 4).map((member, index) => (
                        <span
                          key={member._id || `${expense._id}-${index}`}
                          className="expenses-row__avatar"
                          title={member.name}
                        >
                          {getInitials(member.name)}
                        </span>
                      ))}
                      {expense.dividedAmong?.length > 4 ? (
                        <span className="expenses-row__avatar expenses-row__avatar--more">
                          +{expense.dividedAmong.length - 4}
                        </span>
                      ) : null}
                      <div className="expenses-row__people-popover">
                        <span className="expenses-row__people-popover-title">Members</span>
                        <div className="expenses-row__people-popover-list">
                          {splitDetails.map((detail, index) => {
                            const member = detail.member?.name ? detail.member : expense.dividedAmong?.find((item) => (item._id || item) === detail.member);
                            return (
                              <span
                                key={member?._id || detail.member?._id || `${expense._id}-member-${index}`}
                                className="expenses-row__people-name"
                              >
                                <span className="expenses-row__people-member">
                                  {member?.name || 'Member'}
                                </span>
                                <span className="expenses-row__people-percentage">
                                  {detail.percentage ? `${detail.percentage}%` : ''}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="expenses-row__amount">{formatCurrency(expense.amount)}</div>

                    {isAdmin ? (
                      <div className="expenses-row__actions">
                        <button
                          type="button"
                          className="expenses-row__action expenses-row__action--edit"
                          onClick={() => openEdit(expense)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="expenses-row__action expenses-row__action--delete"
                          onClick={() => setDeleteId(expense._id)}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="expenses-ledger__footer">
            <Pagination current={pagination.page} total={pagination.pages} onChange={(page) => load(page)} />
          </div>
        </section>
      )}

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        className="expenses-modal-clean"
        maxWidth={760}
        title={<span className="expenses-modal-clean__title">{editingExpense ? 'Edit Expense' : 'Add Expense'}</span>}
      >
        <div className="expenses-editor">
          <div className="expenses-editor__grid">
            <ExpenseField label="Title" required>
              <input
                className="expenses-editor__input"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Electricity bill"
              />
            </ExpenseField>

            <ExpenseField label="Category">
              <select
                className="expenses-editor__input"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {getCategoryLabel(item)}
                  </option>
                ))}
              </select>
            </ExpenseField>

            <ExpenseField label="Amount (Rs.)" required>
              <input
                type="number"
                min="1"
                className="expenses-editor__input"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder="2400"
              />
            </ExpenseField>

            <ExpenseField label="Date">
              <input
                type="date"
                className="expenses-editor__input"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              />
            </ExpenseField>
          </div>

          <ExpenseField label="Note">
            <textarea
              rows={3}
              className="expenses-editor__input expenses-editor__input--textarea"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Optional note"
            />
          </ExpenseField>

          <section className="expenses-editor__split">
            <div className="expenses-editor__split-top">
              <div>
                <h3 className="expenses-editor__split-title">Split Logic</h3>
                <p className="expenses-editor__split-copy">Choose members, then divide equally or assign a percentage share.</p>
              </div>
              <span className="expenses-editor__split-pill">{splitPreviewLabel}</span>
            </div>

            <div className="expenses-editor__member-picker">
              <ExpensesSelect
                value={form.memberPicker}
                onChange={(nextId) => {
                  setForm((current) => ({ ...current, memberPicker: nextId }));
                  addMember(nextId);
                }}
                placeholder="Select member"
                options={members.map((member) => ({ value: member._id, label: member.name }))}
              />
              <button
                type="button"
                className="expenses-editor__utility-button"
                onClick={() => addMember(form.memberPicker)}
                disabled={!form.memberPicker}
              >
                Add Member
              </button>
              <button
                type="button"
                className="expenses-editor__utility-button expenses-editor__utility-button--soft"
                onClick={addAllMembers}
                disabled={members.length === 0 || form.dividedAmong.length === members.length}
              >
                Add All
              </button>
            </div>

              <div className="expenses-editor__mode-row">
                <div className="expenses-editor__mode-toggle">
                  <button
                    type="button"
                    className={`expenses-editor__mode-button ${form.splitMode === 'equal' ? 'expenses-editor__mode-button--active' : ''}`.trim()}
                    onClick={applyEqualSplit}
                  >
                    Equal Split
                  </button>
                  <button
                    type="button"
                    className={`expenses-editor__mode-button ${form.splitMode === 'percentage' ? 'expenses-editor__mode-button--active' : ''}`.trim()}
                    onClick={switchToPercentage}
                  >
                    Percentage
                  </button>
                </div>
              </div>

            {selectedMembers.length === 0 ? (
              <div className="expenses-editor__empty-members">Add one or more members to define the split.</div>
            ) : (
              <div className="expenses-editor__selected-list">
                {selectedMembers.map((member) => {
                  const preview = previewSplit.find((detail) => detail.memberId === member._id);
                  return (
                    <div key={member._id} className="expenses-editor__selected-card">
                      <div className="expenses-editor__selected-main">
                        <span className="expenses-editor__member-avatar">{getInitials(member.name)}</span>
                        <div className="expenses-editor__selected-copy">
                          <div className="expenses-editor__member-name">{member.name}</div>
                          <div className="expenses-editor__selected-share">{formatCurrency(preview?.amount || 0)}</div>
                        </div>
                      </div>

                      {form.splitMode === 'percentage' ? (
                        <div className="expenses-editor__percentage-field">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            max={100}
                            className="expenses-editor__percentage-input"
                            value={form.splitPercentages[member._id] ?? ''}
                            onChange={(event) => updatePercentage(member._id, event.target.value)}
                          />
                          <span className="expenses-editor__percentage-symbol">%</span>
                        </div>
                      ) : (
                        <div className="expenses-editor__selected-badge">Equal</div>
                      )}

                      <button
                        type="button"
                        className="expenses-editor__remove-member"
                        onClick={() => removeMember(member._id)}
                        aria-label={`Remove ${member.name}`}
                      >
                        x
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="expenses-editor__summary-bar">
              <span>{selectedMembers.length} selected</span>
              <span>{form.splitMode === 'percentage' ? `${roundValue(percentageTotal)}% assigned` : 'Equal allocation'}</span>
            </div>
            {form.splitMode === 'percentage' && (
              <div className={`expenses-editor__warning ${percentageOverLimit ? 'expenses-editor__warning--active' : ''}`.trim()}>
                Total cannot exceed 100%
              </div>
            )}
          </section>

          <div className="expenses-editor__actions">
            <button type="button" className="expenses-editor__button expenses-editor__button--ghost" onClick={handleCloseModal}>
              Cancel
            </button>
            <button
              type="button"
              className="expenses-editor__button expenses-editor__button--primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        confirmText="Delete"
        loading={deleting}
        message="Delete this expense? Member balances will be reversed automatically."
      />
    </div>
  );
};

export default ExpensesPage;
