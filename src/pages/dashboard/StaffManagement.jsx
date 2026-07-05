import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@components";
import { createStaffUser, fetchStaff, generateTempPassword } from "../../services/auth";

/**
 * StaffManagement (CEO only)
 *
 * Lets the CEO create staff accounts (email + password + role) which are
 * provisioned as Firebase users with a role claim on the backend.
 */
export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "field_operator" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tempResult, setTempResult] = useState(null); // { email, temp_password, expires_at }
  const [tempLoadingUid, setTempLoadingUid] = useState(null);

  const loadStaff = () => {
    fetchStaff()
      .then((data) => setStaff(Array.isArray(data) ? data : []))
      .catch(() => setStaff([]));
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const onChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
    setSuccess("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.email.includes("@")) return setError("Enter a valid email");
    if (form.password.length < 6) return setError("Password must be at least 6 characters");

    setLoading(true);
    try {
      const created = await createStaffUser(form);
      setSuccess(`Created ${created.email} as ${created.role}`);
      setForm({ name: "", email: "", password: "", role: "field_operator" });
      loadStaff();
    } catch (err) {
      setError(err.message || "Could not create staff account");
    } finally {
      setLoading(false);
    }
  };

  const onGenerateTemp = async (member) => {
    const uid = member.uid || member.id;
    setError("");
    setTempResult(null);
    setTempLoadingUid(uid);
    try {
      const result = await generateTempPassword(uid);
      setTempResult(result);
    } catch (err) {
      setError(err.message || "Could not generate temporary password");
    } finally {
      setTempLoadingUid(null);
    }
  };

  return (
    <DashboardLayout active="/dashboard/staff" title="Staff Management">
      <div className="max-w-4xl">
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-black text-deep mb-1">Create staff account</h2>
          <p className="text-sm text-gray-500 mb-5">
            New staff sign in at the login page with the email and password you set here.
          </p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              ✓ {success}
            </div>
          )}

          <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              className="border rounded-lg px-4 py-3"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
            />
            <input
              className="border rounded-lg px-4 py-3"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
            />
            <input
              className="border rounded-lg px-4 py-3"
              type="password"
              placeholder="Temporary password (min 6 chars)"
              value={form.password}
              onChange={(e) => onChange("password", e.target.value)}
            />
            <select
              className="border rounded-lg px-4 py-3 bg-white"
              value={form.role}
              onChange={(e) => onChange("role", e.target.value)}
            >
              <option value="field_operator">Field Operator</option>
              <option value="ceo">CEO</option>
            </select>
            <div className="sm:col-span-2">
              <button
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-teal text-white rounded-lg font-bold hover:bg-deep disabled:opacity-60 transition"
              >
                {loading ? "Creating…" : "Create staff account"}
              </button>
            </div>
          </form>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-black text-deep mb-4">Staff accounts</h2>
          {tempResult && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
              Temporary password for <strong>{tempResult.email}</strong>:{" "}
              <code className="font-mono font-bold">{tempResult.temp_password}</code>
              <p className="text-xs mt-1">
                Share it with the staff member — they enter it in “Forgot
                password?” on the login page to set a new password. Shown only
                once; expires{" "}
                {tempResult.expires_at
                  ? new Date(tempResult.expires_at).toLocaleString()
                  : "in 24 hours"}
                .
              </p>
            </div>
          )}
          {staff.length === 0 ? (
            <p className="text-sm text-gray-400">No staff accounts yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-mist">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Name</th>
                    <th className="px-4 py-2 font-semibold">Email</th>
                    <th className="px-4 py-2 font-semibold">Role</th>
                    <th className="px-4 py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.uid || s.email} className="border-t border-gray-100">
                      <td className="px-4 py-2">{s.name || "—"}</td>
                      <td className="px-4 py-2">{s.email}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-teal/10 text-teal">
                          {s.role}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => onGenerateTemp(s)}
                          disabled={tempLoadingUid === (s.uid || s.id)}
                          className="text-xs font-semibold text-teal hover:text-deep disabled:opacity-60 transition"
                        >
                          {tempLoadingUid === (s.uid || s.id)
                            ? "Generating…"
                            : "Generate temp password"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
