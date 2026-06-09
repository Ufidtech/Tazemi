// ── COATING OPERATIONS PAGE ──────────────────────────────────
import React, { useEffect, useMemo, useState } from "react";
import { DashboardLayout, DemoBanner, SearchBar, Badge } from "@components";
import {
  fetchAggregators,
  fetchBatches,
  fetchTrials,
  fetchTrucks,
} from "../../services/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export function Operations() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setBatch] = useState(null);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    fetchBatches()
      .then((data) => setBatches(Array.isArray(data) ? data : []))
      .catch(() => setBatches([]));
  }, []);

  const filtered = batches.filter((b) => {
    const q = search.toLowerCase();
    const match =
      !q ||
      b.id.toLowerCase().includes(q) ||
      b.aggregator.toLowerCase().includes(q) ||
      b.formula.toLowerCase().includes(q) ||
      b.operator.toLowerCase().includes(q) ||
      b.date.includes(q);
    const mf = filter === "all" || b.status === filter;
    return match && mf;
  });

  return (
    <DashboardLayout active="/dashboard/operations" title="Coating Operations">
      <DemoBanner />
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by batch ID, aggregator, date, formula version, or operator..."
      >
        <div className="flex gap-2 flex-wrap">
          {["all", "coated", "in_transit", "delivered"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${filter === f ? "bg-teal text-white" : "bg-white border border-gray-200 text-gray-600"}`}
            >
              {f === "all"
                ? "All"
                : f === "in_transit"
                  ? "In Transit"
                  : f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </SearchBar>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {[
          ["📦", "Total Batches", batches.length],
          [
            "🥬",
            "Total Crates",
            batches.reduce((s, b) => s + b.crates, 0).toLocaleString(),
          ],
          [
            "⚖️",
            "Total Weight",
            `${(batches.reduce((s, b) => s + b.weight, 0) / 1000).toFixed(1)}t`,
          ],
        ].map(([i, l, v]) => (
          <div key={l} className="bg-deep text-white rounded-xl p-3.5 sm:p-4">
            <div className="text-xl mb-1">{i}</div>
            <div className="text-2xl font-black text-teal">{v}</div>
            <div className="text-white/60 text-xs mt-1">{l}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1100px] sm:min-w-0">
            <thead>
              <tr>
                {[
                  "Batch ID",
                  "Date",
                  "Aggregator",
                  "Crates",
                  "Weight",
                  "Formula",
                  "Operator",
                  "Pre-Grade",
                  "Post-Grade",
                  "Truck",
                  "Status",
                  "",
                ].map((h) => (
                  <th key={h} className="table-th-condensed sm:table-th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr
                  key={b.id}
                  className={i % 2 === 0 ? "table-tr-even" : "table-tr-odd"}
                >
                  <td className="table-td-condensed sm:table-td font-mono text-[11px] sm:text-xs font-bold text-deep">
                    {b.id}
                  </td>
                  <td className="table-td-condensed sm:table-td text-[11px] sm:text-xs">
                    {b.date}
                  </td>
                  <td className="table-td-condensed sm:table-td text-xs sm:text-sm">
                    {b.aggregator}
                  </td>
                  <td className="table-td-condensed sm:table-td">{b.crates}</td>
                  <td className="table-td-condensed sm:table-td text-[11px] sm:text-xs">
                    {b.weight.toLocaleString()}kg
                  </td>
                  <td className="table-td-condensed sm:table-td">
                    <span className="bg-teal/10 text-teal text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full">
                      {b.formula}
                    </span>
                  </td>
                  <td className="table-td-condensed sm:table-td text-[11px] sm:text-xs">
                    {b.operator.split(" ")[0]} {b.operator.split(" ")[1]}
                  </td>
                  <td className="table-td-condensed sm:table-td">
                    <span
                      className={`font-bold text-xs sm:text-sm ${b.pre_grade === "A" ? "text-teal" : b.pre_grade === "B" ? "text-amber" : "text-tomato"}`}
                    >
                      {b.pre_grade}
                    </span>
                  </td>
                  <td className="table-td-condensed sm:table-td">
                    <span
                      className={`font-bold text-xs sm:text-sm ${b.post_grade === "A" ? "text-teal" : b.post_grade === "B" ? "text-amber" : "text-tomato"}`}
                    >
                      {b.post_grade}
                    </span>
                  </td>
                  <td className="table-td-condensed sm:table-td text-[11px] sm:text-xs font-mono">
                    {b.truck || "—"}
                  </td>
                  <td className="table-td-condensed sm:table-td">
                    <Badge status={b.status} />
                  </td>
                  <td className="table-td-condensed sm:table-td">
                    <button
                      onClick={() => setBatch(b)}
                      className="text-teal text-xs font-semibold hover:underline"
                    >
                      Details →
                    </button>
                  </td>
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td
                    colSpan={12}
                    className="text-center py-10 text-gray-400 text-sm"
                  >
                    No batches match your search
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center py-8 px-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="bg-deep text-white p-5 rounded-t-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <div className="font-black text-teal text-lg">
                  {selected.id}
                </div>
                <div className="text-white/70 text-sm">
                  {selected.aggregator} · {selected.date}
                </div>
              </div>
              <button
                onClick={() => setBatch(null)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {[
                  ["Aggregator", selected.aggregator],
                  ["Location", selected.location],
                  ["Crates Coated", selected.crates],
                  ["Weight", `${selected.weight.toLocaleString()} kg`],
                  ["Formula", selected.formula],
                  ["Operator", selected.operator],
                  ["Pre-Coating Grade", selected.pre_grade],
                  ["Post-Coating Grade", selected.post_grade],
                  ["Assigned Truck", selected.truck || "Not assigned"],
                  ["Status", selected.status],
                ].map(([l, v]) => (
                  <div key={l} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">{l}</div>
                    <div className="font-semibold text-deep">{v}</div>
                  </div>
                ))}
              </div>
              {selected.notes && (
                <div className="bg-mist rounded-lg p-4 text-sm text-gray-700">
                  <strong>Notes: </strong>
                  {selected.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ── AGGREGATOR DIRECTORY ──────────────────────────────────────
export function Aggregators() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [aggregators, setAggregators] = useState([]);
  const [batches, setBatches] = useState([]);
  const [trucks, setTrucks] = useState([]);

  useEffect(() => {
    fetchAggregators()
      .then((data) => setAggregators(Array.isArray(data) ? data : []))
      .catch(() => setAggregators([]));
    fetchBatches()
      .then((data) => setBatches(Array.isArray(data) ? data : []))
      .catch(() => setBatches([]));
    fetchTrucks()
      .then((data) => setTrucks(Array.isArray(data) ? data : []))
      .catch(() => setTrucks([]));
  }, []);

  const filtered = aggregators.filter((a) => {
    const q = search.toLowerCase();
    const match =
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q);
    return match && (filter === "all" || a.status === filter);
  });

  const agg_batches = (id) => batches.filter((b) => b.aggregator_id === id);
  const agg_trucks = (id) => trucks.filter((t) => t.aggregator_id === id);

  return (
    <DashboardLayout
      active="/dashboard/aggregators"
      title="Aggregator Directory"
    >
      <DemoBanner />
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by aggregator name, location, or ID..."
      >
        <div className="flex gap-2">
          {["all", "active", "pilot", "inactive"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold ${filter === f ? "bg-teal text-white" : "bg-white border border-gray-200 text-gray-600"}`}
            >
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </SearchBar>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {filtered.map((a) => (
          <div
            key={a.id}
            className="card p-5 cursor-pointer hover:border-teal transition-colors"
            onClick={() => setSelected(a)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-bold text-deep">{a.name}</div>
                <div className="text-xs text-gray-400">{a.id}</div>
              </div>
              <Badge status={a.status} />
            </div>
            <div className="text-sm text-gray-500 mb-4">📍 {a.location}</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                [a.batches, "Batches"],
                [a.crates.toLocaleString(), "Crates"],
                [`${a.spoilage_rate}%`, "Spoilage"],
              ].map(([v, l]) => (
                <div key={l} className="bg-mist rounded-lg py-2">
                  <div className="font-black text-deep text-sm">{v}</div>
                  <div className="text-xs text-gray-500">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-teal text-xs font-semibold">
              View profile →
            </div>
          </div>
        ))}
        {!filtered.length && (
          <div className="col-span-3 text-center py-10 text-gray-400 text-sm">
            No aggregators match your search
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center py-8 px-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl">
            <div className="bg-deep text-white p-5 rounded-t-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <div className="font-black text-teal text-xl">
                  {selected.name}
                </div>
                <div className="text-white/70 text-sm">
                  {selected.id} · {selected.location}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  [selected.batches, "Total Batches"],
                  [selected.crates.toLocaleString(), "Total Crates"],
                  [`${selected.spoilage_rate}%`, "Avg Spoilage"],
                  [
                    `₦${selected.revenue.toLocaleString()}`,
                    "Revenue Generated",
                  ],
                ].map(([v, l]) => (
                  <div key={l} className="bg-mist rounded-xl p-4 text-center">
                    <div className="font-black text-deep text-lg">{v}</div>
                    <div className="text-xs text-gray-500 mt-1">{l}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
                {[
                  ["Contact", selected.contact],
                  ["Status", selected.status],
                  ["Client Since", selected.joined],
                  ["Active Trucks", selected.trucks],
                ].map(([l, v]) => (
                  <div key={l} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-400">{l}</div>
                    <div className="font-semibold text-deep">{v}</div>
                  </div>
                ))}
              </div>
              <div className="font-semibold text-deep text-sm mb-3">
                Batch History
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-xs min-w-[640px] sm:min-w-0">
                  <thead>
                    <tr>
                      {["Batch ID", "Date", "Crates", "Formula", "Status"].map(
                        (h) => (
                          <th
                            key={h}
                            className="table-th-condensed sm:table-th"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {agg_batches(selected.id).map((b, i) => (
                      <tr
                        key={b.id}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="table-td-condensed sm:table-td font-mono text-[11px] sm:text-xs">
                          {b.id}
                        </td>
                        <td className="table-td-condensed sm:table-td">
                          {b.date}
                        </td>
                        <td className="table-td-condensed sm:table-td">
                          {b.crates}
                        </td>
                        <td className="table-td-condensed sm:table-td">
                          {b.formula}
                        </td>
                        <td className="table-td-condensed sm:table-td">
                          <Badge status={b.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selected.notes && (
                <div className="mt-4 bg-mist rounded-lg p-4 text-sm text-gray-700">
                  <strong>Notes: </strong>
                  {selected.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ── BIO-SHIELD R&D PAGE ───────────────────────────────────────
export function RnD() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [trials, setTrials] = useState([]);

  useEffect(() => {
    fetchTrials()
      .then((data) => setTrials(Array.isArray(data) ? data : []))
      .catch(() => setTrials([]));
  }, []);

  const filtered = trials.filter((t) => {
    const q = search.toLowerCase();
    const match =
      !q ||
      t.id.toLowerCase().includes(q) ||
      t.formula.toLowerCase().includes(q) ||
      t.status.includes(q);
    return match && (filter === "all" || t.status === filter);
  });

  const chartData = trials
    .filter((t) => t.shelf_days)
    .map((t) => ({
      version: t.formula.replace("Bio-Shield ", ""),
      days: t.shelf_days,
      conc: t.av_conc,
    }));

  return (
    <DashboardLayout active="/dashboard/rd" title="Bio-Shield R&D">
      <DemoBanner />

      {/* Formula version cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 mb-8">
        {[
          { v: "BS-v1.0", days: 8, status: "Superseded" },
          { v: "BS-v1.2", days: 17, status: "Active — Commercial Pilot" },
          { v: "BS-v1.3", days: null, status: "In Testing" },
        ].map((f) => (
          <div
            key={f.v}
            className={`card p-4 sm:p-5 border-l-4 ${f.status.includes("Active") ? "border-teal" : f.status.includes("Testing") ? "border-amber" : "border-gray-300"}`}
          >
            <div className="font-black text-deep text-xl mb-1">{f.v}</div>
            <div
              className={`text-xs font-bold mb-3 ${f.status.includes("Active") ? "text-teal" : f.status.includes("Testing") ? "text-amber-600" : "text-gray-400"}`}
            >
              {f.status}
            </div>
            <div className="text-3xl font-black text-deep">
              {f.days ?? "TBD"}
            </div>
            <div className="text-xs text-gray-500">days shelf life</div>
            {f.days && (
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-teal rounded-full"
                  style={{ width: `${(f.days / 23) * 100}%` }}
                />
              </div>
            )}
            <div className="text-xs text-gray-400 mt-1">Target: 15–23 days</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <div className="card-header">Shelf Life by Formula Version</div>
          <div className="p-3.5 sm:p-4 h-44 sm:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="version" tick={{ fontSize: 9 }} />
                <YAxis domain={[0, 25]} tick={{ fontSize: 9 }} />
                <Tooltip wrapperStyle={{ fontSize: 11 }} />

                <ReferenceLine
                  y={15}
                  stroke="#B45309"
                  strokeDasharray="4 2"
                  label={{
                    value: "Min target (15d)",
                    fontSize: 10,
                    fill: "#B45309",
                  }}
                />
                <ReferenceLine
                  y={23}
                  stroke="#1D9E75"
                  strokeDasharray="4 2"
                  label={{
                    value: "Stretch (23d)",
                    fontSize: 10,
                    fill: "#1D9E75",
                  }}
                />
                <Bar
                  dataKey="days"
                  fill="#1D9E75"
                  radius={[4, 4, 0, 0]}
                  name="Shelf life (days)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header">AV Concentration vs Shelf Life</div>
          <div className="p-3.5 sm:p-4 h-44 sm:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  dataKey="conc"
                  name="AV Conc (%)"
                  tick={{ fontSize: 9 }}
                  label={{
                    value: "AV gel %",
                    position: "insideBottom",
                    offset: -5,
                    fontSize: 9,
                  }}
                />
                <YAxis
                  dataKey="days"
                  name="Shelf life"
                  tick={{ fontSize: 9 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  wrapperStyle={{ fontSize: 11 }}
                />

                <ReferenceLine y={15} stroke="#B45309" strokeDasharray="4 2" />
                <Scatter data={chartData} fill="#1D9E75" r={6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trial log */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by trial ID, formula version, date, or status..."
      >
        <div className="flex gap-2 flex-wrap">
          {["all", "complete", "target_achieved", "ongoing", "failed"].map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold ${filter === f ? "bg-teal text-white" : "bg-white border border-gray-200 text-gray-600"}`}
              >
                {f === "target_achieved"
                  ? "Target ✓"
                  : f[0].toUpperCase() + f.slice(1)}
              </button>
            ),
          )}
        </div>
      </SearchBar>

      <div className="card overflow-hidden">
        <div className="card-header">Trial Log</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[860px] sm:min-w-0">
            <thead>
              <tr>
                {[
                  "Trial ID",
                  "Formula",
                  "Date",
                  "AV Conc",
                  "Starch",
                  "App Vol",
                  "Shelf Life",
                  "Wt Loss (D7)",
                  "Visual (D7)",
                  "Lead",
                  "Status",
                ].map((h) => (
                  <th key={h} className="table-th-condensed sm:table-th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr
                  key={t.id}
                  className={i % 2 === 0 ? "table-tr-even" : "table-tr-odd"}
                >
                  <td className="table-td-condensed sm:table-td font-mono text-[11px] sm:text-xs font-bold text-deep">
                    {t.id}
                  </td>
                  <td className="table-td-condensed sm:table-td">
                    <span className="bg-teal/10 text-teal text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full">
                      {t.formula}
                    </span>
                  </td>
                  <td className="table-td-condensed sm:table-td text-[11px] sm:text-xs">
                    {t.date}
                  </td>
                  <td className="table-td-condensed sm:table-td text-[11px] sm:text-xs">
                    {t.av_conc}%
                  </td>
                  <td className="table-td-condensed sm:table-td text-[11px] sm:text-xs">
                    {t.starch_conc}%
                  </td>
                  <td className="table-td-condensed sm:table-td text-[11px] sm:text-xs">
                    {t.app_vol} mL/kg
                  </td>
                  <td className="table-td-condensed sm:table-td">
                    <span
                      className={`font-bold ${t.shelf_days >= 15 ? "text-teal" : t.shelf_days ? "text-amber-600" : "text-gray-400"}`}
                    >
                      {t.shelf_days ? `${t.shelf_days} days` : "Ongoing"}
                    </span>
                  </td>
                  <td className="table-td-condensed sm:table-td text-[11px] sm:text-xs">
                    {t.weight_loss ? `${t.weight_loss}%` : "—"}
                  </td>
                  <td className="table-td-condensed sm:table-td text-[11px] sm:text-xs">
                    {t.visual_day7 || "—"}
                  </td>
                  <td className="table-td-condensed sm:table-td text-[11px] sm:text-xs">
                    {t.lead.split(" ")[0]}
                  </td>
                  <td className="table-td-condensed sm:table-td">
                    <Badge status={t.status} />
                  </td>
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td
                    colSpan={11}
                    className="text-center py-10 text-gray-400 text-sm"
                  >
                    No trials match
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Notes */}
        <div className="p-5 border-t border-gray-100">
          <div className="font-semibold text-deep text-sm mb-3">CTO Notes</div>
          {filtered
            .filter((t) => t.notes)
            .map((t) => (
              <div key={t.id} className="bg-mist rounded-lg p-4 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-deep">
                    {t.formula}
                  </span>
                  <span className="text-xs text-gray-400">{t.date}</span>
                  <span className="text-xs text-teal font-medium">
                    — Fatia Oriire Akintoye, CTO
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {t.notes}
                </p>
              </div>
            ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

// ── TRUCK DATA ANALYSIS PAGE ──────────────────────────────────
export function TruckAnalysis() {
  const [search, setSearch] = useState("");
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [trucks, setTrucks] = useState([]);

  useEffect(() => {
    fetchTrucks()
      .then((data) => setTrucks(Array.isArray(data) ? data : []))
      .catch(() => setTrucks([]));
  }, []);

  const analysis = useMemo(() => {
    const safeTrucks = Array.isArray(trucks) ? trucks : [];

    const riskScore = (truck) => {
      const temp = truck?.sensors?.temp ?? 0;
      const humidity = truck?.sensors?.humidity ?? 0;
      if (truck.status === "alert") return 35;
      if (temp >= 34 || humidity >= 75) return 18;
      if (temp >= 30 || humidity >= 68) return 12;
      return 7;
    };

    const correlationData = safeTrucks.map((t) => ({
      truck: t.id,
      temp: t.sensors.temp,
      humidity: t.sensors.humidity,
      spoilage: riskScore(t),
    }));

    const grouped = safeTrucks.reduce((acc, truck) => {
      const key = truck.route;
      acc[key] = acc[key] || [];
      acc[key].push(truck);
      return acc;
    }, {});

    const routeData = Object.entries(grouped)
      .map(([route, items]) => ({
        route,
        avg_temp: Number(
          (
            items.reduce((sum, t) => sum + (t.sensors.temp || 0), 0) /
            items.length
          ).toFixed(2),
        ),
        avg_humidity: Number(
          (
            items.reduce((sum, t) => sum + (t.sensors.humidity || 0), 0) /
            items.length
          ).toFixed(2),
        ),
        avg_duration: Number(
          (
            items.reduce(
              (sum, t) => sum + (t.duration_hours || t.duration || 0),
              0,
            ) / items.length
          ).toFixed(2),
        ),
        spoilage_rate: Number(
          (
            items.reduce((sum, t) => sum + riskScore(t), 0) / items.length
          ).toFixed(2),
        ),
        trips: items.length,
        status:
          items.some((t) => t.status === "alert") ||
          items.some((t) => riskScore(t) >= 15)
            ? "High Risk"
            : "Normal",
      }))
      .sort((a, b) => b.spoilage_rate - a.spoilage_rate);

    const timelineData =
      safeTrucks.find((t) => t.id === "TRK-001")?.history || [];
    const humidTrips = safeTrucks.filter(
      (t) => (t.sensors?.humidity ?? 0) > 70,
    ).length;
    const highHumidityTrips = safeTrucks.filter(
      (t) => (t.sensors?.humidity ?? 0) > 65,
    ).length;
    const recommendation = routeData[0]
      ? `Increase starch concentration for ${routeData[0].route} and review dispatch controls.`
      : "Continue monitoring live telemetry.";

    return {
      correlationData,
      routeData,
      timelineData,
      humidTrips,
      highHumidityTrips,
      recommendation,
    };
  }, [trucks]);

  const {
    correlationData,
    routeData,
    humidTrips,
    highHumidityTrips,
    recommendation,
  } = analysis;

  const filtered = (Array.isArray(trucks) ? trucks : []).filter((t) => {
    const q = search.toLowerCase();
    return (
      !q ||
      t.id.toLowerCase().includes(q) ||
      t.aggregator.toLowerCase().includes(q) ||
      t.route.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout active="/dashboard/analysis" title="Truck Data Analysis">
      <DemoBanner />

      {/* Insight */}
      <div className="bg-teal/10 border border-teal/30 rounded-xl p-5 mb-8">
        <div className="font-bold text-deep mb-2">
          🔬 Active Formulation Insight
        </div>
        <p className="text-gray-700 text-sm leading-relaxed">
          <strong>Observation:</strong> {highHumidityTrips} trips show humidity
          above 65% and {humidTrips} exceed 70% in the current truck sample.
          <br />
          <strong className="text-teal">Recommendation:</strong>{" "}
          {recommendation}
          <br />
          <strong className="text-tomato">Action:</strong> Increase monitoring
          on the highest-risk route and validate formulation adjustments against
          live records.
        </p>
      </div>

      {/* Route overview */}
      <div className="card mb-8">
        <div className="card-header">Route-Level Analysis</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[760px] sm:min-w-0">
            <thead>
              <tr>
                {[
                  "Route",
                  "Avg Temp",
                  "Avg Humidity",
                  "Avg Duration",
                  "Spoilage Rate",
                  "Trips",
                  "Status",
                ].map((h) => (
                  <th key={h} className="table-th-condensed sm:table-th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {routeData.map((r, i) => (
                <tr
                  key={r.route}
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="table-td-condensed sm:table-td font-semibold text-deep">
                    {r.route}
                  </td>
                  <td className="table-td-condensed sm:table-td">
                    <span
                      className={
                        r.avg_temp > 32 ? "text-tomato font-bold" : "text-teal"
                      }
                    >
                      {r.avg_temp}°C
                    </span>
                  </td>
                  <td className="table-td-condensed sm:table-td">
                    <span
                      className={
                        r.avg_humidity > 68
                          ? "text-amber-600 font-semibold"
                          : "text-teal"
                      }
                    >
                      {r.avg_humidity}%
                    </span>
                  </td>
                  <td className="table-td-condensed sm:table-td">
                    {r.avg_duration}h
                  </td>
                  <td className="table-td-condensed sm:table-td">
                    <span
                      className={
                        r.spoilage_rate > 15
                          ? "text-tomato font-bold"
                          : "text-teal font-semibold"
                      }
                    >
                      {r.spoilage_rate}%
                    </span>
                  </td>
                  <td className="table-td-condensed sm:table-td">{r.trips}</td>
                  <td className="table-td-condensed sm:table-td">
                    <span
                      className={
                        r.spoilage_rate > 15
                          ? "badge badge-red"
                          : "badge badge-green"
                      }
                    >
                      {r.spoilage_rate > 15 ? "High Risk" : "Normal"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <div className="card-header">Temperature vs Spoilage Rate</div>
          <div className="p-3.5 sm:p-4 h-44 sm:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  dataKey="temp"
                  name="Peak Temp (°C)"
                  tick={{ fontSize: 9 }}
                  label={{
                    value: "Peak Temp °C",
                    position: "insideBottom",
                    offset: -3,
                    fontSize: 9,
                  }}
                />
                <YAxis
                  dataKey="spoilage"
                  name="Spoilage %"
                  tick={{ fontSize: 9 }}
                  label={{
                    value: "Spoilage %",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 9,
                  }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  wrapperStyle={{ fontSize: 11 }}
                />

                <Scatter
                  data={correlationData}
                  fill="#D85A30"
                  r={7}
                  name="Trip"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header">Humidity vs Spoilage Rate</div>
          <div className="p-3.5 sm:p-4 h-44 sm:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  dataKey="humidity"
                  name="Peak Humidity %"
                  tick={{ fontSize: 9 }}
                  label={{
                    value: "Peak Humidity %",
                    position: "insideBottom",
                    offset: -3,
                    fontSize: 9,
                  }}
                />
                <YAxis
                  dataKey="spoilage"
                  name="Spoilage %"
                  tick={{ fontSize: 9 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  wrapperStyle={{ fontSize: 11 }}
                />

                <Scatter
                  data={correlationData}
                  fill="#085041"
                  r={7}
                  name="Trip"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Individual truck drill-down */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Select a truck to drill into its journey data..."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {filtered.map((t) => (
          <button
            key={t.id}
            onClick={() =>
              setSelectedTruck(selectedTruck?.id === t.id ? null : t)
            }
            className={`card p-3.5 sm:p-4 text-left transition-colors ${selectedTruck?.id === t.id ? "border-teal border-2" : ""}`}
          >
            <div className="font-bold text-deep text-sm">{t.id}</div>
            <div className="text-xs text-gray-400">{t.aggregator}</div>
            <div className="text-xs text-gray-500 mt-1">{t.route}</div>
            <Badge status={t.status} />
          </button>
        ))}
      </div>

      {selectedTruck && (
        <div className="card">
          <div className="card-header">
            {selectedTruck.id} — Full Journey Profile
          </div>
          <div className="p-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={selectedTruck.history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="t" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip wrapperStyle={{ fontSize: 11 }} />

                <ReferenceLine
                  y={34}
                  stroke="#D85A30"
                  strokeDasharray="4 2"
                  label={{ value: "Temp alert", fontSize: 9, fill: "#D85A30" }}
                />
                <ReferenceLine
                  y={70}
                  stroke="#B45309"
                  strokeDasharray="4 2"
                  label={{
                    value: "Humidity alert",
                    fontSize: 9,
                    fill: "#B45309",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#D85A30"
                  strokeWidth={2}
                  name="Temp (°C)"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="humidity"
                  stroke="#1D9E75"
                  strokeWidth={2}
                  name="Humidity (%)"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="gas"
                  stroke="#085041"
                  strokeWidth={1.5}
                  name="Gas (ppm)"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs text-gray-500 flex flex-col sm:flex-row flex-wrap gap-1.5 sm:gap-4">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-tomato inline-block" />
              Temperature °C
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-teal inline-block" />
              Humidity %
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-deep inline-block" />
              Gas ppm
            </span>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
