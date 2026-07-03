import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar, Footer, PageMeta } from "../../components";
import { useAuth } from "../../context/AuthContext";

export default function Auth() {
  const navigate = useNavigate();
  const {
    login,
    user,
    loading: authLoading,
    setError: setAuthError,
  } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard", { replace: true });
  }, [authLoading, user, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login({ email: form.email, password: form.password });
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
      <PageMeta title="Auth" description="Tazemi staff login" url="/auth" />
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
            <h1 className="text-2xl font-black text-deep">
              Tazemi Staff Login
            </h1>
            <p className="text-sm text-gray-600">
              Internal dashboard access only. Use your assigned credentials.
            </p>

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
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}
