import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "../api";
import { getToken } from "../api/client";

const AuthContext = createContext(null);

// Who is logged in. Checks the saved token with /api/auth/me on start.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api
      .getMe()
      .then(setUser)
      .catch(() => {
        api.logout();
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const u = await api.login(email, password);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    const u = await api.register(payload);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, checking, login, register, logout }), [user, checking, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
