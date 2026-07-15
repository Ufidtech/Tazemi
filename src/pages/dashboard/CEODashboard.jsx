import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { DashboardLayout, DemoBanner, StatCard } from "@components";
import {
  fetchDashboardSummary,
  fetchTrucks,
  fetchActivity,
} from "../../services/liveData";
const COLORS = ["#1D9E75", "#085041", "#D85A30", "#17835f"];

const pickMetric = (source, keys, fallback = 0) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null) return value;
  }
  return fallback;
};

export default function CEODashboard() {
  const [summary, setSummary] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [activity, setActivity] = useState([]);
  const [trucks, setTrucks] = useState([]);

  useEffect(() => {
    fetchDashboardSummary()
      .then((data) => {
        console.log("[CEODashboard] dashboard summary:", data);
        console.log("[CEODashboard] dashboard kpis:", data?.dashboard_kpis);
        console.log(
          "[CEODashboard] dashboard metrics:",
          data?.dashboard_metrics,
        );
        setSummary(data || null);
        setKpis(
          data?.dashboard_kpis || data?.dashboard_metrics || data || null,
        );
      })
      .catch((error) => {
        console.error("[CEODashboard] summary error:", error);
        setSummary(null);
        setKpis(null);
      });
    fetchActivity()
      .then((data) => {
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.activity)
            ? data.activity
            : [];
        setActivity(items);
      })
      .catch((error) => {
        console.error("[CEODashboard] activity error:", error);
        setActivity([]);
      });
    fetchTrucks()
      .then((data) => {
        console.log("[CEODashboard] trucks:", data);
        setTrucks(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("[CEODashboard] trucks error:", error);
        setTrucks([]);
      });
  }, []);

  console.log("[CEODashboard] resolved kpis:", kpis);
  console.log("[CEODashboard] resolved summary:", summary);

  return (
    <DashboardLayout active="/dashboard" title="CEO / Board Dashboard">
      <DemoBanner />

      {summary?.generated_at && (
        <div className="mb-4 text-xs text-gray-500">
          Summary generated at {new Date(summary.generated_at).toLocaleString()}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard
          label="Total Crates Coated"
          value={Number(
            pickMetric(kpis, ["total_crates", "total_crates_coated"]),
          ).toLocaleString()}
          icon="📦"
        />
        <StatCard
          label="Active Aggregators"
          value={pickMetric(kpis, ["active_aggregators"])}
          icon="🏢"
        />
        <StatCard
          label="Active IoT Trucks"
          value={pickMetric(kpis, ["active_trucks", "active_iot_trucks"])}
          icon="🚛"
        />
        <StatCard
          label="Batches This Month"
          value={pickMetric(kpis, ["batches_month", "batches_this_month"])}
          icon="⚙️"
        />
        <StatCard
          label="Avg Spoilage (coated)"
          value={`${pickMetric(kpis, ["avg_spoilage_coated", "avg_spoilage_rate_coated"])}%`}
          sub={`vs ${pickMetric(kpis, ["avg_spoilage_uncoated"])}% uncoated`}
          icon="📉"
        />
        <StatCard
          label="Revenue to Date"
          value={`₦${Number(pickMetric(kpis, ["revenue_to_date", "revenue"])).toLocaleString()}`}
          sub="From dashboard summary"
          icon="💰"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card md:col-span-2 mobile-card-tight">
          <div className="card-header">Crates Coated per Month</div>
          <div className="p-2.5 sm:p-4 h-44 sm:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pickMetric(kpis, ["crates_by_month"], [])}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />

                <Tooltip wrapperStyle={{ fontSize: 11 }} />

                <Bar dataKey="crates" fill="#1D9E75" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card mobile-card-tight">
          <div className="card-header">Crates by Aggregator</div>
          <div className="p-2.5 sm:p-4 h-44 sm:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pickMetric(kpis, ["crates_by_aggregator"], [])}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, percent }) =>
                    `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`
                  }
                  labelStyle={{ fontSize: 8 }}
                  labelLine={false}
                  fontSize={9}
                >
                  {(pickMetric(kpis, ["crates_by_aggregator"], []) || []).map(
                    (_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ),
                  )}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bio-Shield progress */}
      <div className="card mb-8 mobile-card-tight">
        <div className="card-header">Bio-Shield Formulation Progress</div>
        <div className="p-3 sm:p-4 h-44 sm:h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={(pickMetric(kpis, ["spoilage_trend"], []) || []).filter(
                (d) => d.days,
              )}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="version" tick={{ fontSize: 8 }} />
              <YAxis
                domain={[0, 25]}
                tick={{ fontSize: 8 }}
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
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 flex flex-col sm:flex-row flex-wrap gap-1.5 sm:gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-teal inline-block" />
            Shelf life achieved
          </span>
          <span className="text-amber-600 font-medium">Target: 15–23 days</span>
        </div>
      </div>

      {/* Two columns: Activity + Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card mobile-card-tight">
          <div className="card-header">Recent Activity</div>
          <div className="divide-y divide-gray-100">
            {activity.map((ev) => (
              <div
                key={ev.id}
                className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-start gap-2.5 sm:gap-3"
              >
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

        <div className="card mobile-card-tight">
          <div className="card-header">Active Alerts</div>
          {trucks
            .filter((t) => t.status === "alert" || (t.alerts?.length ?? 0) > 0)
            .flatMap((t) =>
              (t.alerts ?? []).map((a) => ({
                ...a,
                truck: t.id,
                agg: t.aggregator,
              })),
            ).length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No active alerts
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {trucks
                .filter((t) => (t.alerts?.length ?? 0) > 0)
                .flatMap((t) =>
                  (t.alerts ?? []).map((a, i) => (
                    <div
                      key={`${t.id}-${i}`}
                      className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-start gap-2.5 sm:gap-3"
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
                      <span className="text-xs text-gray-400 shrink-0">
                        (legacy alert)
                      </span>
                    </div>
                  )),
                )}
            </div>
          )}
          <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-t border-gray-100 bg-gray-50">
            <div className="section-label mb-3">Quick Links</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                ["🏢", "Aggregators", "/dashboard/aggregators"],
                ["📦", "Crates", "/dashboard/crates"],
                ["💳", "Transactions", "/dashboard/transactions"],
                ["⚙️", "Settings", "/dashboard/settings"],
              ].map(([i, l, h]) => (
                <Link
                  key={l}
                  to={h}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-teal transition-colors py-1 min-w-0"
                >
                  <span>{i}</span>
                  {l}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
