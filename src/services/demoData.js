import { fetchAggregators, fetchAlerts, fetchActivity, fetchBatches, fetchDashboardSummary, fetchTrials, fetchTrucks } from "./api.js";

const cache = new Map();

async function cached(key, loader) {
    if (!cache.has(key)) {
        cache.set(
            key,
            loader().catch((error) => {
                cache.delete(key);
                throw error;
            }),
        );
    }
    return cache.get(key);
}

export async function getAggregators() {
    return cached("aggregators", () => fetchAggregators([]));
}

export async function getTrucks() {
    const data = await cached("trucks", () => fetchTrucks([]));
    return data;
}

export async function getBatches() {
    return cached("batches", () => fetchBatches([]));
}

export async function getTrials() {
    return cached("trials", () => fetchTrials([]));
}

export async function getAlerts() {
    return cached("alerts", () => fetchAlerts([]));
}

export async function getDashboardSummary() {
    return fetchDashboardSummary(null);
}

export async function getDashboardAnalytics() {
    return fetchDashboardSummary(null);
}

export async function getKpis() {
    const summary = await getDashboardSummary();
    return summary?.dashboard_kpis || summary?.kpis || summary || {};
}

export async function getActivity(limit = 20) {
    const items = await fetchActivity([]);
    return Array.isArray(items) ? items.slice(0, limit) : [];
}

export async function findTruckById(id) {
    const trucks = await getTrucks();
    return trucks.find((t) => t.id === id) || null;
}

export async function filterTrucksByStatus(status) {
    const trucks = await getTrucks();
    return trucks.filter((t) => t.status === status);
}

export function clearDemoCache() {
    cache.clear();
}

export default {
    getAggregators,
    getTrucks,
    getBatches,
    getTrials,
    getAlerts,
    getDashboardSummary,
    getDashboardAnalytics,
    getKpis,
    getActivity,
    findTruckById,
    filterTrucksByStatus,
    clearDemoCache,
};

