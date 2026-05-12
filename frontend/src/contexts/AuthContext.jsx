import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  fetchMe,
  getStoredUser,
  login as apiLogin,
  logoutSession,
  register as apiRegister,
} from '../services/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [authLoading, setAuthLoading] = useState(true);

  // Restore session once on mount
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
    return me;
  }, []);

  const logout = useCallback(async () => {
    await logoutSession();
    setUser(null);
  }, []);

  const register = useCallback(async (payload) => {
    await apiRegister(payload);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
    return me;
  }, []);

  return (
    <AuthContext.Provider value={{ user, authLoading, login, logout, register, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
