import { useState, useEffect } from "react";
import { DashboardLayout } from "@components";
import {
  fetchOperators,
  createOperator,
  updateOperator,
  fetchHubSettings,
  updateHubSettings,
} from "../../../services/tazemiDb";

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
          setError(
            "Could not load operators. Check your internet connection and try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleToggleStatus = async (operator) => {
    const operatorId = operator.operator_id || operator.id;
    const isActive = operator.status !== "inactive";
    const nextStatus = isActive ? "inactive" : "active";
    const verb = isActive ? "Deactivate" : "Reactivate";
    if (!window.confirm(`${verb} operator ${operatorId}?`)) return;
    try {
      await updateOperator(operatorId, { status: nextStatus });
      reload();
    } catch {
      setError("Could not save. Check your internet connection and try again.");
    }
  };

  return (
    <DashboardLayout active="/dashboard/settings" title="Settings">
      <HubSettings />

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 mt-8">
        <h2 className="text-lg font-bold text-deep">Operator Accounts</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 rounded-lg bg-deep text-white text-sm font-semibold hover:bg-teal"
        >
          Add Operator
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          Loading operators…
        </div>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-deep text-white text-left">
                <th className="p-3 hidden sm:table-cell">ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {operators.map((op) => {
                const isActive = op.status !== "inactive";
                return (
                  <tr
                    key={op.operator_id || op.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="p-3 font-mono hidden sm:table-cell">
                      {op.operator_id || op.id}
                    </td>
                    <td className="p-3">{op.name}</td>
                    <td className="p-3 capitalize">{op.role}</td>
                    <td className="p-3">
                      <span
                        className={`text-xs font-semibold ${isActive ? "text-teal" : "text-gray-400"}`}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleStatus(op)}
                        className={`font-semibold hover:underline text-xs ${isActive ? "text-red-600" : "text-teal"}`}
                      >
                        {isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddOperatorModal
          onClose={() => setShowAdd(false)}
          onDone={() => {
            setShowAdd(false);
            reload();
          }}
        />
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
            <label className="block text-sm font-medium mb-1">
              PIN (4-6 digits)
            </label>
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
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-deep text-white hover:bg-teal disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HubSettings() {
  const [hubName, setHubName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchHubSettings();
        if (!cancelled) {
          setHubName(data?.hub_name || "");
          setLocation(data?.location || "");
        }
      } catch {
        if (!cancelled) setError("Could not load hub settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateHubSettings({ hubName, location });
      setSaved(true);
    } catch {
      setError("Could not save. Check your internet connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-400">Loading hub settings…</div>;
  }

  return (
    <div className="bg-white rounded-lg p-5">
      <h2 className="text-lg font-bold text-deep mb-4">Hub Settings</h2>
      <form
        onSubmit={handleSave}
        className="grid sm:grid-cols-2 gap-4 items-end"
      >
        <div>
          <label className="block text-sm font-medium mb-1">Hub Name</label>
          <input
            type="text"
            value={hubName}
            onChange={(e) => setHubName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-deep text-white text-sm font-semibold hover:bg-teal disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {saved && (
            <span className="text-teal text-sm font-medium">Saved ✓</span>
          )}
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>
      </form>
    </div>
  );
}
