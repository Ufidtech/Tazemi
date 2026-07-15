import { useState, useEffect } from "react";
import { DashboardLayout, SearchBar, Badge } from "@components";
import {
  fetchAggregators,
  registerAggregator,
} from "../../../services/tazemiDb";

export default function AggregatorsPage() {
  const [aggregators, setAggregators] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchAggregators();
        if (!cancelled) setAggregators(data || []);
      } catch {
        if (!cancelled) {
          setError(
            "Could not load aggregators. Check your internet connection and try again.",
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

  const filtered = aggregators.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.name?.toLowerCase().includes(q) ||
      a.contact?.toLowerCase().includes(q) ||
      a.id?.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout active="/dashboard/aggregators" title="Aggregators">
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by name, phone, or ID"
      >
        <button
          onClick={() => setShowRegister(true)}
          className="px-4 py-2.5 rounded-lg bg-deep text-white text-sm font-semibold hover:bg-teal whitespace-nowrap"
        >
          Register New
        </button>
      </SearchBar>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          Loading aggregators…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No aggregators found.
        </div>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-deep text-white text-left">
                <th className="p-3">ID</th>
                <th className="p-3">Name</th>
                <th className="p-3 hidden sm:table-cell">Phone</th>
                <th className="p-3 hidden md:table-cell">Location</th>
                <th className="p-3">Status</th>
                <th className="p-3 hidden sm:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="p-3 font-mono font-semibold">{a.id}</td>
                  <td className="p-3">{a.name}</td>
                  <td className="p-3 hidden sm:table-cell">{a.contact}</td>
                  <td className="p-3 hidden md:table-cell">
                    {a.location || "—"}
                  </td>
                  <td className="p-3">
                    <Badge status={a.status} />
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    {a.joined || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          onDone={() => {
            setShowRegister(false);
            reload();
          }}
        />
      )}
    </DashboardLayout>
  );
}

function RegisterModal({ onClose, onDone }) {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [rfidUid, setRfidUid] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !fullName.trim() ||
      !phoneNumber.trim() ||
      !rfidUid.trim() ||
      !photoFile
    ) {
      setError("All fields are required, including a photo.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await registerAggregator({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        rfidUid: rfidUid.trim(),
        photoFile,
      });
      onDone();
    } catch {
      setError("Could not save. Check your internet connection and try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold text-deep mb-4">
          Register Aggregator
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 08012345678"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">RFID UID</label>
            <input
              type="text"
              value={rfidUid}
              onChange={(e) => setRfidUid(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
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
              {submitting ? "Saving…" : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
