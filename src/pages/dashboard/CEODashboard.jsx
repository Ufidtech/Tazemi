import { useEffect, useState } from "react";
import { DashboardLayout, StatCard } from "@components";
import {
  fetchAggregators,
  fetchCrates,
  fetchTransactions,
} from "../../services/tazemiDb";

/**
 * Rebuilt to match NewTazemi.docx Page 0 exactly: six numbers, nothing else,
 * plus a Recent Activity feed of the last 5 transactions. Previously this
 * page read from a `/dashboard/kpis` snapshot node that nothing kept in
 * sync with the real /aggregators, /crates, /transactions data — so it
 * could show stale or zero values regardless of what was actually in the
 * system. This version computes every number live from the same endpoints
 * the rest of the app already uses and trusts.
 *
 * NOTE on "crate count" in the activity feed: the spec asks for it, but the
 * backend's /transactions collection currently only holds financial
 * top-up/refund records (old PRD v2.1 flow) — there's no crate_count field
 * because that would come from actual TAPU V1 scan events, which aren't
 * wired up yet (hardware integration is still pending). Add it here once
 * that data exists; don't fake it in the meantime.
 */
export default function CEODashboard() {
  const [aggregators, setAggregators] = useState([]);
  const [crates, setCrates] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [aggList, crateList, txnList] = await Promise.all([
          fetchAggregators(),
          fetchCrates(),
          fetchTransactions(),
        ]);
        if (cancelled) return;
        setAggregators(aggList || []);
        setCrates(crateList || []);
        setTransactions(txnList || []);
      } catch {
        if (!cancelled) {
          setError(
            "Could not load dashboard data. Check your internet connection and try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isToday = (isoString) => {
    if (!isoString) return false;
    const d = new Date(isoString);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const cratesProcessedToday = crates.filter((c) =>
    isToday(c.dispatch_date),
  ).length;

  const revenueToday = transactions
    .filter((t) => isToday(t.created_at))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const aggregatorIdsWithTxn = new Set(
    transactions.map((t) => t.aggregator_id),
  );
  const activeAggregators = aggregators.filter((a) =>
    aggregatorIdsWithTxn.has(a.id),
  ).length;

  const cratesInHub = crates.filter((c) => c.status === "in_use").length;
  const cratesDispatchedAllTime = crates.filter((c) => c.dispatch_date).length;
  const availableCrates = crates.filter((c) => c.status === "available").length;

  const recentActivity = [...transactions]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5);

  const aggregatorName = (id) =>
    aggregators.find((a) => a.id === id)?.name || id || "—";

  return (
    <DashboardLayout active="/dashboard" title="Executive Dashboard">
      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          Loading dashboard…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
            <StatCard
              icon="📦"
              value={cratesProcessedToday}
              label="Total Crates Processed Today"
            />
            <StatCard
              icon="💰"
              value={`₦${revenueToday.toLocaleString()}`}
              label="Total Revenue Today"
            />
            <StatCard
              icon="🏢"
              value={activeAggregators}
              label="Active Aggregators"
            />
            <StatCard
              icon="🏭"
              value={cratesInHub}
              label="Crates Currently In Hub"
            />
            <StatCard
              icon="🚚"
              value={cratesDispatchedAllTime}
              label="Crates Dispatched (All Time)"
            />
            <StatCard
              icon="✅"
              value={availableCrates}
              label="Available Crates"
            />
          </div>

          <div className="bg-white rounded-xl p-5">
            <h2 className="text-lg font-bold text-deep mb-4">
              Recent Activity
            </h2>
            {recentActivity.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-8">
                No transactions yet. These are logged automatically by TAPU V1.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentActivity.map((t) => (
                  <div
                    key={t.id}
                    className="flex justify-between items-center py-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">
                        {aggregatorName(t.aggregator_id)}
                      </div>
                      <div className="text-xs text-gray-400 capitalize">
                        {t.type || "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        ₦{(Number(t.amount) || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {t.created_at
                          ? new Date(t.created_at).toLocaleTimeString()
                          : "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
