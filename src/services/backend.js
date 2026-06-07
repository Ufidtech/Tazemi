import {
  fetchAggregators,
  fetchAlerts,
  fetchBatches,
  fetchDashboardSummary,
  fetchHealth,
  fetchTrials,
  fetchTrucks,
} from "./api";

export async function loadDashboardData() {
  const [health, summary, aggregators, batches, trucks, trials, alerts] = await Promise.allSettled([
    fetchHealth(),
    fetchDashboardSummary(),
    fetchAggregators(),
    fetchBatches(),
    fetchTrucks(),
    fetchTrials(),
    fetchAlerts(),
  ]);

  return {
    health: health.status === "fulfilled" ? health.value : null,
    summary: summary.status === "fulfilled" ? summary.value : null,
    aggregators: aggregators.status === "fulfilled" ? aggregators.value : [],
    batches: batches.status === "fulfilled" ? batches.value : [],
    trucks: trucks.status === "fulfilled" ? trucks.value : [],
    trials: trials.status === "fulfilled" ? trials.value : [],
    alerts: alerts.status === "fulfilled" ? alerts.value : [],
  };
}
