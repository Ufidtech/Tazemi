import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearAuth,
  fetchRoles,
  getAuthUser,
  login,
  logout,
  subscribeToFirebaseAuth,
} from "../services/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getAuthUser());
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Firebase is the source of truth for the session. If it reports
    // signed-out, drop any stale localStorage session — otherwise a
    // leftover entry keeps users "logged in" without authenticating.
    // (In local/backend mode the subscriber passes the stored user
    // through, so a valid stored session is never cleared there.)
    const unsubscribe = subscribeToFirebaseAuth((firebaseUser) => {
      if (!firebaseUser) {
        clearAuth();
        setUser(null);
      }
    });

    const loadRoles = async () => {
      try {
        const result = await fetchRoles();
        const roleList = Array.isArray(result) ? result : result?.roles || [];
        setRoles(roleList);
      } catch {
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    loadRoles();

    return () => unsubscribe?.();
  }, []);

  const doLogin = async (payload) => {
    setError("");
    const nextUser = await login(payload);
    setUser(nextUser);
    return nextUser;
  };

  const doLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuth();
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      roles,
      loading,
      error,
      setError,
      login: doLogin,
      logout: doLogout,
      isAuthenticated: !!user,
    }),
    [user, roles, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}