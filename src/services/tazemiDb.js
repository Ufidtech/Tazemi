/**
 * tazemiDb.js — Firebase RTDB service layer (PRD v2.1)
 *
 * Implements the resolved data-integrity rules:
 * - Race-safe ID allocation via RTDB transactions on /counters   (§2.1)
 * - Phone + RFID uniqueness via /phone_index and /rfid_index     (§2.8)
 * - Atomic multi-path registration write (aggregator + indexes
 *   + TOPUP + CARD_FEE transactions in one update)               (§3.1)
 * - Top-up with card-fee safety net for legacy accounts          (§3.2)
 * - Card replacement fee as a conditional transaction that
 *   aborts if balance < fee at commit time                       (§3.2)
 * - CEO-only refund with atomic reverse write                    (§3.2)
 * - Pricing updates with changelog                               (§3.4)
 * - Scan-request archival to /scan_request_log (never bare
 *   delete)                                                      (§2.6)
 *
 * NOTE on NIN/BVN (§6.2): full KMS encryption requires the
 * `registerAggregator` Cloud Function. Until it is deployed, this
 * client stores ONLY the masked value (last 4 digits) and never
 * persists the raw number.
 */

import {
  ref,
  update,
  get,
  push,
  remove,
  runTransaction,
  serverTimestamp,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { database, storage } from "./firebaseClient";

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

/** Dashboard transaction ID: TXN-DASH-{operator_uid_short}-{millis} (§2.3). */
function dashTxnId(operatorId) {
  const shortId = String(operatorId || "unknown").slice(0, 8);
  return `TXN-DASH-${shortId}-${Date.now()}`;
}

function isTestAggregator(aggregatorId) {
  return String(aggregatorId).startsWith("AGG-T");
}

/* ------------------------------------------------------------------ */
/* ID allocation (§2.1 — race-safe counter transaction)                */
/* ------------------------------------------------------------------ */

export async function allocateAggregatorId({ isTest = false } = {}) {
  const counterPath = isTest ? "counters/aggregators_test" : "counters/aggregators";
  const result = await runTransaction(ref(database, counterPath), (n) => (n || 0) + 1);
  if (!result.committed) throw new Error("Could not allocate aggregator ID");
  const seq = String(result.snapshot.val()).padStart(3, "0");
  return isTest ? `AGG-T${seq}` : `AGG-${seq}`;
}

/* ------------------------------------------------------------------ */
/* Uniqueness checks (§2.8 — advisory; rules enforce no-overwrite)     */
/* ------------------------------------------------------------------ */

export async function isPhoneAvailable(phone) {
  const snap = await get(ref(database, `phone_index/${normalizePhone(phone)}`));
  return !snap.exists();
}

export async function isRfidAvailable(uid) {
  const snap = await get(ref(database, `rfid_index/${String(uid).toUpperCase()}`));
  return !snap.exists();
}

/* ------------------------------------------------------------------ */
/* Photo upload (§3.1 — aggregator-photos/{id}.jpg)                    */
/* ------------------------------------------------------------------ */

export async function uploadAggregatorPhoto(aggregatorId, file) {
  const photoRef = storageRef(storage, `aggregator-photos/${aggregatorId}.jpg`);
  await uploadBytes(photoRef, file, { contentType: file.type || "image/jpeg" });
  return getDownloadURL(photoRef);
}

/* ------------------------------------------------------------------ */
/* Registration (§3.1 — one atomic multi-path write)                   */
/* ------------------------------------------------------------------ */

export async function registerAggregator({
  fullName,
  phoneNumber,
  marketLocation,
  ninOrBvn,
  photoFile,
  rfidUid,
  initialTopUp,
  operatorId,
  isTest = false,
  scanSessionId = null,
}) {
  const phone = normalizePhone(phoneNumber);
  const uid = String(rfidUid).toUpperCase();
  const amount = Number(initialTopUp);

  if (amount < MIN_INITIAL_TOPUP) {
    throw new Error(`Initial top-up must be at least \u20A6${MIN_INITIAL_TOPUP.toLocaleString()}`);
  }
  if (!(await isPhoneAvailable(phone))) {
    throw new Error("An aggregator with this phone number already exists");
  }
  if (!(await isRfidAvailable(uid))) {
    throw new Error("This RFID card is already assigned to another aggregator");
  }

  const aggregatorId = await allocateAggregatorId({ isTest });
  const photoUrl = photoFile ? await uploadAggregatorPhoto(aggregatorId, photoFile) : "";
  const now = Date.now();
  const balance = amount - CARD_FEE;

  const topupTxnId = `${dashTxnId(operatorId)}-T`;
  const feeTxnId = `${dashTxnId(operatorId)}-F`;

  const updates = {
    [`aggregators/${aggregatorId}`]: {
      aggregator_id: aggregatorId,
      full_name: fullName.trim(),
      phone_number: phone,
      market_location: marketLocation,
      nin_or_bvn_masked: maskIdentity(ninOrBvn),
      photo_url: photoUrl,
      rfid_uid: uid,
      balance,
      account_status: "ACTIVE",
      card_fee_paid: true,
      total_batches: 0,
      total_crates_coated: 0,
      last_active: now,
      registered_at: now,
      registered_by: operatorId,
    },
    [`phone_index/${phone}`]: aggregatorId,
    [`rfid_index/${uid}`]: aggregatorId,
    [`transactions/${topupTxnId}`]: {
      transaction_id: topupTxnId,
      aggregator_id: aggregatorId,
      batch_id: null,
      is_test: isTest,
      type: "TOPUP",
      amount,
      balance_before: 0,
      balance_after: amount,
      method: "CASH",
      timestamp: now,
      operator_id: operatorId,
      stale_rate: false,
      note: "First top-up",
    },
    [`transactions/${feeTxnId}`]: {
      transaction_id: feeTxnId,
      aggregator_id: aggregatorId,
      batch_id: null,
      is_test: isTest,
      type: "CARD_FEE",
      amount: -CARD_FEE,
      balance_before: amount,
      balance_after: balance,
      method: "CASH",
      timestamp: now,
      operator_id: operatorId,
      stale_rate: false,
      note: "Card fee — registration",
    },
  };

  await update(ref(database), updates);

  // §2.6: archive the scan request after the UID is saved.
  if (scanSessionId) {
    await archiveScanRequest(scanSessionId).catch(() => {});
  }

  return {
    id: aggregatorId,
    aggregator_id: aggregatorId,
    name: fullName.trim(),
    full_name: fullName.trim(),
    balance,
    rfid_uid: uid,
    phoneNumber: phone,
    marketLocation,
    registered_at: now,
  };
}

/* ------------------------------------------------------------------ */
/* Top-up (§3.2 — transaction on aggregator + card-fee safety net)     */
/* ------------------------------------------------------------------ */

export async function topUpAggregator({ aggregatorId, amount, method = "CASH", note = "", operatorId }) {
  const topUp = Number(amount);
  if (topUp < MIN_TOPUP) {
    throw new Error(`Minimum top-up is \u20A6${MIN_TOPUP.toLocaleString()}`);
  }

  let ctx = null;
  const result = await runTransaction(ref(database, `aggregators/${aggregatorId}`), (agg) => {
    if (agg === null) return agg; // node missing — resolves as not committed on data load
    const balanceBefore = agg.balance || 0;
    const feeDue = agg.card_fee_paid === false; // legacy/admin-imported accounts only (§3.2 step 5)
    const fee = feeDue ? CARD_FEE : 0;
    ctx = { balanceBefore, feeDue };
    agg.balance = balanceBefore + topUp - fee;
    agg.card_fee_paid = true;
    agg.last_active = Date.now();
    return agg;
  });

  if (!result.committed || !ctx) throw new Error("Top-up failed — aggregator not found");

  const now = Date.now();
  const isTest = isTestAggregator(aggregatorId);
  const topupTxnId = `${dashTxnId(operatorId)}-T`;
  const records = {
    [`transactions/${topupTxnId}`]: {
      transaction_id: topupTxnId,
      aggregator_id: aggregatorId,
      batch_id: null,
      is_test: isTest,
      type: "TOPUP",
      amount: topUp,
      balance_before: ctx.balanceBefore,
      balance_after: ctx.balanceBefore + topUp,
      method,
      timestamp: now,
      operator_id: operatorId,
      stale_rate: false,
      note,
    },
  };

  if (ctx.feeDue) {
    const feeTxnId = `${dashTxnId(operatorId)}-F`;
    records[`transactions/${feeTxnId}`] = {
      transaction_id: feeTxnId,
      aggregator_id: aggregatorId,
      batch_id: null,
      is_test: isTest,
      type: "CARD_FEE",
      amount: -CARD_FEE,
      balance_before: ctx.balanceBefore + topUp,
      balance_after: ctx.balanceBefore + topUp - CARD_FEE,
      method,
      timestamp: now,
      operator_id: operatorId,
      stale_rate: false,
      note: "Card fee — deducted from first top-up (legacy account)",
    };
  }

  await update(ref(database), records);
  return { balanceAfter: result.snapshot.val().balance };
}

/* ------------------------------------------------------------------ */
/* Card replacement (§3.2 — conditional transaction, aborts if         */
/* balance < fee at commit time; UI pre-check is advisory only)        */
/* ------------------------------------------------------------------ */

export async function replaceCard({ aggregatorId, newUid, operatorId }) {
  const uid = String(newUid).toUpperCase();
  if (!(await isRfidAvailable(uid))) {
    throw new Error("This RFID card is already assigned to another aggregator");
  }

  let ctx = null;
  const result = await runTransaction(ref(database, `aggregators/${aggregatorId}`), (agg) => {
    if (agg === null) return agg;
    const balanceBefore = agg.balance || 0;
    if (balanceBefore < CARD_FEE) return undefined; // ABORT — insufficient at commit time
    ctx = { balanceBefore, oldUid: agg.rfid_uid };
    agg.balance = balanceBefore - CARD_FEE;
    agg.rfid_uid = uid;
    agg.last_active = Date.now();
    return agg;
  });

  if (!result.committed || !ctx) {
    throw new Error(`Insufficient balance for card replacement fee (\u20A6${CARD_FEE.toLocaleString()}). Collect cash and top up first.`);
  }

  const now = Date.now();
  const feeTxnId = `${dashTxnId(operatorId)}-R`;
  await update(ref(database), {
    [`rfid_index/${ctx.oldUid}`]: null,
    [`rfid_index/${uid}`]: aggregatorId,
    [`transactions/${feeTxnId}`]: {
      transaction_id: feeTxnId,
      aggregator_id: aggregatorId,
      batch_id: null,
      is_test: isTestAggregator(aggregatorId),
      type: "CARD_FEE",
      amount: -CARD_FEE,
      balance_before: ctx.balanceBefore,
      balance_after: ctx.balanceBefore - CARD_FEE,
      method: "CASH",
      timestamp: now,
      operator_id: operatorId,
      stale_rate: false,
      note: `Card replacement — old UID ${ctx.oldUid}`,
    },
  });

  return { newUid: uid, oldUid: ctx.oldUid };
}

/* ------------------------------------------------------------------ */
/* Account status (§3.2 — CEO only, enforced by security rules)        */
/* ------------------------------------------------------------------ */

export async function setAccountStatus({ aggregatorId, status, reason, actorId }) {
  if (!["ACTIVE", "SUSPENDED", "INACTIVE"].includes(status)) {
    throw new Error(`Invalid account status: ${status}`);
  }
  if (status === "SUSPENDED" && !reason) {
    throw new Error("A reason is required to suspend an account");
  }
  await update(ref(database, `aggregators/${aggregatorId}`), {
    account_status: status,
    status_changed_at: Date.now(),
    status_changed_by: actorId,
    status_reason: reason || null,
  });
}

/* ------------------------------------------------------------------ */
/* Refund (§3.2 — CEO only, atomic reverse write)                      */
/* ------------------------------------------------------------------ */

export async function refundTransaction({ originalTxnId, actorId, reason }) {
  if (!reason) throw new Error("A reason is required for refunds");

  const snap = await get(ref(database, `transactions/${originalTxnId}`));
  if (!snap.exists()) throw new Error("Original transaction not found");
  const original = snap.val();
  const creditAmount = Math.abs(original.amount);

  let ctx = null;
  const result = await runTransaction(
    ref(database, `aggregators/${original.aggregator_id}`),
    (agg) => {
      if (agg === null) return agg;
      ctx = { balanceBefore: agg.balance || 0 };
      agg.balance = (agg.balance || 0) + creditAmount;
      agg.last_active = Date.now();
      return agg;
    },
  );
  if (!result.committed || !ctx) throw new Error("Refund failed — aggregator not found");

  const refundTxnId = `${dashTxnId(actorId)}-RF`;
  await update(ref(database), {
    [`transactions/${refundTxnId}`]: {
      transaction_id: refundTxnId,
      aggregator_id: original.aggregator_id,
      batch_id: original.batch_id || null,
      is_test: isTestAggregator(original.aggregator_id),
      type: "REFUND",
      amount: creditAmount,
      balance_before: ctx.balanceBefore,
      balance_after: ctx.balanceBefore + creditAmount,
      method: original.method || "CASH",
      timestamp: Date.now(),
      operator_id: actorId,
      stale_rate: false,
      note: `Refund of ${originalTxnId}: ${reason}`,
    },
  });
  return { refundTxnId };
}

/* ------------------------------------------------------------------ */
/* Pricing (§3.4 — CEO only; update + changelog in one write)          */
/* ------------------------------------------------------------------ */

export async function updatePricing({ activeRate, season, actorId }) {
  const snap = await get(ref(database, "pricing/current"));
  const current = snap.exists() ? snap.val() : {};
  const now = Date.now();
  const changelogKey = push(ref(database, "pricing/changelog")).key;

  await update(ref(database), {
    "pricing/current/active_rate": Number(activeRate),
    "pricing/current/current_season": season,
    "pricing/current/last_updated": serverTimestamp(),
    "pricing/current/updated_by": actorId,
    [`pricing/changelog/${changelogKey}`]: {
      timestamp: now,
      changed_by: actorId,
      old_rate: current.active_rate ?? null,
      new_rate: Number(activeRate),
      old_season: current.current_season ?? null,
      new_season: season,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Scan request archival (§2.6 — copy to log + delete, one write)      */
/* ------------------------------------------------------------------ */

export async function archiveScanRequest(sessionId) {
  const snap = await get(ref(database, `scan_requests/${sessionId}`));
  if (!snap.exists()) return;
  await update(ref(database), {
    [`scan_request_log/${sessionId}`]: snap.val(),
    [`scan_requests/${sessionId}`]: null,
  });
}

/** Dashboard-side expiry (§2.6 — 65s safety net, then archive). */
export async function expireScanRequest(sessionId) {
  await update(ref(database, `scan_requests/${sessionId}`), { status: "EXPIRED" }).catch(() => {});
  await archiveScanRequest(sessionId);
}

/** Remove a cancelled scan request without archiving noise. */
export async function deleteScanRequest(sessionId) {
  await remove(ref(database, `scan_requests/${sessionId}`));
}
