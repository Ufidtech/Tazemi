const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

function buildUrl(path) {
  return `${DEFAULT_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function request(path, options = {}) {
  const response = await fetch(buildUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed: ${response.status}`);
  }

  const payload = await response.json();
  return payload?.data ?? payload;
}

async function requestWithFallback(path, fallback) {
  try {
    const data = await request(path);
    if (Array.isArray(data)) {
      return data.length ? data : (typeof fallback === "function" ? fallback() : fallback);
    }
    if (data && Object.keys(data).length) {
      return data;
    }
  } catch {
    // ignore and use fallback
  }
  return typeof fallback === "function" ? fallback() : fallback;
}

export async function fetchDashboardSummary(fallback = null) {
  return requestWithFallback("/dashboard/summary", fallback);
}

export async function fetchHealth() {
  return request("/health");
}

export async function fetchTrucks(fallback = []) {
  return requestWithFallback("/trucks", fallback);
}

export async function fetchBatches(fallback = []) {
  return requestWithFallback("/batches", fallback);
}

export async function fetchAggregators(fallback = []) {
  return requestWithFallback("/aggregators", fallback);
}

export async function fetchTrials(fallback = []) {
  return requestWithFallback("/trials", fallback);
}

export async function fetchAlerts(fallback = []) {
  return requestWithFallback("/alerts", fallback);
}

export async function fetchActivity(fallback = []) {
  return requestWithFallback("/dashboard/activity", fallback);
}

export { DEFAULT_API_BASE_URL };
