// context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);
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

const normalizeUser = (rawUser) => {
  if (!rawUser) return null;

  const groups = Array.isArray(rawUser.groups) ? rawUser.groups : [];
  const activeGroupId = normalizeId(rawUser.activeGroupId) || normalizeId(groups[0]?.groupId);
  const membership = groups.find(
    (group) => normalizeId(group.groupId) === activeGroupId
  );

  return {
    ...rawUser,
    groups,
    activeGroupId,
    role          : membership?.role           ?? rawUser.role           ?? null,
    balance       : membership?.balance        ?? rawUser.balance        ?? 0,
    adminShareOwed: membership?.adminShareOwed ?? rawUser.adminShareOwed ?? 0,
    adminSharePaid: membership?.adminSharePaid ?? rawUser.adminSharePaid ?? 0,
  };
};

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [token,   setToken]   = useState(localStorage.getItem('splitnest_token'));

  const syncUserFromServer = useCallback(async () => {
    const res = await authAPI.getMe();
    const normalizedUser = normalizeUser(res.data.user);
    setUser(normalizedUser);
    localStorage.setItem('splitnest_user', JSON.stringify(normalizedUser));
    return normalizedUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('splitnest_token');
    localStorage.removeItem('splitnest_user');
    setToken(null); setUser(null);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('splitnest_token');
      const savedUser  = localStorage.getItem('splitnest_user');
      if (savedToken && savedUser) {
        try {
          setUser(normalizeUser(JSON.parse(savedUser)));
          await syncUserFromServer();
        } catch { logout(); }
      }
      setLoading(false);
    };
    initAuth();
  }, [logout, syncUserFromServer]);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token, user } = res.data;
    const normalizedUser = normalizeUser(user);
    localStorage.setItem('splitnest_token', token);
    localStorage.setItem('splitnest_user', JSON.stringify(normalizedUser));
    setToken(token); setUser(normalizedUser);
    return await syncUserFromServer();
  }, [syncUserFromServer]);

  const register = useCallback(async (data) => {
    const res = await authAPI.register(data);
    const { token, user } = res.data;
    const normalizedUser = normalizeUser(user);
    localStorage.setItem('splitnest_token', token);
    localStorage.setItem('splitnest_user', JSON.stringify(normalizedUser));
    setToken(token); setUser(normalizedUser);
    return await syncUserFromServer();
  }, [syncUserFromServer]);

  const updateUser = useCallback((updatedUser) => {
    const normalizedUser = normalizeUser(updatedUser);
    setUser(normalizedUser);
    localStorage.setItem('splitnest_user', JSON.stringify(normalizedUser));
  }, []);

  const switchGroup = useCallback(async (groupId) => {
    try {
      const normalizedGroupId = normalizeId(groupId);
      const currentActiveGroupId = normalizeId(user?.activeGroupId);

      if (!normalizedGroupId) {
        const remainingGroups = (user?.groups || []).filter(
          (group) => normalizeId(group.groupId) !== currentActiveGroupId
        );
        updateUser({
          ...user,
          groups: remainingGroups,
          activeGroupId: normalizeId(remainingGroups[0]?.groupId),
        });
        return true;
      }

      await authAPI.switchGroup(normalizedGroupId);
      const membership = user?.groups?.find(
        (group) => normalizeId(group.groupId) === normalizedGroupId
      );
      updateUser({
        ...user, activeGroupId: normalizedGroupId,
        role          : membership?.role           || null,
        balance       : membership?.balance        || 0,
        adminShareOwed: membership?.adminShareOwed || 0,
        adminSharePaid: membership?.adminSharePaid || 0,
      });
      await syncUserFromServer();
      return true;
    } catch (err) { console.error('Switch group failed:', err); return false; }
  }, [syncUserFromServer, updateUser, user]);

  const activeGroupId = normalizeId(user?.activeGroupId);
  const activeGroup   = user?.groups?.find(
    (group) => normalizeId(group.groupId) === activeGroupId
  );
  const isAdmin  = activeGroup?.role === 'admin';
  const myGroups = user?.groups || [];

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, register, logout, updateUser, switchGroup,
      isAdmin, isAuthenticated: !!user, activeGroupId, activeGroup, myGroups,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
