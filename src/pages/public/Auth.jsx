import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar, Footer, PageMeta } from "../../components";
import { useAuth } from "../../context/AuthContext";

export default function Auth() {
  const navigate = useNavigate();
  const {
    login,
    signup,
    roles,
    user,
    loading: authLoading,
    setError: setAuthError,
  } = useAuth();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "ceo",
  });

  const availableRoles = useMemo(() => roles || [], [roles]);

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard", { replace: true });
  }, [authLoading, user, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await signup({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        });
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message = err.message || "Authentication failed";
      setError(message);
      setAuthError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageMeta title="Auth" description="Login or sign up" url="/auth" />
      <Navbar />
      <div className="min-h-[70vh] flex items-center justify-center px-6 py-16 bg-mist">
        {authLoading ? (
          <div className="card w-full max-w-md p-6 bg-white text-center text-gray-500">
            Loading authentication...
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="card w-full max-w-md p-6 space-y-4 bg-white"
          >
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 py-2 rounded-lg ${mode === "login" ? "bg-teal text-white" : "bg-gray-100"}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 py-2 rounded-lg ${mode === "signup" ? "bg-teal text-white" : "bg-gray-100"}`}
              >
                Sign Up
              </button>
            </div>

            <h1 className="text-2xl font-black text-deep">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>

            {mode === "signup" && (
              <>
                <input
                  className="w-full border rounded-lg px-4 py-3"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <select
                  className="w-full border rounded-lg px-4 py-3"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {(availableRoles.length
                    ? availableRoles
                    : [
                        "ceo",
                        "admin",
                        "research",
                        "ops",
                        "read-only",
                        "board",
                        "investor",
                      ]
                  ).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </>
            )}
            <input
              className="w-full border rounded-lg px-4 py-3"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="w-full border rounded-lg px-4 py-3"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            {error && <div className="text-sm text-tomato">{error}</div>}

            <button
              disabled={loading}
              className="w-full bg-teal text-white py-3 rounded-lg font-semibold disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Login"
                  : "Sign Up"}
            </button>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}
