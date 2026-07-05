/**
 * Tazemi Operations Dashboard — Cloud Functions (PRD v2.1)
 *
 * Implements the server-side resolutions:
 * - registerAggregator  callable — NIN/BVN encryption (§6.2), race-safe ID
 *   allocation, atomic multi-path registration write (§3.1)
 * - decryptIdentity     callable — CEO-only, audit-logged (§6.2)
 * - setUserRole         callable — CEO-only custom-claims provisioning (§1.2)
 * - registerDevice      callable — CEO-only device secret provisioning (§6.1)
 * - mintDeviceToken     HTTPS   — per-device secret → custom token (§6.1)
 * - sweepScanRequests   schedule — hourly expiry + archival (§2.6)
 * - Stats triggers      RTDB    — maintained aggregates in /stats (§2.9)
 *
 * Secrets (set with `firebase functions:secrets:set`):
 * - NIN_ENC_KEY: 64 hex chars (32-byte AES-256-GCM key)
 */

const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onValueCreated, onValueWritten } = require("firebase-functions/v2/database");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("node:crypto");

admin.initializeApp();

const NIN_ENC_KEY = defineSecret("NIN_ENC_KEY");

const CARD_FEE = 1000;
const MIN_INITIAL_TOPUP = 5000;
const STAFF_ROLES = ["CEO", "FIELD_OPERATOR"];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function requireRole(request, roles) {
  const role = request.auth?.token?.role;
  if (!request.auth || !roles.includes(role)) {
    throw new HttpsError("permission-denied", `Requires role: ${roles.join(" or ")}`);
  }
  return { uid: request.auth.uid, role };
}

function normalizePhone(phone) {
  const digits = String(phone).replace(/[^\d+]/g, "");
  if (digits.startsWith("+234")) return digits;
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  return `+234${digits}`;
}

function maskIdentity(value) {
  const s = String(value);
  return `${"*".repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}

/** AES-256-GCM encrypt — returns iv:tag:ciphertext (hex) (§6.2). */
function encryptIdentity(plaintext, hexKey) {
  const key = Buffer.from(hexKey, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${enc.toString("hex")}`;
}

function decryptIdentityValue(payload, hexKey) {
  const [ivHex, tagHex, dataHex] = String(payload).split(":");
  const key = Buffer.from(hexKey, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

/** WAT (UTC+1) day key: YYYY-MM-DD. */
function watDayKey(ms = Date.now()) {
  return new Date(ms + 3600_000).toISOString().slice(0, 10);
}

/** WAT month key: YYYY-MM. */
function watMonthKey(ms = Date.now()) {
  return watDayKey(ms).slice(0, 7);
}

const db = () => admin.database();
const fs = () => admin.firestore();

async function increment(path, delta) {
  await db().ref(path).transaction((n) => (n || 0) + delta);
}

/* ------------------------------------------------------------------ */
/* registerAggregator (§3.1, §6.2)                                     */
/* ------------------------------------------------------------------ */

exports.registerAggregator = onCall({ secrets: [NIN_ENC_KEY] }, async (request) => {
  const { uid: operatorId } = requireRole(request, STAFF_ROLES);
  const {
    fullName,
    phoneNumber,
    marketLocation,
    ninOrBvn,
    photoUrl = "",
    rfidUid,
    initialTopUp,
    isTest = false,
  } = request.data || {};

  // Validation (§3.1)
  if (!fullName || String(fullName).trim().length < 3) {
    throw new HttpsError("invalid-argument", "Full name must be at least 3 characters");
  }
  if (!/^\d{11}$/.test(String(ninOrBvn))) {
    throw new HttpsError("invalid-argument", "NIN or BVN must be 11 digits");
  }
  const cardUid = String(rfidUid || "").toUpperCase();
  if (!/^[0-9A-F]{8}$/.test(cardUid)) {
    throw new HttpsError("invalid-argument", "RFID UID must be an 8-character hex string");
  }
  const amount = Number(initialTopUp);
  if (!(amount >= MIN_INITIAL_TOPUP)) {
    throw new HttpsError("invalid-argument", `Initial top-up must be at least \u20A6${MIN_INITIAL_TOPUP}`);
  }
  if (!marketLocation) {
    throw new HttpsError("invalid-argument", "Market location is required");
  }

  const phone = normalizePhone(phoneNumber);

  // Uniqueness (§2.8) — advisory read; the multi-path write below is the
  // final authority because index keys are claimed in the same update.
  const [phoneSnap, rfidSnap] = await Promise.all([
    db().ref(`phone_index/${phone}`).get(),
    db().ref(`rfid_index/${cardUid}`).get(),
  ]);
  if (phoneSnap.exists()) {
    throw new HttpsError("already-exists", "An aggregator with this phone number already exists");
  }
  if (rfidSnap.exists()) {
    throw new HttpsError("already-exists", "This RFID card is already assigned");
  }

  // Race-safe ID allocation (§2.1)
  const counterPath = isTest ? "counters/aggregators_test" : "counters/aggregators";
  const counterResult = await db().ref(counterPath).transaction((n) => (n || 0) + 1);
  if (!counterResult.committed) {
    throw new HttpsError("aborted", "Could not allocate aggregator ID");
  }
  const seq = String(counterResult.snapshot.val()).padStart(3, "0");
  const aggregatorId = isTest ? `AGG-T${seq}` : `AGG-${seq}`;

  // Encrypt identity → Firestore only (§6.2)
  const ciphertext = encryptIdentity(ninOrBvn, NIN_ENC_KEY.value());
  await fs().doc(`identity/${aggregatorId}`).set({
    ciphertext,
    algorithm: "aes-256-gcm",
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    created_by: operatorId,
  });

  const now = Date.now();
  const balance = amount - CARD_FEE;
  const topupTxnId = `TXN-FN-${aggregatorId}-${now}-T`;
  const feeTxnId = `TXN-FN-${aggregatorId}-${now}-F`;

  // One atomic multi-path write (§3.1)
  await db().ref().update({
    [`aggregators/${aggregatorId}`]: {
      aggregator_id: aggregatorId,
      full_name: String(fullName).trim(),
      phone_number: phone,
      market_location: marketLocation,
      nin_or_bvn_masked: maskIdentity(ninOrBvn),
      photo_url: photoUrl,
      rfid_uid: cardUid,
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
    [`rfid_index/${cardUid}`]: aggregatorId,
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
  });

  return { aggregator_id: aggregatorId, balance, rfid_uid: cardUid, registered_at: now };
});

/* ------------------------------------------------------------------ */
/* decryptIdentity — CEO only, audit-logged (§6.2)                     */
/* ------------------------------------------------------------------ */

exports.decryptIdentity = onCall({ secrets: [NIN_ENC_KEY] }, async (request) => {
  const { uid } = requireRole(request, ["CEO"]);
  const { aggregatorId } = request.data || {};
  if (!aggregatorId) throw new HttpsError("invalid-argument", "aggregatorId is required");

  const doc = await fs().doc(`identity/${aggregatorId}`).get();
  if (!doc.exists) throw new HttpsError("not-found", "No identity record for this aggregator");

  await fs().collection("audit_logs").add({
    action: "DECRYPT_IDENTITY",
    aggregator_id: aggregatorId,
    actor: uid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ninOrBvn: decryptIdentityValue(doc.data().ciphertext, NIN_ENC_KEY.value()) };
});

/* ------------------------------------------------------------------ */
/* setUserRole — CEO-only custom-claims provisioning (§1.2)            */
/* ------------------------------------------------------------------ */

exports.setUserRole = onCall(async (request) => {
  const { uid: actor } = requireRole(request, ["CEO"]);
  const { targetUid, role } = request.data || {};
  if (!targetUid || !["CEO", "FIELD_OPERATOR", "RND"].includes(role)) {
    throw new HttpsError("invalid-argument", "targetUid and a valid role (CEO | FIELD_OPERATOR | RND) are required");
  }
  await admin.auth().setCustomUserClaims(targetUid, { role });
  await fs().doc(`users/${targetUid}`).set(
    { role, role_set_by: actor, role_set_at: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true },
  );
  return { ok: true };
});

/* ------------------------------------------------------------------ */
/* Device identity (§6.1)                                              */
/* ------------------------------------------------------------------ */

/** CEO-only: register a device and provision its secret (hash-only storage). */
exports.registerDevice = onCall(async (request) => {
  const { uid: actor } = requireRole(request, ["CEO"]);
  const { deviceId, type, hubId } = request.data || {};
  if (!deviceId || !/^[A-Z0-9-]{4,32}$/.test(deviceId)) {
    throw new HttpsError("invalid-argument", "deviceId must be 4-32 chars of A-Z, 0-9, hyphen");
  }
  const secret = crypto.randomBytes(32).toString("hex");
  await fs().doc(`device_secrets/${deviceId}`).set({
    hash: crypto.createHash("sha256").update(secret).digest("hex"),
    type: type || "TAPU",
    hub_id: hubId || null,
    revoked: false,
    created_by: actor,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });
  // Plaintext returned ONCE for flashing; never stored (§6.1).
  return { deviceId, secret };
});

/** Device secret → Firebase custom token with role "device" (§6.1). */
exports.mintDeviceToken = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const { device_id: deviceId, secret } = req.body || {};
  if (!deviceId || !secret) {
    res.status(400).json({ error: "device_id and secret are required" });
    return;
  }

  const doc = await fs().doc(`device_secrets/${deviceId}`).get();
  const record = doc.exists ? doc.data() : null;
  const hash = crypto.createHash("sha256").update(String(secret)).digest("hex");
  const valid =
    record &&
    !record.revoked &&
    crypto.timingSafeEqual(Buffer.from(record.hash, "hex"), Buffer.from(hash, "hex"));

  if (!valid) {
    res.status(401).json({ error: "Invalid device credentials" });
    return;
  }

  // uid = device_id so rules can enforce auth.uid === $device_id.
  // Custom tokens expire after 1h → revocation effective ≤1h (§6.1).
  const token = await admin.auth().createCustomToken(deviceId, { role: "device" });
  res.json({ token, expires_in: 3600 });
});

/* ------------------------------------------------------------------ */
/* sweepScanRequests — hourly expiry + archival (§2.6)                 */
/* ------------------------------------------------------------------ */

exports.sweepScanRequests = onSchedule("every 60 minutes", async () => {
  const cutoff = Date.now() - 3600_000;
  const snap = await db().ref("scan_requests").get();
  if (!snap.exists()) return;

  const updates = {};
  snap.forEach((child) => {
    const r = child.val();
    if (r.status !== "COMPLETE" && (r.created_at || 0) < cutoff) {
      updates[`scan_request_log/${child.key}`] = { ...r, status: "EXPIRED", swept_at: Date.now() };
      updates[`scan_requests/${child.key}`] = null;
    }
  });
  if (Object.keys(updates).length) await db().ref().update(updates);
});

/* ------------------------------------------------------------------ */
/* Stats triggers — maintained aggregates (§2.9)                       */
/* NOTE: RTDB triggers are at-least-once; counter transactions keep    */
/* increments consistent, and /stats is advisory (not financial truth).*/
/* ------------------------------------------------------------------ */

/** Batch created → daily revenue / batch / crate counts + top aggregators. */
exports.onBatchCreated = onValueCreated("/batches/{batchId}", async (event) => {
  const batch = event.data.val();
  if (!batch || batch.is_test) return;

  const day = watDayKey(batch.created_at || Date.now());
  const month = watMonthKey(batch.created_at || Date.now());
  const revenue = Number(batch.amount_charged) || 0;
  const crates = Number(batch.crate_count) || 0;

  await Promise.all([
    increment(`stats/daily/${day}/revenue`, revenue),
    increment(`stats/daily/${day}/batch_count`, 1),
    increment(`stats/daily/${day}/crate_count`, crates),
    increment("stats/totals/revenue", revenue),
    increment("stats/totals/batch_count", 1),
    increment("stats/totals/crate_count", crates),
    increment(`stats/top_aggregators/${month}/${batch.aggregator_id}`, revenue),
  ]);
});

/** QC analysis written → running sums for VOC / coating-mass averages. */
exports.onBatchAnalysis = onValueWritten("/batches/{batchId}/analysis", async (event) => {
  if (event.data.before.exists() || !event.data.after.exists()) return; // first write only
  const batchSnap = await db().ref(`batches/${event.params.batchId}`).get();
  if (batchSnap.child("is_test").val()) return;
  const analysis = event.data.after.val();

  const tasks = [];
  if (typeof analysis.voc_reduction_pct === "number") {
    tasks.push(increment("stats/qc/voc_sum", analysis.voc_reduction_pct));
    tasks.push(increment("stats/qc/voc_count", 1));
  }
  if (typeof analysis.coating_mass_g_per_kg === "number") {
    tasks.push(increment("stats/qc/mass_sum", analysis.coating_mass_g_per_kg));
    tasks.push(increment("stats/qc/mass_count", 1));
  }
  await Promise.all(tasks);
});

/** Transaction created → daily stale-rate count (§3.5). */
exports.onTransactionCreated = onValueCreated("/transactions/{txnId}", async (event) => {
  const txn = event.data.val();
  if (!txn || txn.is_test || !txn.stale_rate) return;
  await increment(`stats/daily/${watDayKey(txn.timestamp || Date.now())}/stale_rate_count`, 1);
});

/** Account status changes → active aggregator counter (§3.5). */
exports.onAccountStatusChange = onValueWritten("/aggregators/{aggId}/account_status", async (event) => {
  if (String(event.params.aggId).startsWith("AGG-T")) return;
  const before = event.data.before.val();
  const after = event.data.after.val();
  if (before === after) return;
  let delta = 0;
  if (after === "ACTIVE" && before !== "ACTIVE") delta = 1;
  if (before === "ACTIVE" && after !== "ACTIVE") delta = -1;
  if (delta) await increment("stats/totals/active_aggregators", delta);
});
