/**
 * liveData.js — production data service
 *
 * Drop-in replacement for the api.js fetchers used by the dashboard
 * pages. Resolution order per fetch:
 *
 *   1. Firebase RTDB   → source "live"   (production path)
 *   2. REST API        → source "api"    (legacy backend, if running)
 *   3. Bundled demo    → source "demo"   (src/data — untouched fallback)
 *
 * The worst source used in the session is tracked so the UI (DemoBanner)
 * can show the demo warning ONLY when bundled demo data is actually
 * on screen. Once the DB is seeded/live, the banner disappears.
 */

import { ref, get } from "firebase/database";
import { database, isFirebaseConfigured } from "./firebaseClient";
import * as api from "./api";
import {
  aggregators as demoAggregators,
  trucks as demoTrucks,
  batches as demoBatches,
  trials as demoTrials,
  kpis as demoKpis,
  activity as demoActivity,
} from "../data";

/* ------------------------------------------------------------------ */
/* Data-source tracking ("live" > "api" > "demo")                      */
/* ------------------------------------------------------------------ */

const SOURCE_RANK = { live: 2, api: 1, demo: 0 };
let currentSource = null; // null until first fetch resolves
const listeners = new Set();

function reportSource(source) {
  // Track the WORST source in play so mixed pages stay honest.
  if (currentSource === null || SOURCE_RANK[source] < SOURCE_RANK[currentSource]) {
    currentSource = source;
    listeners.forEach((cb) => cb(currentSource));
  }
}

export function getDataSource() {
  return currentSource;
}

export function subscribeDataSource(callback) {
  listeners.add(callback);
  if (currentSource !== null) callback(currentSource);
  return () => listeners.delete(callback);
}

/* ------------------------------------------------------------------ */
/* Core resolver                                                       */
/* ------------------------------------------------------------------ */

async function fromDb(path) {
  if (!isFirebaseConfigured() || !database) return null;
  try {
    const snap = await get(ref(database, path));
    if (!snap.exists()) return null;
    return snap.val();
  } catch {
    return null;
  }
}

/** Object keyed by id → array (RTDB stores collections as objects). */
function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && typeof value === "object") return Object.values(value);
  return [];
}

async function resolveList(dbPath, apiFetcher, demoFallback) {
  const dbValue = await fromDb(dbPath);
  const dbList = toArray(dbValue);
  if (dbList.length) {
    reportSource("live");
    return dbList;
  }

  try {
    const apiList = await apiFetcher([]);
    if (Array.isArray(apiList) && apiList.length) {
      reportSource("api");
      return apiList;
    }
  } catch {
    // fall through to demo
  }

  reportSource("demo");
  return demoFallback;
}

/* ------------------------------------------------------------------ */
/* Fetchers (same names/shapes the pages already use)                  */
/* ------------------------------------------------------------------ */

export function fetchAggregators() {
  return resolveList("aggregators", api.fetchAggregators, demoAggregators);
}

/**
 * RTDB strips empty arrays ([] is simply not stored), so records
 * round-tripped through Firebase lose keys like `alerts`. Restore the
 * array fields the UI dereferences (t.alerts.length, t.history.map).
 */
function normalizeTruck(truck) {
  return {
    ...truck,
    alerts: Array.isArray(truck.alerts) ? truck.alerts : [],
    history: Array.isArray(truck.history) ? truck.history : [],
  };
}

export async function fetchTrucks() {
  const trucks = await resolveList("trucks", api.fetchTrucks, demoTrucks);
  return trucks.map(normalizeTruck);
}

export function fetchBatches() {
  return resolveList("batches", api.fetchBatches, demoBatches);
}

export function fetchTrials() {
  return resolveList("trials", api.fetchTrials, demoTrials);
}

export function fetchActivity() {
  return resolveList("activity", api.fetchActivity, demoActivity);
}

export function fetchAlerts() {
  return resolveList("alerts", api.fetchAlerts, []);
}

export async function fetchDashboardSummary() {
  const [kpis, generatedAt] = await Promise.all([
    fromDb("dashboard/kpis"),
    fromDb("dashboard/generated_at"),
  ]);
  if (kpis) {
    reportSource("live");
    return { dashboard_kpis: kpis, generated_at: generatedAt || null };
  }

  try {
    const summary = await api.fetchDashboardSummary(null);
    if (summary && Object.keys(summary).length) {
      reportSource("api");
      return summary;
    }
  } catch {
    // fall through to demo
  }

  reportSource("demo");
  return { dashboard_kpis: demoKpis, generated_at: null };
}

/** Legacy alias used by IoTMonitoring. */
export function getTrucks() {
  return fetchTrucks();
}
