import { useState, useEffect } from "react";
import { DashboardLayout, SearchBar, Badge } from "@components";
import {
  fetchCrates,
  fetchAggregators,
  assignCrate,
  dispatchCrate,
  returnCrate,
} from "../../../services/tazemiDb";

const STATUS_FILTERS = [
  "all",
  "available",
  "in_use",
  "dispatched",
  "returned",
  "damaged",
  "lost",
];

export default function CratesPage() {
  const [crates, setCrates] = useState([]);
  const [aggregators, setAggregators] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionCrate, setActionCrate] = useState(null); // { crate, mode: "assign" | "return" }

  // reloadKey lets action handlers (assign/dispatch/return) trigger a
  // refetch without calling a locally-defined setState-calling function
  // directly from inside the effect (that pattern trips the
  // react-hooks/set-state-in-effect rule — the fetch has to happen inline).
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [crateList, aggList] = await Promise.all([
          fetchCrates(statusFilter === "all" ? {} : { status: statusFilter }),
          fetchAggregators(),
        ]);
        if (cancelled) return;
        setCrates(crateList || []);
        setAggregators(aggList || []);
      } catch {
        if (!cancelled) {
          setError(
            "Could not load crates. Check your internet connection and try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, reloadKey]);

  const filtered = crates.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.crate_id?.toLowerCase().includes(q) ||
      c.current_aggregator_id?.toLowerCase().includes(q) ||
      c.current_batch_ref?.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout active="/dashboard/crates" title="Crates">
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border ${
              statusFilter === s
                ? "bg-deep text-white border-deep"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by crate ID, aggregator ID, or batch ref"
      />

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading crates…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No crates match this filter.
        </div>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-deep text-white text-left">
                <th className="p-3">Crate ID</th>
                <th className="p-3 hidden md:table-cell">Grade</th>
                <th className="p-3">Status</th>
                <th className="p-3">Assigned To</th>
                <th className="p-3 hidden sm:table-cell">Batch Ref</th>
                <th className="p-3 hidden md:table-cell">Condition</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.crate_id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="p-3 font-mono font-semibold">{c.crate_id}</td>
                  <td className="p-3 hidden md:table-cell">{c.grade}</td>
                  <td className="p-3">
                    <Badge status={c.status} />
                  </td>
                  <td className="p-3">{c.current_aggregator_id || "—"}</td>
                  <td className="p-3 hidden sm:table-cell">
                    {c.current_batch_ref || "—"}
                  </td>
                  <td className="p-3 capitalize hidden md:table-cell">
                    {c.condition}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {c.status === "available" && (
                      <button
                        onClick={() =>
                          setActionCrate({ crate: c, mode: "assign" })
                        }
                        className="text-teal font-semibold hover:underline text-xs"
                      >
                        Assign
                      </button>
                    )}
                    {c.status === "in_use" && (
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={async () => {
                            await dispatchCrate(c.crate_id);
                            reload();
                          }}
                          className="text-blue-600 font-semibold hover:underline text-xs"
                        >
                          Dispatch
                        </button>
                        <button
                          onClick={() =>
                            setActionCrate({ crate: c, mode: "return" })
                          }
                          className="text-amber-600 font-semibold hover:underline text-xs"
                        >
                          Return
                        </button>
                      </div>
                    )}
                    {c.status === "dispatched" && (
                      <button
                        onClick={() =>
                          setActionCrate({ crate: c, mode: "return" })
                        }
                        className="text-amber-600 font-semibold hover:underline text-xs"
                      >
                        Return
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {actionCrate && (
        <CrateActionModal
          crate={actionCrate.crate}
          mode={actionCrate.mode}
          aggregators={aggregators}
          onClose={() => setActionCrate(null)}
          onDone={() => {
            setActionCrate(null);
            reload();
          }}
        />
      )}
    </DashboardLayout>
  );
}

function CrateActionModal({ crate, mode, aggregators, onClose, onDone }) {
  const [aggregatorId, setAggregatorId] = useState("");
  const [batchRef, setBatchRef] = useState("");
  const [condition, setCondition] = useState("serviceable");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (mode === "assign") {
        if (!aggregatorId || !batchRef.trim()) {
          setError("Select an aggregator and enter a batch reference.");
          setSubmitting(false);
          return;
        }
        await assignCrate({
          crateId: crate.crate_id,
          aggregatorId,
          batchRef: batchRef.trim(),
        });
      } else {
        await returnCrate({ crateId: crate.crate_id, condition });
      }
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
          {mode === "assign"
            ? `Assign ${crate.crate_id}`
            : `Return ${crate.crate_id}`}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "assign" ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Aggregator
                </label>
                <select
                  value={aggregatorId}
                  onChange={(e) => setAggregatorId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select aggregator</option>
                  {aggregators.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Batch Reference
                </label>
                <input
                  type="text"
                  value={batchRef}
                  onChange={(e) => setBatchRef(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. BATCH-KN-014"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="serviceable">Serviceable</option>
                <option value="damaged">Damaged</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          )}

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
              {submitting ? "Saving…" : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
