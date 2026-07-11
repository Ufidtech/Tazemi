import { useState, useEffect } from "react";
import { DashboardLayout, SearchBar, Badge } from "@components";
import { fetchAggregators } from "../../../services/tazemiDb";

export default function AggregatorsPage() {
  const [aggregators, setAggregators] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAggregators();
        setAggregators(data || []);
      } catch {
        setError("Could not load aggregators. Check your internet connection and try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
        {/*
          TODO: registration is intentionally not wired up yet. The backend
          /aggregators/register endpoint requires market_location, nin_or_bvn,
          and initial_topup, which NewTazemi.docx explicitly excludes.
          Waiting on backend dev to confirm which spec is authoritative —
          see the message sent asking them to clarify. Once resolved, build
          RegisterAggregatorForm.jsx and wire this button to it.
        */}
        <button
          disabled
          title="Waiting on backend confirmation of registration fields"
          className="px-4 py-2.5 rounded-lg bg-gray-200 text-gray-400 text-sm font-semibold cursor-not-allowed whitespace-nowrap"
        >
          Register New (pending backend)
        </button>
      </SearchBar>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading aggregators…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No aggregators found.</div>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-deep text-white text-left">
                <th className="p-3">ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Location</th>
                <th className="p-3">Status</th>
                <th className="p-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 last:border-0">
                  <td className="p-3 font-mono font-semibold">{a.id}</td>
                  <td className="p-3">{a.name}</td>
                  <td className="p-3">{a.contact}</td>
                  <td className="p-3">{a.location || "—"}</td>
                  <td className="p-3"><Badge status={a.status} /></td>
                  <td className="p-3">{a.joined || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
