import { useState, useEffect } from "react";
import { DashboardLayout } from "@components";
import { fetchOperators, createOperator, deleteOperator } from "../../../services/tazemiDb";

export default function SettingsPage() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  // reloadKey triggers a refetch from action handlers without calling a
  // locally-defined setState-calling function directly inside the effect.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchOperators();
        if (!cancelled) setOperators(data || []);
      } catch {
        if (!cancelled) {
          setError("Could not load operators. Check your internet connection and try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleRemove = async (operatorId) => {
    // NOTE: spec asks for "deactivate," but the backend only supports
    // permanent delete (no status/active field on OperatorPatch). Using
    // delete for now — flagged to backend dev to add a reversible
    // deactivate instead, since delete can't be undone from the UI.
    if (!window.confirm(`Remove operator ${operatorId}? This cannot be undone from here.`)) return;
    try {
      await deleteOperator(operatorId);
      reload();
    } catch {
      setError("Could not remove operator. Check your internet connection and try again.");
    }
  };

  return (
    <DashboardLayout active="/dashboard/settings" title="Settings">
      <div className="bg-amber-50 text-amber-800 text-sm rounded-lg p-3 mb-5">
        Hub name / location settings aren't available yet — no backend endpoint
        exists for it. Added to the list of things to confirm with the backend
        dev.
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-deep">Operator Accounts</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 rounded-lg bg-deep text-white text-sm font-semibold hover:bg-teal"
        >
          Add Operator
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading operators…</div>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-deep text-white text-left">
                <th className="p-3">ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Role</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {operators.map((op) => (
                <tr key={op.operator_id || op.id} className="border-b border-gray-100 last:border-0">
                  <td className="p-3 font-mono">{op.operator_id || op.id}</td>
                  <td className="p-3">{op.name}</td>
                  <td className="p-3 capitalize">{op.role}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleRemove(op.operator_id || op.id)}
                      className="text-red-600 font-semibold hover:underline text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddOperatorModal onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); reload(); }} />
      )}
    </DashboardLayout>
  );
}

function AddOperatorModal({ onClose, onDone }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("field_operator");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !/^\d{4,6}$/.test(pin)) {
      setError("Name is required and PIN must be 4-6 digits.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await createOperator({ name: name.trim(), role, pin });
      onDone();
    } catch {
      setError("Could not save. Check your internet connection and try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold text-deep mb-4">Add Operator</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="field_operator">Field Operator</option>
              <option value="ceo">CEO / Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">PIN (4-6 digits)</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-semibold bg-deep text-white hover:bg-teal disabled:opacity-50">
              {submitting ? "Saving…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
