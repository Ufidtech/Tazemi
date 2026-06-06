// Service wrapper around static demo data (src/data/index.js)
// Exposes the raw data and small helper utilities to centralize access.
import * as data from "@data";

export * from "@data";

export function getAggregators() {
    return data.aggregators;
}

export function getTrucks() {
    return data.trucks;
}

export function getBatches() {
    return data.batches;
}

export function getKpis() {
    return data.kpis;
}

export function getActivity(limit = 20) {
    return data.activity.slice(0, limit);
}

export function findTruckById(id) {
    return data.trucks.find((t) => t.id === id) || null;
}

export function filterTrucksByStatus(status) {
    return data.trucks.filter((t) => t.status === status);
}

export default data;
