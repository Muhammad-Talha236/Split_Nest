// services/api.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const normalizeId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (typeof value.toHexString === 'function') return value.toHexString();

    const nestedValue = value._id ?? value.id ?? value.groupId ?? null;
    if (nestedValue && nestedValue !== value) {
      return normalizeId(nestedValue);
    }

    if (typeof value.toString === 'function') {
      const stringValue = value.toString();
      if (stringValue && stringValue !== '[object Object]') return stringValue;
    }

    return null;
  }
  return String(value);
};

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('khatanest_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('khatanest_token');
      localStorage.removeItem('khatanest_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  register          : (data)            => api.post('/auth/register', data),
  login             : (data)            => api.post('/auth/login', data),
  getMe             : ()                => api.get('/auth/me'),
  switchGroup       : (groupId)         => api.put('/auth/switch-group', { groupId: normalizeId(groupId) }),
  forgotPassword    : (email)           => api.post('/auth/forgot-password', { email }),
  validateResetToken: (token)           => api.get(`/auth/reset-password/${token}`),
  resetPassword     : (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
};

// ─── Groups ────────────────────────────────────────────────────────────────
export const groupAPI = {
  getAllGroups      : (params)               => api.get('/groups', { params: cleanParams(params) }),
  getMyGroups       : ()                     => api.get('/groups/my'),
  getGroup          : (id)                   => api.get(`/groups/${normalizeId(id)}`),
  createGroup       : (data)                 => api.post('/groups', data),
  updateGroup       : (id, data)             => api.put(`/groups/${normalizeId(id)}`, data),
  deleteGroup       : (id)                   => api.delete(`/groups/${normalizeId(id)}`),
  sendJoinRequest   : (id, data)             => api.post(`/groups/${normalizeId(id)}/request`, data),
  getJoinRequests   : (id, params)           => api.get(`/groups/${normalizeId(id)}/requests`, { params: cleanParams(params) }),
  handleJoinRequest : (id, reqId, data)      => api.put(`/groups/${normalizeId(id)}/requests/${normalizeId(reqId)}`, data),
  getMyRequests     : ()                     => api.get('/groups/requests/my'),
  leaveGroup        : (id)                   => api.post(`/groups/${normalizeId(id)}/leave`),
  transferAdmin     : (id, newAdminId)       => api.put(`/groups/${normalizeId(id)}/transfer-admin`, { newAdminId: normalizeId(newAdminId) }),
  removeMember      : (id, memberId)         => api.delete(`/groups/${normalizeId(id)}/members/${normalizeId(memberId)}`),
  monthlyReset      : (id)                   => api.post(`/groups/${normalizeId(id)}/reset`),
};

// ─── Expenses (nested under group) ─────────────────────────────────────────
export const expenseAPI = {
  getExpenses  : (groupId, params)    => api.get(`/groups/${normalizeId(groupId)}/expenses`, { params: cleanParams(params) }),
  addExpense   : (groupId, data)      => api.post(`/groups/${normalizeId(groupId)}/expenses`, data),
  updateExpense: (groupId, id, data)  => api.put(`/groups/${normalizeId(groupId)}/expenses/${normalizeId(id)}`, data),
  deleteExpense: (groupId, id)        => api.delete(`/groups/${normalizeId(groupId)}/expenses/${normalizeId(id)}`),
  getStats     : (groupId)            => api.get(`/groups/${normalizeId(groupId)}/expenses/stats`),
};

// ─── Payments (nested under group) ─────────────────────────────────────────
export const paymentAPI = {
  getPayments  : (groupId, params)  => api.get(`/groups/${normalizeId(groupId)}/payments`, { params: cleanParams(params) }),
  recordPayment: (groupId, data)    => api.post(`/groups/${normalizeId(groupId)}/payments`, data),
  deletePayment: (groupId, id)      => api.delete(`/groups/${normalizeId(groupId)}/payments/${normalizeId(id)}`),
};

// ─── Balances (nested under group) ─────────────────────────────────────────
export const balanceAPI = {
  getBalances: (groupId)          => api.get(`/groups/${normalizeId(groupId)}/balances`),
  getHistory : (groupId, params)  => api.get(`/groups/${normalizeId(groupId)}/balances/history`, { params: cleanParams(params) }),
};

export default api;
