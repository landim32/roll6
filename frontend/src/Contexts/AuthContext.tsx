import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../Services/authService';
import {
  AUTH_STORAGE_KEY, CAMPAIGN_STORAGE_KEY, CHARACTER_STORAGE_KEY, readStoredSession, setUnauthorizedHandler,
} from '../Services/apiHelpers';
import type { UserInfo, UserInsertInfo, UserLoginInfo, UserPasswordInfo, UserTokenInfo } from '../types/auth';

interface AuthContextType {
  // State
  session: UserTokenInfo | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  // Actions
  login: (data: UserLoginInfo) => Promise<UserTokenInfo>;
  register: (data: UserInsertInfo) => Promise<UserTokenInfo>;
  logout: () => void;
  /** Renames the user and updates the stored session (token unchanged). */
  updateName: (name: string) => Promise<UserInfo>;
  /** Changes the password; the session stays valid. */
  changePassword: (data: UserPasswordInfo) => Promise<void>;
  clearError: () => void;
  /** Called by the app when any API call answers 401 (expired session). */
  setOnSessionExpired: (handler: (() => void) | undefined) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Session restored from localStorage, discarded when already expired. */
const loadSession = (): UserTokenInfo | null => {
  const stored = readStoredSession();
  if (!stored) return null;
  if (new Date(stored.expiresAt).getTime() <= Date.now()) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
  return stored;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<UserTokenInfo | null>(loadSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onSessionExpired, setOnSessionExpiredState] = useState<(() => void) | undefined>(undefined);

  const handleError = (err: unknown): never => {
    setError(err instanceof Error ? err.message : 'Unknown error');
    throw err;
  };

  const storeSession = useCallback((value: UserTokenInfo) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
    setSession(value);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
    localStorage.removeItem(CHARACTER_STORAGE_KEY);
    setSession(null);
  }, []);

  const login = useCallback(async (data: UserLoginInfo): Promise<UserTokenInfo> => {
    try {
      setLoading(true);
      setError(null);
      const result = await authService.login(data);
      storeSession(result);
      return result;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, [storeSession]);

  const register = useCallback(async (data: UserInsertInfo): Promise<UserTokenInfo> => {
    try {
      setLoading(true);
      setError(null);
      await authService.register(data);
      const result = await authService.login({ email: data.email, password: data.password });
      storeSession(result);
      return result;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, [storeSession]);

  const updateName = useCallback(async (name: string): Promise<UserInfo> => {
    try {
      setLoading(true);
      setError(null);
      const user = await authService.rename({ name: name.trim() });
      // Read the stored session instead of the state so a stale closure never drops the token.
      const current = readStoredSession();
      if (current) storeSession({ ...current, user });
      return user;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, [storeSession]);

  const changePassword = useCallback(async (data: UserPasswordInfo): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await authService.changePassword(data);
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const setOnSessionExpired = useCallback((handler: (() => void) | undefined) => {
    setOnSessionExpiredState(() => handler);
  }, []);

  // Any 401 from the API ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      onSessionExpired?.();
    });
    return () => setUnauthorizedHandler(undefined);
  }, [logout, onSessionExpired]);

  const value = useMemo<AuthContextType>(() => ({
    session, isAuthenticated: session !== null, loading, error,
    login, register, logout, updateName, changePassword, clearError, setOnSessionExpired,
  }), [session, loading, error, login, register, logout, updateName, changePassword, clearError, setOnSessionExpired]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
