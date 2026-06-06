import React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DashboardLayout, DemoBanner, StatCard, Badge } from "@components";
import { kpis, activity, aggregators, trucks } from "../../services/demoData";

const COLORS = ["#1D9E75", "#085041", "#D85A30", "#17835f"];

export default function CEODashboard() {
  return (
    <DashboardLayout active="/dashboard" title="CEO / Board Dashboard">
      <DemoBanner />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Crates Coated" value="12,400" icon="📦" />
        <StatCard label="Active Aggregators" value="3" icon="🏢" />
        <StatCard label="Active IoT Trucks" value="5" icon="🚛" />
        <StatCard label="Batches This Month" value="4" icon="⚙️" />
        <StatCard
          label="Avg Spoilage (coated)"
          value="8.3%"
          sub="vs 43% uncoated"
          icon="📉"
        />
        <StatCard
          label="Revenue to Date"
          value="₦5.2M"
          sub="Demo figure"
          icon="💰"
        />
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card md:col-span-2">
          <div className="card-header">Crates Coated per Month</div>
          <div className="p-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpis.crates_by_month}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="crates" fill="#1D9E75" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header">Crates by Aggregator</div>
          <div className="p-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={kpis.crates_by_aggregator}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, percent }) =>
                    `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                  fontSize={10}
                >
                  {kpis.crates_by_aggregator.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bio-Shield progress */}
      <div className="card mb-8">
        <div className="card-header">Bio-Shield Formulation Progress</div>
        <div className="p-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={kpis.spoilage_trend.filter((d) => d.days)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="version" tick={{ fontSize: 11 }} />
              <YAxis
                domain={[0, 25]}
                tick={{ fontSize: 11 }}
                label={{
                  value: "Days",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 11,
                }}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="days"
                stroke="#1D9E75"
                strokeWidth={2.5}
                dot={{ fill: "#1D9E75", r: 5 }}
              />
              {/* Target lines */}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="px-4 pb-4 flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-teal inline-block" />
            Shelf life achieved
          </span>
          <span className="text-amber-600 font-medium">Target: 15–23 days</span>
        </div>
      </div>

      {/* Two columns: Activity + Alerts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">Recent Activity</div>
          <div className="divide-y divide-gray-100">
            {activity.map((ev) => (
              <div key={ev.id} className="px-4 py-3 flex items-start gap-3">
                <span className="text-lg mt-0.5">
                  {ev.type === "alert"
                    ? "🔴"
                    : ev.type === "batch"
                      ? "📦"
                      : ev.type === "delivery"
                        ? "✅"
                        : "🔬"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 leading-snug">
                    {ev.text}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{ev.time}</p>
                </div>
                <a
                  href={ev.link}
                  className="text-teal text-xs hover:underline shrink-0"
                >
                  View →
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">Active Alerts</div>
          {trucks
            .filter((t) => t.status === "alert" || t.alerts.length > 0)
            .flatMap((t) =>
              t.alerts.map((a) => ({ ...a, truck: t.id, agg: t.aggregator })),
            ).length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No active alerts
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {trucks
                .filter((t) => t.alerts.length > 0)
                .flatMap((t) =>
                  t.alerts.map((a, i) => (
                    <div
                      key={`${t.id}-${i}`}
                      className="px-4 py-3 flex items-start gap-3"
                    >
                      <span className="text-tomato text-lg">⚠️</span>
                      <div>
                        <div className="text-sm font-medium text-deep">
                          {t.id} — {a.type} Alert
                        </div>
                        <div className="text-xs text-gray-500">
                          {t.aggregator} · {a.value}
                          {a.type === "Temperature"
                            ? "°C"
                            : a.type === "Humidity"
                              ? "%"
                              : "g"}{" "}
                          (threshold: {a.threshold})
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {a.time}
                        </div>
                      </div>
                      <a
                        href="/dashboard/iot"
                        className="text-teal text-xs hover:underline shrink-0"
                      >
                        View →
                      </a>
                    </div>
                  )),
                )}
            </div>
          )}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="section-label mb-3">Quick Links</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["📡", "IoT Monitoring", "/dashboard/iot"],
                ["⚙️", "Operations", "/dashboard/operations"],
                ["🏢", "Aggregators", "/dashboard/aggregators"],
                ["🔬", "R&D", "/dashboard/rd"],
              ].map(([i, l, h]) => (
                <a
                  key={l}
                  href={h}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-teal transition-colors py-1"
                >
                  <span>{i}</span>
                  {l}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
