import { useState, useEffect } from "react";
import { DashboardLayout, SearchBar } from "@components";
import { fetchTransactions } from "../../../services/tazemiDb";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchTransactions();
        setTransactions(data || []);
      } catch {
        setError(
          "Could not load transactions. Check your internet connection and try again.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = transactions.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.aggregator_id?.toLowerCase().includes(q) ||
      t.id?.toLowerCase().includes(q) ||
      t.type?.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout active="/dashboard/transactions" title="Transactions">
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by aggregator ID, transaction ID, or type"
      />

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          Loading transactions…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No transactions yet. These are logged automatically by TAPU V1.
        </div>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-deep text-white text-left">
                <th className="p-3 hidden sm:table-cell">Transaction ID</th>
                <th className="p-3">Aggregator</th>
                <th className="p-3">Type</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="p-3 font-mono hidden sm:table-cell">{t.id}</td>
                  <td className="p-3">{t.aggregator_id}</td>
                  <td className="p-3 capitalize">{t.type || "—"}</td>
                  <td className="p-3">{t.amount ?? "—"}</td>
                  <td className="p-3">
                    {t.created_at
                      ? new Date(t.created_at).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
