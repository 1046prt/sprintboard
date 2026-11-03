import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { TOKEN_KEY } from '../api/client.js';
import { authApi } from '../api/services.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  // Only "loading" while a stored token is being checked against the server.
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const startSession = useCallback((data) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  useEffect(() => {
    if (!token || user) return;
    let cancelled = false;
    authApi
      .profile()
      .then((profile) => !cancelled && setUser(profile))
      .catch(() => !cancelled && logout())
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [token, user, logout]);

  useEffect(() => {
    if (!token) setLoading(false);
  }, [token]);

  useEffect(() => {
    window.addEventListener('sprintboard:unauthorized', logout);
    return () => window.removeEventListener('sprintboard:unauthorized', logout);
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      isProjectHead: user?.role === 'project_head',
      isLead: user?.role === 'lead',
      isMember: user?.role === 'member',
      // True for anyone who manages other people.
      isManager: ['admin', 'project_head', 'lead'].includes(user?.role),
      login: async (credentials) => startSession(await authApi.login(credentials)),
      register: async (details) => startSession(await authApi.register(details)),
      logout,
    }),
    [user, token, loading, startSession, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Re-export useAuth here so existing imports from AuthContext.jsx keep working
export { useAuth } from './useAuth.js';
