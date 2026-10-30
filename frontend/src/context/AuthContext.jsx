import { createContext, useCallback, useMemo, useState } from 'react';
import { AUTH_STORAGE_KEY } from '../utils/constants';

export const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);

  const login = useCallback((sessionUser) => {
    setUser(sessionUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isAuthenticated: !!user,
    }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
