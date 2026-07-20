import { useState, useEffect } from "react";
import { DashboardLayout, SearchBar, Badge } from "@components";
import {
  fetchAggregators,
  registerAggregator,
  fetchTransactions,
} from "../../../services/tazemiDb";

export default function AggregatorsPage() {
  const [aggregators, setAggregators] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [viewingId, setViewingId] = useState(null);
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

  const viewingAggregator = aggregators.find((a) => a.id === viewingId);

  return (
    <DashboardLayout active="/dashboard/aggregators" title="Aggregators">
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by name, phone, or AGG-ID"
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
                <th className="p-3">AGG-ID</th>
                <th className="p-3">Name</th>
                <th className="p-3 hidden sm:table-cell">Phone</th>
                <th className="p-3 hidden md:table-cell">Location</th>
                <th className="p-3 hidden sm:table-cell">Registration Date</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
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
                  <td className="p-3 hidden sm:table-cell">
                    {a.joined || "—"}
                  </td>
                  <td className="p-3">
                    <Badge status={a.status} />
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setViewingId(a.id)}
                      className="text-teal font-semibold hover:underline text-xs"
                    >
                      View
                    </button>
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

      {viewingAggregator && (
        <AggregatorProfileModal
          aggregator={viewingAggregator}
          onClose={() => setViewingId(null)}
        />
      )}
    </DashboardLayout>
  );
}

function AggregatorProfileModal({ aggregator, onClose }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchTransactions(aggregator.id);
        if (!cancelled) setTransactions(data || []);
      } catch {
        if (!cancelled) {
          setError("Could not load transaction history.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [aggregator.id]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-bold text-deep">Aggregator Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-4 mb-5">
          {aggregator.photo_url ? (
            <img
              src={aggregator.photo_url}
              alt={aggregator.name}
              className="w-20 h-20 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs shrink-0">
              No photo
            </div>
          )}
          <div className="min-w-0">
            <div className="text-lg font-bold text-deep truncate">
              {aggregator.name}
            </div>
            <div className="text-sm text-gray-500 font-mono">
              {aggregator.id}
            </div>
            <div className="mt-1">
              <Badge status={aggregator.status} />
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm mb-6">
          <div>
            <dt className="text-gray-400">Phone Number</dt>
            <dd className="font-medium">{aggregator.contact || "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Location</dt>
            <dd className="font-medium">{aggregator.location || "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Registration Date</dt>
            <dd className="font-medium">{aggregator.joined || "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-400">RFID UID</dt>
            <dd className="font-medium font-mono">
              {aggregator.rfid_uid || "—"}
            </dd>
          </div>
        </dl>

        <div className="text-sm font-bold text-deep mb-2">
          Transaction History
        </div>
        {loading ? (
          <div className="text-sm text-gray-400 py-4 text-center">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-600 py-2">{error}</div>
        ) : transactions.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">
            No transactions yet.
          </div>
        ) : (
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex justify-between items-center px-3 py-2 text-sm border-b border-gray-100 last:border-0"
              >
                <div>
                  <div className="capitalize">{t.type || "—"}</div>
                  <div className="text-xs text-gray-400">
                    {t.created_at
                      ? new Date(t.created_at).toLocaleString()
                      : "—"}
                  </div>
                </div>
                <div className="font-semibold">{t.amount ?? "—"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RegisterModal({ onClose, onDone }) {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [rfidUid, setRfidUid] = useState("");
  const [location, setLocation] = useState("");
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
        marketLocation: location.trim(),
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
            <label className="block text-sm font-medium mb-1">
              Location{" "}
              <span className="text-gray-400 font-normal">(market/area)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Yankaba Market, Kano"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
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
