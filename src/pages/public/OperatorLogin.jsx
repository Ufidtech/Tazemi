import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/Tazemi-logo.png";

export default function OperatorLogin() {
  const [operatorId, setOperatorId] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!operatorId.trim() || !pin.trim()) {
      setError("Enter your Operator ID and PIN.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await login({ operatorId: operatorId.trim(), pin: pin.trim() });
      navigate("/dashboard/aggregators", { replace: true });
    } catch (err) {
      setError(err?.message || "Invalid Operator ID or PIN.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-deep flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-1">
          <img src={logo} alt="Tazémi" className="h-8 w-auto" />
          <h1 className="text-2xl font-black text-deep">TAZÉMI</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">Operator sign in</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Operator ID
            </label>
            <input
              type="text"
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              placeholder="OP-KN-001"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-deep text-white text-sm font-semibold hover:bg-teal disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-6 text-center">
          Don't have an Operator ID? Ask your CEO/admin to create one in
          Settings.
        </p>
      </div>
    </div>
  );
}
