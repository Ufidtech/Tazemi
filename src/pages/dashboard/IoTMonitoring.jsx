import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DashboardLayout, DemoBanner, SearchBar, Badge } from "@components";
import { getTrucks } from "../../services/demoData";

function SensorVal({ value, unit, warn, danger }) {
  const cls =
    value >= danger
      ? "text-tomato font-bold"
      : value >= warn
        ? "text-amber font-semibold"
        : "text-teal";
  return (
    <span className={cls}>
      {value}
      {unit}
    </span>
  );
}

function TruckDetail({ truck, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl">
        <div className="bg-deep text-white p-4 sm:p-5 rounded-t-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
          <div>
            <div className="font-black text-lg text-teal">{truck.id}</div>
            <div className="text-white/70 text-sm">
              {truck.aggregator} · {truck.route}
            </div>
          </div>
          <button
            onClick={onClose}
            className="self-start sm:self-auto text-white/60 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>
        <div className="p-3.5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
            {[
              ["Crates", truck.crates, "📦"],
              ["Formula", truck.formula, "🧪"],
              ["Batch", truck.batch_id, "⚙️"],
              ["Departure", truck.departure.split(" ")[0], "📅"],
            ].map(([l, v, i]) => (
              <div
                key={l}
                className="bg-mist rounded-lg p-2.5 sm:p-3 text-center"
              >
                <div className="text-xl mb-1">{i}</div>
                <div className="font-bold text-deep text-sm">{v}</div>
                <div className="text-xs text-gray-500">{l}</div>
              </div>
            ))}
          </div>

          {truck.alerts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="font-semibold text-tomato mb-2">
                ⚠️ Active Alerts
              </div>
              {truck.alerts.map((a, i) => (
                <div key={i} className="text-sm text-gray-700">
                  {a.type}: {a.value} (threshold: {a.threshold}) — {a.time}
                </div>
              ))}
            </div>
          )}

          <div className="mb-6">
            <div className="font-semibold text-deep mb-3 text-sm">
              Temperature & Humidity Over Journey
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={truck.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="t" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="temp"
                    stroke="#D85A30"
                    strokeWidth={2}
                    name="Temp °C"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    stroke="#1D9E75"
                    strokeWidth={2}
                    name="Humidity %"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {[
              ["🌡️", "Current Temp", `${truck.sensors.temp}°C`],
              ["💧", "Humidity", `${truck.sensors.humidity}%`],
              ["🌫️", "Gas (ppm)", truck.sensors.gas],
              ["📳", "Vibration (g)", truck.sensors.vibration],
              [
                "📍",
                "GPS",
                `${truck.sensors.gps.lat.toFixed(2)}, ${truck.sensors.gps.lng.toFixed(2)}`,
              ],
            ].map(([i, l, v]) => (
              <div key={l} className="bg-gray-50 rounded-lg p-3">
                <div className="text-lg">{i}</div>
                <div className="text-xs text-gray-400">{l}</div>
                <div className="font-bold text-deep">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IoTMonitoring() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getTrucks()
      .then((data) => {
        const normalized = Array.isArray(data) ? data : [];
        if (mounted) setTrucks(normalized);
      })
      .catch((error) => {
        console.error("[IoTMonitoring] failed to load trucks:", error);
        if (mounted) setTrucks([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      trucks.filter((t) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          t.id.toLowerCase().includes(q) ||
          t.aggregator.toLowerCase().includes(q) ||
          t.route.toLowerCase().includes(q) ||
          t.status.includes(q);
        const matchFilter = filter === "all" || t.status === filter;
        return matchSearch && matchFilter;
      }),
    [trucks, search, filter],
  );

  return (
    <DashboardLayout active="/dashboard/iot" title="IoT Monitoring">
      <DemoBanner />
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by truck ID, aggregator name, route, or status..."
      >
        <div className="flex gap-2 flex-wrap">
          {["all", "in_transit", "delivered", "alert"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${filter === f ? "bg-teal text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-teal"}`}
            >
              {f === "all"
                ? "All"
                : f === "in_transit"
                  ? "In Transit"
                  : f === "delivered"
                    ? "Delivered"
                    : "Alert"}
            </button>
          ))}
        </div>
      </SearchBar>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">
          Loading trucks...
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  {[
                    "Truck ID",
                    "Aggregator",
                    "Route",
                    "Temp",
                    "Humidity",
                    "Gas",
                    "Vibration",
                    "Crates",
                    "Status",
                    "",
                  ].map((h) => (
                    <th key={h} className="table-th">
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
                    <td className="table-td font-mono font-bold text-deep text-xs">
                      {t.id}
                    </td>
                    <td className="table-td">{t.aggregator}</td>
                    <td className="table-td text-xs text-gray-500">
                      {t.route}
                    </td>
                    <td className="table-td">
                      <SensorVal
                        value={t.sensors.temp}
                        unit="°C"
                        warn={28}
                        danger={34}
                      />
                    </td>
                    <td className="table-td">
                      <SensorVal
                        value={t.sensors.humidity}
                        unit="%"
                        warn={65}
                        danger={70}
                      />
                    </td>
                    <td className="table-td">
                      <SensorVal
                        value={t.sensors.gas}
                        unit=" ppm"
                        warn={400}
                        danger={500}
                      />
                    </td>
                    <td className="table-td">
                      <SensorVal
                        value={t.sensors.vibration}
                        unit="g"
                        warn={2}
                        danger={2.5}
                      />
                    </td>
                    <td className="table-td">{t.crates}</td>
                    <td className="table-td">
                      <Badge status={t.status} />
                    </td>
                    <td className="table-td">
                      <button
                        onClick={() => setSelected(t)}
                        className="text-teal text-xs font-semibold hover:underline"
                      >
                        Details →
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="text-center py-10 text-gray-400 text-sm"
                    >
                      No trucks match your search
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {[
          [
            "🟢",
            "Normal — all readings within range",
            trucks.filter((t) => t.status === "delivered").length,
          ],
          [
            "🔵",
            "In Transit",
            trucks.filter((t) => t.status === "in_transit").length,
          ],
          [
            "🔴",
            "Alert — threshold breach detected",
            trucks.filter((t) => t.status === "alert").length,
          ],
        ].map(([i, l, n]) => (
          <div
            key={l}
            className="bg-white rounded-lg border border-gray-200 p-3.5 sm:p-4 flex items-center gap-2.5 sm:gap-3"
          >
            <span className="text-2xl">{i}</span>
            <div>
              <div className="font-bold text-deep text-2xl">{n}</div>
              <div className="text-xs text-gray-500">{l}</div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <TruckDetail truck={selected} onClose={() => setSelected(null)} />
      )}
    </DashboardLayout>
  );
}
