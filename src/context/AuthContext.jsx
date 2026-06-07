import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearAuth,
  getAuthUser,
  login,
  logout,
  signup,
  subscribeToFirebaseAuth,
} from "../services/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getAuthUser());
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToFirebaseAuth((firebaseUser) => {
      if (!firebaseUser && !getAuthUser()) {
        clearAuth();
        setUser(null);
      }
    });

    setRoles([]);
    setLoading(false);

    return () => unsubscribe?.();
  }, []);

  const doLogin = async (payload) => {
    setError("");
    const nextUser = await login(payload);
    setUser(nextUser);
    return nextUser;
  };

  const doSignup = async (payload) => {
    setError("");
    const nextUser = await signup(payload);
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
      signup: doSignup,
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
