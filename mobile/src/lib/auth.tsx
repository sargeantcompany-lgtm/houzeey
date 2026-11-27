import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, ApiError, getToken, setToken, type User } from './api';

type AuthState = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role: 'buyer' | 'seller' }) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // On launch, restore the saved login (if the token is still valid).
  useEffect(() => {
    (async () => {
      try {
        if (await getToken()) setUser(await api.auth.me());
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) await setToken(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: u } = await api.auth.login(email.trim(), password);
    await setToken(token);
    setUser(u);
  }, []);

  const register = useCallback(async (data: { name: string; email: string; password: string; role: 'buyer' | 'seller' }) => {
    const { token, user: u } = await api.auth.register({ ...data, email: data.email.trim(), name: data.name.trim() });
    await setToken(token);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await setToken(null);
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    await api.auth.deleteAccount(password);
    await setToken(null);
    setUser(null);
  }, []);

  // Reload the account (e.g. after an ID check is approved).
  const refreshUser = useCallback(async () => {
    try {
      setUser(await api.auth.me());
    } catch {
      // keep the current state; the next request will surface any problem
    }
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, register, logout, deleteAccount, refreshUser }),
    [user, ready, login, register, logout, deleteAccount, refreshUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
