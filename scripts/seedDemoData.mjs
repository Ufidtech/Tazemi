/**
 * seedDemoData.mjs — one-time loader: demo data → Firebase RTDB
 *
 * Pushes the bundled demo data (src/data/index.js) into the Realtime
 * Database so the dashboard reads from the DB like production. Every
 * seeded record carries `seeded: true` so it can be purged later with
 * `--purge` once real field data starts flowing — the demo source files
 * are never modified.
 *
 * Usage:
 *   1. Download a service-account key from Firebase Console
 *      (Project settings → Service accounts → Generate new private key)
 *   2. PowerShell:
 *        $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
 *        $env:FIREBASE_DATABASE_URL="https://<project>-default-rtdb.firebaseio.com"
 *        npm run seed            # write demo data to RTDB
 *        npm run seed:purge      # remove ONLY seeded records
 */

import { readFileSync } from "node:fs";
import admin from "firebase-admin";
import {
  aggregators,
  trucks,
  batches,
  trials,
  kpis,
  activity,
} from "../src/data/index.js";

const databaseURL = process.env.FIREBASE_DATABASE_URL;
const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!databaseURL || !credsPath) {
  console.error(
    "Set GOOGLE_APPLICATION_CREDENTIALS (service account JSON path) and FIREBASE_DATABASE_URL first.",
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(readFileSync(credsPath, "utf8"))),
  databaseURL,
});
const db = admin.database();

const SEED = { seeded: true };
const now = Date.now();

/* ------------------------------------------------------------------ */
/* Transformers — demo shape + PRD v2.1 fields merged, so both the     */
/* legacy pages and the new PRD modules read the same records.         */
/* ------------------------------------------------------------------ */

function toAggregatorRecord(a, index) {
  return {
    ...a,
    ...SEED,
    // PRD v2.1 schema (§2.1)
    aggregator_id: a.id,
    full_name: a.name,
    phone_number: a.contact.replace(/\s+/g, ""),
    market_location: a.location,
    balance: 25000 + index * 10000,
    account_status: a.status === "active" ? "ACTIVE" : "INACTIVE",
    card_fee_paid: true,
    total_batches: a.batches,
    total_crates_coated: a.crates,
    last_active: now,
    registered_at: new Date(a.joined).getTime(),
    registered_by: "seed-script",
  };
}

function toBatchRecord(b) {
  return {
    ...b,
    ...SEED,
    // PRD v2.1 schema (§2.2)
    batch_id: b.id,
    aggregator_name: b.aggregator,
    is_test: false,
    crate_count: b.crates,
    amount_charged: b.crates * 875,
    rate_per_crate: 875,
    season: "glut",
    stale_rate: false,
    payment_status: "PAID",
    batch_status: b.status === "delivered" ? "DISPATCHED" : "COMPLETE",
    created_at: new Date(b.date).getTime(),
    hub_id: "HUB-KN-01",
    operator_id: "seed-script",
  };
}

const formulas = [
  { formula_id: "BIO-001", name: "Bio-Shield BS-v1.0", date_created: "2026-03-15", notes: "Baseline formulation (10% AV, 1.0% starch)", active: false },
  { formula_id: "BIO-002", name: "Bio-Shield BS-v1.1", date_created: "2026-04-01", notes: "AV increased to 15%, starch 1.5%", active: false },
  { formula_id: "BIO-003", name: "Bio-Shield BS-v1.2", date_created: "2026-04-20", notes: "Target achieved — 17 days shelf life (20% AV, 2.0% starch)", active: true },
  { formula_id: "BIO-004", name: "Bio-Shield BS-v1.3", date_created: "2026-06-01", notes: "Increased starch (2.5%) for humid routes — trial ongoing", active: true },
];

function buildSeedPayload() {
  const updates = {};

  aggregators.forEach((a, i) => {
    updates[`aggregators/${a.id}`] = toAggregatorRecord(a, i);
    updates[`phone_index/${a.contact.replace(/\s+/g, "")}`] = a.id;
  });
  batches.forEach((b) => (updates[`batches/${b.id}`] = toBatchRecord(b)));
  trucks.forEach((t) => (updates[`trucks/${t.id}`] = { ...t, ...SEED }));
  trials.forEach((t) => (updates[`trials/${t.id}`] = { ...t, ...SEED }));
  activity.forEach((a) => (updates[`activity/${a.id}`] = { ...a, ...SEED }));
  formulas.forEach((f, i) => {
    updates[`formulas/${f.formula_id}`] = { ...f, ...SEED, created_by: "seed-script" };
    updates["counters/formulas"] = formulas.length;
    void i;
  });

  // Dashboard KPI snapshot (read by fetchDashboardSummary)
  updates["dashboard/kpis"] = { ...kpis, ...SEED };
  updates["dashboard/generated_at"] = now;

  // Pricing (§2.4) — glut season active per demo batch rates
  updates["pricing/current"] = {
    ...SEED,
    current_season: "glut",
    scarcity_rate: 1500,
    glut_rate: 875,
    active_rate: 875,
    crate_deposit: 500,
    card_fee: 1000,
    last_updated: now,
    updated_by: "seed-script",
  };

  // Device heartbeats (§2.7) — fresh timestamps so devices show Online
  for (const deviceId of ["TAPU-KN-01", "QC-KN-01"]) {
    updates[`devices/${deviceId}/heartbeat`] = {
      ...SEED,
      battery_pct: 82,
      wifi_connected: true,
      queued_tx_count: 0,
      fw_version: "3.0",
      timestamp: now,
    };
  }

  return updates;
}

/* ------------------------------------------------------------------ */
/* Purge — removes ONLY records flagged seeded: true                    */
/* ------------------------------------------------------------------ */

const PURGE_PATHS = [
  "aggregators", "batches", "trucks", "trials", "activity", "formulas",
];

async function purgeSeeded() {
  const updates = {};
  for (const path of PURGE_PATHS) {
    const snap = await db.ref(path).get();
    if (!snap.exists()) continue;
    snap.forEach((child) => {
      if (child.child("seeded").val() === true) updates[`${path}/${child.key}`] = null;
    });
  }
  // Seeded phone-index entries
  const phoneSnap = await db.ref("phone_index").get();
  if (phoneSnap.exists()) {
    const seededAggIds = new Set(aggregators.map((a) => a.id));
    phoneSnap.forEach((child) => {
      if (seededAggIds.has(child.val())) updates[`phone_index/${child.key}`] = null;
    });
  }
  // Snapshot nodes
  const kpisSnap = await db.ref("dashboard/kpis/seeded").get();
  if (kpisSnap.val() === true) updates["dashboard"] = null;

  if (!Object.keys(updates).length) {
    console.log("Nothing to purge — no seeded records found.");
    return;
  }
  await db.ref().update(updates);
  console.log(`Purged ${Object.keys(updates).length} seeded records.`);
}

/* ------------------------------------------------------------------ */

const purgeMode = process.argv.includes("--purge");

try {
  if (purgeMode) {
    await purgeSeeded();
  } else {
    const payload = buildSeedPayload();
    await db.ref().update(payload);
    console.log(`Seeded ${Object.keys(payload).length} paths into ${databaseURL}`);
    console.log("Aggregators:", aggregators.length, "| Batches:", batches.length,
      "| Trucks:", trucks.length, "| Trials:", trials.length,
      "| Formulas:", formulas.length, "| Activity:", activity.length);
  }
  process.exit(0);
} catch (err) {
  console.error("Seed failed:", err.message);
  process.exit(1);
}
