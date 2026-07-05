import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar, Footer, PageMeta } from "../../components";
import { useAuth } from "../../context/AuthContext";
import { resetPassword } from "../../services/auth";

export default function Auth() {
  const navigate = useNavigate();
  const {
    login,
    user,
    loading: authLoading,
    setError: setAuthError,
  } = useAuth();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [resetForm, setResetForm] = useState({
    tempPassword: "",
    newPassword: "",
  });

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard", { replace: true });
  }, [authLoading, user, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
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

  const onForgotPassword = async () => {
    setError("");
    setNotice("");
    setResetting(true);
    try {
      const message = await resetPassword({
        email: form.email,
        tempPassword: resetForm.tempPassword,
        newPassword: resetForm.newPassword,
      });
      setNotice(message);
      setShowReset(false);
      setResetForm({ tempPassword: "", newPassword: "" });
    } catch (err) {
      setError(err.message || "Could not reset password");
    } finally {
      setResetting(false);
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
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="w-full border rounded-lg px-4 py-3"
              type="password"
              placeholder="Password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            {error && <div className="text-sm text-tomato">{error}</div>}
            {notice && <div className="text-sm text-teal">{notice}</div>}

            <button
              disabled={loading}
              className="w-full bg-teal text-white py-3 rounded-lg font-semibold disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            {showReset ? (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm text-gray-600">
                  Forgot your password? Ask your CEO to generate a temporary
                  password, then enter it below with your email to set a new
                  password.
                </p>
                <input
                  className="w-full border rounded-lg px-4 py-3"
                  type="password"
                  placeholder="Temporary password from CEO"
                  autoComplete="one-time-code"
                  value={resetForm.tempPassword}
                  onChange={(e) =>
                    setResetForm({ ...resetForm, tempPassword: e.target.value })
                  }
                />
                <input
                  className="w-full border rounded-lg px-4 py-3"
                  type="password"
                  placeholder="New password (min 6 chars)"
                  autoComplete="new-password"
                  value={resetForm.newPassword}
                  onChange={(e) =>
                    setResetForm({ ...resetForm, newPassword: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={onForgotPassword}
                  disabled={resetting}
                  className="w-full bg-deep text-white py-3 rounded-lg font-semibold disabled:opacity-60"
                >
                  {resetting ? "Resetting password..." : "Reset password"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReset(false);
                    setError("");
                  }}
                  className="w-full text-sm text-gray-500 hover:text-teal transition"
                >
                  Back to login
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowReset(true);
                  setError("");
                  setNotice("");
                }}
                className="w-full text-sm text-gray-500 hover:text-teal transition"
              >
                Forgot password?
              </button>
            )}
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}
