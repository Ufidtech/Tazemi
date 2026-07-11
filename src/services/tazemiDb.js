/**
 * tazemiDb.js — thin API client for the Tazémi FastAPI backend (PRD v2.1)
 *
 * All business logic (ID allocation, uniqueness enforcement, atomic
 * multi-path writes, NIN/BVN encryption, photo storage, fee handling,
 * refunds, pricing changelogs, scan-request archival) lives in the
 * backend. This module only:
 *   - attaches the Firebase ID token to each request
 *   - maps UI-friendly signatures onto the REST endpoints
 *   - keeps pure display helpers (phone normalization, masking)
 *
 * Real-time flows (scan-request listeners, device heartbeats) stay on
 * Firebase client listeners — see useRFIDScan / useDeviceStatus.
 */

import { auth } from "./firebaseClient";
import { DEFAULT_API_BASE_URL } from "./api";

export const CARD_FEE = 1000;
export const MIN_INITIAL_TOPUP = 5000;
export const MIN_TOPUP = 1000;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Normalize a Nigerian phone number to +234 form (§2.8). */
export function normalizePhone(phone) {
  const digits = String(phone).replace(/[^\d+]/g, "");
  if (digits.startsWith("+234")) return digits;
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  return `+234${digits}`;
}

/** Mask an 11-digit NIN/BVN for display: *******1234 (§6.2). */
export function maskIdentity(ninOrBvn) {
  const s = String(ninOrBvn);
  return `${"*".repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}

/* ------------------------------------------------------------------ */
/* Authenticated request helper                                        */
/* ------------------------------------------------------------------ */

async function authHeaders() {
  const token = await auth?.currentUser?.getIdToken().catch(() => null);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiRequest(path, { method = "GET", body, formData } = {}) {
  const headers = await authHeaders();
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${DEFAULT_API_BASE_URL}${path}`, {
    method,
    headers,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(
      errorData.detail || errorData.message || `Request failed (${response.status})`,
    );
    err.httpStatus = response.status;
    throw err;
  }

  const payload = await response.json().catch(() => null);
  return payload?.data ?? payload;
}

/* ------------------------------------------------------------------ */
/* Uniqueness checks (§2.8 — advisory; backend enforces at write time) */
/* ------------------------------------------------------------------ */

export async function isPhoneAvailable(phone) {
  const result = await apiRequest(
    `/aggregators/availability/phone?phone=${encodeURIComponent(normalizePhone(phone))}`,
  );
  return result?.available === true;
}

export async function isRfidAvailable(uid) {
  const result = await apiRequest(
    `/aggregators/availability/rfid?uid=${encodeURIComponent(String(uid).toUpperCase())}`,
  );
  return result?.available === true;
}

/* ------------------------------------------------------------------ */
/* Registration (§3.1 — backend: encryption, photo, atomic write)      */
/* ------------------------------------------------------------------ */

/**
 * BLOCKED — do not call from a new registration form yet.
 * This endpoint requires market_location, nin_or_bvn, and initial_topup
 * (PRD v2.1), which NewTazemi.docx explicitly excludes. Waiting on backend
 * dev to confirm which spec is authoritative before wiring the form.
 * The read-only aggregator list below is NOT blocked — that only needs
 * GET /aggregators, which is stable regardless of the registration answer.
 */
export async function registerAggregator({
  fullName,
  phoneNumber,
  marketLocation,
  ninOrBvn,
  photoFile,
  rfidUid,
  initialTopUp,
  operatorId,
  scanSessionId = null,
}) {
  const formData = new FormData();
  formData.append("full_name", fullName);
  formData.append("phone_number", phoneNumber);
  formData.append("market_location", marketLocation);
  formData.append("nin_or_bvn", ninOrBvn);
  formData.append("rfid_uid", String(rfidUid).toUpperCase());
  formData.append("initial_topup", Number(initialTopUp));
  formData.append("created_by", operatorId || "unknown");
  if (photoFile) formData.append("photo", photoFile);

  const aggregator = await apiRequest("/aggregators/register", {
    method: "POST",
    formData,
  });

  // §2.6: archive the scan request after the UID is saved.
  if (scanSessionId) {
    await archiveScanRequest(scanSessionId).catch(() => { });
  }

  return aggregator;
}

/* ------------------------------------------------------------------ */
/* Top-up (§3.2 — backend: balance transaction + card-fee safety net)  */
/* ------------------------------------------------------------------ */

export async function topUpAggregator({ aggregatorId, amount, method = "cash", note = "" }) {
  const result = await apiRequest(`/aggregators/${aggregatorId}/topup`, {
    method: "POST",
    body: { amount: Number(amount), method, note },
  });
  return { balanceAfter: result?.aggregator?.balance, ...result };
}

/* ------------------------------------------------------------------ */
/* Card replacement (§3.2 — backend aborts if balance < fee)           */
/* ------------------------------------------------------------------ */

export async function replaceCard({ aggregatorId, newUid }) {
  return apiRequest(`/aggregators/${aggregatorId}/replace-card`, {
    method: "POST",
    body: { new_uid: String(newUid).toUpperCase() },
  });
}

/* ------------------------------------------------------------------ */
/* Account status (§3.2 — CEO only, enforced by the backend)           */
/* ------------------------------------------------------------------ */

export async function setAccountStatus({ aggregatorId, status, reason }) {
  return apiRequest(`/aggregators/${aggregatorId}/status`, {
    method: "POST",
    body: { status, reason: reason || null },
  });
}

/* ------------------------------------------------------------------ */
/* Refund (§3.2 — CEO only, atomic reverse write in the backend)       */
/* ------------------------------------------------------------------ */

export async function refundTransaction({ originalTxnId, reason }) {
  return apiRequest(`/transactions/${originalTxnId}/refund`, {
    method: "POST",
    body: { reason },
  });
}

/* ------------------------------------------------------------------ */
/* Pricing (§3.4 — CEO only; backend writes update + changelog)        */
/* ------------------------------------------------------------------ */

export async function updatePricing({ activeRate, season }) {
  return apiRequest("/pricing/current", {
    method: "PUT",
    body: { active_rate: Number(activeRate), season },
  });
}

export async function fetchPricing() {
  return apiRequest("/pricing/current");
}

/* ------------------------------------------------------------------ */
/* Scan request archival (§2.6 — backend owns terminal operations)     */
/* ------------------------------------------------------------------ */

export async function archiveScanRequest(sessionId) {
  return apiRequest(`/scan-requests/${sessionId}/archive`, { method: "POST" });
}

/** Dashboard-side expiry (§2.6 — 65s safety net, then archive). */
export async function expireScanRequest(sessionId) {
  return apiRequest(`/scan-requests/${sessionId}/expire`, { method: "POST" });
}

/** Remove a cancelled scan request without archiving noise. */
export async function deleteScanRequest(sessionId) {
  return apiRequest(`/scan-requests/${sessionId}`, { method: "DELETE" });
}

/* ------------------------------------------------------------------ */
/* Aggregators — read only (NewTazemi.docx Page 1 list)                */
/* Registration form is BLOCKED — see comment above registerAggregator */
/* ------------------------------------------------------------------ */

export async function fetchAggregators() {
  return apiRequest("/aggregators");
}

/* ------------------------------------------------------------------ */
/* Crates (NewTazemi.docx Page 2 — assign / dispatch / return)         */
/* Confirmed against backend/api/routes/crates.py — unblocked.         */
/* ------------------------------------------------------------------ */

export async function fetchCrates({ status, aggregatorId } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (aggregatorId) params.set("aggregator_id", aggregatorId);
  const qs = params.toString();
  return apiRequest(`/crates${qs ? `?${qs}` : ""}`);
}

export async function assignCrate({ crateId, aggregatorId, batchRef }) {
  return apiRequest(`/crates/${crateId}/assign`, {
    method: "POST",
    body: { aggregator_id: aggregatorId, batch_ref: batchRef },
  });
}

export async function dispatchCrate(crateId) {
  return apiRequest(`/crates/${crateId}/dispatch`, { method: "POST" });
}

export async function returnCrate({ crateId, condition = "serviceable" }) {
  return apiRequest(`/crates/${crateId}/return`, {
    method: "POST",
    body: { condition },
  });
}

/* ------------------------------------------------------------------ */
/* Transactions (NewTazemi.docx Page 3 — read-only)                    */
/* ------------------------------------------------------------------ */

export async function fetchTransactions(aggregatorId) {
  const qs = aggregatorId
    ? `?aggregator_id=${encodeURIComponent(aggregatorId)}`
    : "";
  return apiRequest(`/transactions${qs}`);
}

/* ------------------------------------------------------------------ */
/* Operators (NewTazemi.docx Page 5 — Settings, CEO/admin only)        */
/* ------------------------------------------------------------------ */

export async function fetchOperators() {
  return apiRequest("/operators");
}

export async function createOperator({ name, role, pin }) {
  return apiRequest("/operators", { method: "POST", body: { name, role, pin } });
}

export async function updateOperator(operatorId, patch) {
  return apiRequest(`/operators/${operatorId}`, { method: "PATCH", body: patch });
}

export async function deleteOperator(operatorId) {
  return apiRequest(`/operators/${operatorId}`, { method: "DELETE" });
}
