import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  fetchMe,
  getStoredUser,
  login as apiLogin,
  logoutSession,
  register as apiRegister,
  requestRegistrationCode as apiRequestRegistrationCode,
} from '../services/authApi';

const AuthContext = createContext(null);

function shouldShowHotDealsModal(me) {
  if (!me?.id) return false;
  return String(me.role ?? '').toLowerCase() !== 'admin';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [authLoading, setAuthLoading] = useState(true);
  const [pendingHotDealsModal, setPendingHotDealsModal] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMe()
      .then((me) => { if (active) setUser(me); })
      .finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    const me = await apiLogin(email, password);
    setUser(me);
    if (shouldShowHotDealsModal(me)) {
      setPendingHotDealsModal(true);
    }
    return me;
  }, []);

  const dismissHotDealsModal = useCallback(() => {
    setPendingHotDealsModal(false);
  }, []);

  const logout = useCallback(async () => {
    await logoutSession();
    setUser(null);
    setPendingHotDealsModal(false);
  }, []);

  const register = useCallback(async (payload) => {
    await apiRegister(payload);
  }, []);

  const requestRegistrationCode = useCallback(async (payload) => {
    await apiRequestRegistrationCode(payload);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
    return me;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        login,
        logout,
        register,
        requestRegistrationCode,
        refreshUser,
        pendingHotDealsModal,
        dismissHotDealsModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
